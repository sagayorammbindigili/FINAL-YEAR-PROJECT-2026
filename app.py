"""
Flask backend for Job Ad Credibility Checker
- CORS enabled for frontend integration
- Models loaded once at startup (fast inference)
- Image OCR support via pytesseract
- Returns response matching frontend PredictionResult shape
"""
from rule_explainer import generate_explanation
import pandas as pd
import numpy as np
import joblib
import torch
from transformers import AutoTokenizer, AutoModel
import re
import io
import time
import logging
from tqdm import tqdm
import lime
import lime.lime_text
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import warnings
warnings.filterwarnings('ignore')

os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# --- Global Variables --- #
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, 'mbert')

tokenizer = None
bert_model = None
log_reg_model = None
scaler = None
median_salary = None
_resources_loaded = False

# --- Device --- #
DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
logger.info(f"Using device: {DEVICE}")


def load_resources():
    global tokenizer, bert_model, log_reg_model, scaler, median_salary, _resources_loaded

    if _resources_loaded:
        return

    start = time.time()
    logger.info("Loading mBERT tokenizer and model...")
    if not os.path.exists(MODEL_DIR):
        raise FileNotFoundError(f"Local mBERT model folder not found at {MODEL_DIR}")

    tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR, local_files_only=True)
    bert_model = AutoModel.from_pretrained(MODEL_DIR, local_files_only=True)
    bert_model.eval()
    bert_model.to(DEVICE)

    logger.info(f"mBERT loaded in {time.time() - start:.1f}s")

    model_path = 'logistic_regression_model.pkl'
    if os.path.exists(model_path):
        log_reg_model = joblib.load(model_path)
        print("Model classes:", log_reg_model.classes_)
        logger.info(f"Logistic Regression loaded from {model_path}")
    else:
        raise FileNotFoundError(f"Model file not found at {model_path}")

    scaler_path = 'scaler.pkl'
    if os.path.exists(scaler_path):
        scaler = joblib.load(scaler_path)
        logger.info(f"Scaler loaded from {scaler_path}")
    else:
        raise FileNotFoundError(f"Scaler file not found at {scaler_path}")

    processed_df_path = 'processed_features_and_target.csv'
    if os.path.exists(processed_df_path):
        temp_df = pd.read_csv(processed_df_path)
        median_salary = temp_df['salary_numeric'].median()
        logger.info(f"Median salary: {median_salary}")
    else:
        median_salary = 1500000.0
        logger.warning("processed_features_and_target.csv not found. Using default median_salary 1.5M")

    _resources_loaded = True
    logger.info(f"All resources loaded in {time.time() - start:.1f}s")


# --- Helper Functions --- #

def clean_salary(salary):
    if pd.isna(salary):
        return np.nan
    salary = str(salary).lower()
    salary = salary.replace('tzs', '').replace(',', '').replace(' ', '')
    salary = re.sub(r'(\d+)m', r'\1000000', salary)
    salary = re.sub(r'(\d+)k', r'\1000', salary)
    numbers = re.findall(r'\d+', salary)
    if len(numbers) == 0:
        return np.nan
    numbers = [int(n) for n in numbers]
    if 'below' in salary or 'less than' in salary or 'chini ya' in salary:
        return int(numbers[0]) / 2 if numbers else np.nan
    if 'above' in salary or 'more than' in salary or 'zaidi ya' in salary:
        return int(numbers[0]) if numbers else np.nan
    if len(numbers) >= 2:
        return sum(numbers) / len(numbers)
    return numbers[0]


def salary_status(salary):
    if pd.isna(salary):
        return 'missing'
    salary = str(salary).lower()
    if 'competitive' in salary or 'kulingana na uzoefu' in salary:
        return 'competitive'
    if 'majadiliano' in salary or 'negotiable' in salary:
        return 'negotiable'
    if 'not specified' in salary or '0' == salary.strip():
        return 'not specified'
    return 'specified'


def preprocess_text_for_bert(text):
    if not isinstance(text, str):
        return ""
    text = text.lower()
    text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)
    text = re.sub(r'<.*?>', '', text)
    text = re.sub(r'\S*@\S*\s?', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def get_bert_embeddings(text_list, max_length=128, batch_size=32):
    embeddings = []
    for i in range(0, len(text_list), batch_size):
        batch_texts = text_list[i:i + batch_size]
        encoded_input = tokenizer(
            batch_texts, padding=True, truncation=True,
            max_length=max_length, return_tensors='pt'
        )
        encoded_input = {key: val.to(DEVICE) for key, val in encoded_input.items()}
        with torch.no_grad():
            model_output = bert_model(**encoded_input)
        batch_embeddings = model_output.last_hidden_state[:, 0, :].cpu().numpy()
        embeddings.extend(batch_embeddings)
    return np.array(embeddings)



def get_numerical_features_for_single_input(raw_salary_str):
    temp_df = pd.DataFrame({'salary_tzs': [raw_salary_str], 'salary_original': [raw_salary_str]})
    temp_df['salary_numeric'] = temp_df['salary_tzs'].apply(clean_salary)
    temp_df['salary_status'] = temp_df['salary_tzs'].apply(salary_status)
    temp_df['salary_numeric'] = temp_df['salary_numeric'].fillna(median_salary)
    mask = temp_df['salary_status'].isin(['not specified', 'negotiable', 'commission based', 'competitive'])
    temp_df.loc[mask, 'salary_numeric'] = 0.0
    temp_df['has_numeric_salary'] = temp_df.apply(
        lambda row: 1 if (row['salary_status'] == 'specified' and row['salary_numeric'] > 0) else 0, axis=1
    )
    salary_numeric_scaled = scaler.transform(
        np.log1p(np.maximum(0, temp_df['salary_numeric'].values.reshape(-1, 1)))
    )[0][0]
    has_numeric_salary = temp_df['has_numeric_salary'].values[0]
    return salary_numeric_scaled, has_numeric_salary, temp_df['salary_status'].values[0]


def build_fast_explanation(text, predicted_class):
    text_lower = (text or '').lower()
    explanation = []

    fake_indicators = [
        (['fee', 'payment', 'pay', 'deposit', 'registration', 'malipo', 'lipa', 'ada', 'tuma fedha'], 'payment', 'payment'),
        (['whatsapp', 'gmail', 'yahoo', 'hotmail', 'simu', 'whatsapp'], 'contact', 'contact'),
        (['deadline', 'closing date', 'apply before', 'tarehe ya mwisho', 'mwisho wa kutuma'], 'deadline', 'deadline'),
        (['degree', 'diploma', 'bachelor', 'experience', 'skills', 'shahada', 'sifa', 'uzoefu'], 'qualification', 'qualification'),
        (['responsibilities', 'duties', 'role', 'tasks', 'majukumu', 'wajibu', 'kazi'], 'responsibility', 'responsibility'),
    ]

    if 'fake' in predicted_class.lower() or 'feki' in predicted_class.lower():
        for keywords, key, _ in fake_indicators:
            hits = [kw for kw in keywords if kw in text_lower]
            if hits:
                explanation.append({
                    'word': hits[0],
                    'weight': '0.25'
                })
        if not explanation:
            explanation.append({'word': 'No strong fraud indicators found', 'weight': '0.00'})
    else:
        if any(k in text_lower for k in ['company', 'organization', 'kampuni', 'mwajiri', 'inc', 'ltd']):
            explanation.append({'word': 'Company details provided', 'weight': '-0.20'})
        if any(k in text_lower for k in ['responsibilities', 'duties', 'majukumu', 'wajibu']):
            explanation.append({'word': 'Responsibilities explained', 'weight': '-0.15'})
        if any(k in text_lower for k in ['degree', 'diploma', 'experience', 'skills', 'shahada', 'sifa', 'uzoefu']):
            explanation.append({'word': 'Qualifications mentioned', 'weight': '-0.10'})
        if not explanation:
            explanation.append({'word': 'General job details found', 'weight': '-0.05'})

    return explanation


def resolve_predicted_class(prediction_proba, class_names):
    predicted_idx = int(np.argmax(prediction_proba))
    model_classes = getattr(log_reg_model, 'classes_', None)

    if model_classes is not None and len(model_classes) > 0:
        model_label = model_classes[predicted_idx]

        if isinstance(model_label, (int, np.integer)):
            return class_names[1] if int(model_label) == 1 else class_names[0]

        predicted_label = str(model_label).strip().lower()
        if any(token in predicted_label for token in ['fake', 'feki', 'fraud', 'scam', 'spam', '1']):
            return class_names[1] if len(class_names) > 1 else class_names[0]
        if any(token in predicted_label for token in ['real', 'legit', 'legitimate', 'halisi', 'genuine', 'valid', '0']):
            return class_names[0]

    return class_names[predicted_idx] if predicted_idx < len(class_names) else class_names[0]


def looks_like_job_posting(text):
    if not isinstance(text, str):
        return False

    cleaned = preprocess_text_for_bert(text)
    if not cleaned:
        return False

    job_keywords = [
        'job', 'jobs', 'hiring', 'vacancy', 'vacancies', 'position', 'positions', 'role', 'roles',
        'apply', 'applicant', 'candidate', 'recruitment', 'recruit', 'company', 'employer', 'salary',
        'mshahara', 'tzs', 'qualification', 'experience', 'responsibilities', 'duties', 'deadline',
        'interview', 'cv', 'resume', 'office', 'manager', 'assistant', 'teacher', 'driver', 'nurse',
        'engineer', 'developer', 'accountant', 'cashier', 'receptionist', 'sales', 'marketing',
        'customer care', 'data', 'analyst', 'warehouse', 'security', 'health', 'care', 'laborer',
        'work', 'needed', 'required', 'urgent', 'opportunity', 'employment', 'employee'
    ]

    score = 0
    for keyword in job_keywords:
        if keyword in cleaned:
            score += 1

    if len(cleaned.split()) >= 6:
        score += 1

    return score >= 1


def explain_job_posting(raw_text_input, raw_salary_str, output_lang='en', class_names=None):
    if class_names is None:
        class_names = ['Real Job', 'Fake Job']

    if not isinstance(raw_text_input, str) or not raw_text_input.strip():
        not_job = 'Siyo Tangazo la Kazi' if output_lang == 'sw' else 'Not a Job Posting'
        msg = ('Maandishi hayapo.' if output_lang == 'sw' else 'No text provided.')
        return not_job, 0.0, msg, 0.0, 0, 'N/A'

    if not looks_like_job_posting(raw_text_input):
        not_job = 'Siyo Tangazo la Kazi' if output_lang == 'sw' else 'Not a Job Posting'
        msg = ('Maandishi haya hayahusiani na tangazo la kazi. Tafadhali weka tangazo la kazi au maelezo yanayohusiana na kazi.'
               if output_lang == 'sw' else
               'This text does not appear to be a job advertisement. Please provide a job posting or related job information.')
        return not_job, 0.0, msg, 0.0, 0, 'N/A'

    salary_numeric_scaled, has_numeric_salary, salary_status_val = \
        get_numerical_features_for_single_input(raw_salary_str)

    cleaned_original = preprocess_text_for_bert(raw_text_input)
    original_emb = get_bert_embeddings([cleaned_original], batch_size=1)[0]
    original_combined = np.hstack((
        original_emb, [salary_numeric_scaled, has_numeric_salary]
    )).reshape(1, -1)

    prediction_proba = log_reg_model.predict_proba(original_combined)
    predicted_class = resolve_predicted_class(prediction_proba, class_names)
    predicted_idx = int(np.argmax(prediction_proba))
    confidence = prediction_proba[0][predicted_idx]

    explanation = build_fast_explanation(cleaned_original, predicted_class)
    return predicted_class, confidence, explanation, salary_numeric_scaled, has_numeric_salary, salary_status_val


# --- OCR for Image Upload --- #

def extract_text_from_image(image_bytes):
    try:
        from PIL import Image
        import pytesseract
        import io

        pytesseract.pytesseract.tesseract_cmd = r"D:\Program Files\tesseract.exe"

        print("Executable:", pytesseract.pytesseract.tesseract_cmd)
        print("Version:", pytesseract.get_tesseract_version())

        img = Image.open(io.BytesIO(image_bytes))
        text = pytesseract.image_to_string(img, lang="eng+swa")
        return text.strip()

    except Exception as e:
        import traceback
        traceback.print_exc()
        logger.exception("OCR failed")
        return ""

# --- Health Check --- #

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ok",
        "models_loaded": _resources_loaded,
        "device": str(DEVICE)
    })


# --- Predict Route --- #

@app.route('/predict', methods=['POST'])
def predict():
    start_time = time.time()

    # Parse input from JSON or multipart/form-data
    if request.is_json:
        data = request.get_json()
        job_text = data.get('job_text', '')
        salary_str = data.get('salary_str', '')
        output_lang = data.get('output_lang', 'en')
        optional_info = data.get('optional_info', '')
    else:
        job_text = request.form.get('job_text', '')
        salary_str = request.form.get('salary_str', '')
        output_lang = request.form.get('output_lang', 'en')
        optional_info = request.form.get('optional_info', '')

    if 'image' in request.files:
        image_file = request.files['image']
        if image_file.filename:
            image_bytes = image_file.read()
            ocr_text = extract_text_from_image(image_bytes)
            text_parts = []
            if ocr_text and ocr_text.strip():
                text_parts.append(ocr_text.strip())
                logger.info(f"OCR extracted {len(ocr_text)} chars from image")
            if optional_info and optional_info.strip():
                text_parts.append(optional_info.strip())

            if text_parts:
                job_text = '\n\n'.join(text_parts)
            else:
                return jsonify({
                    "success": False,
                    "error": "Could not extract text from image",
                    "message": "Could not read text from the uploaded image or optional information. Please paste the text manually."
                }), 400
    elif optional_info and optional_info.strip():
        if job_text and job_text.strip():
            job_text = f"{job_text.strip()}\n\n{optional_info.strip()}"
        else:
            job_text = optional_info.strip()

    if not job_text or not job_text.strip():
        return jsonify({
            "success": False,
            "error": "No text provided",
            "message": "Please provide job advertisement text or upload an image."
        }), 400

    messages = {
        'en': {'real_job': 'Real Job', 'fake_job': 'Fake Job'},
        'sw': {'real_job': 'Kazi Halisi', 'fake_job': 'Kazi Feki'}
    }
    class_names = [messages.get(output_lang, messages['en']).get('real_job', 'Real Job'),
                   messages.get(output_lang, messages['en']).get('fake_job', 'Fake Job')]

    try:
        if not _resources_loaded:
            load_resources()

        predicted_class, confidence, explanation, _, _, _ = explain_job_posting(
            job_text, salary_str, output_lang=output_lang, class_names=class_names
        )
        is_not_job = isinstance(predicted_class, str) and (
            predicted_class.lower().startswith('not a job') or
            predicted_class.lower().startswith('siyo') or
            'not a job' in predicted_class.lower()
        )
        rule_reasons = [] if is_not_job else generate_explanation(job_text, predicted_class, output_lang)

        explanation_list = []

        if explanation and not isinstance(explanation, str):
            if hasattr(explanation, 'available_labels'):
                available_labels = explanation.available_labels()
                if len(available_labels) > 0:
                    label = available_labels[0]
                    for word, weight in explanation.as_list(label=label):
                        explanation_list.append({
                            "word": word,
                            "weight": f"{weight:.4f}"
                        })
                else:
                    explanation_list.append({
                        "word": "No explanation available",
                        "weight": "N/A"
                    })
            elif isinstance(explanation, list):
                for item in explanation:
                    if isinstance(item, dict):
                        explanation_list.append({
                            "word": item.get('word', ''),
                            "weight": item.get('weight', 'N/A')
                        })
            else:
                explanation_list.append({
                    "word": str(explanation),
                    "weight": "N/A"
                })
        elif isinstance(explanation, str):
            explanation_list.append({
                "word": explanation,
                "weight": "N/A"
            })

        elapsed = time.time() - start_time
        logger.info(f"Prediction completed in {elapsed:.2f}s - {predicted_class} ({confidence:.4f})")

        return jsonify({
            "predicted_class": predicted_class,
            "confidence": f"{confidence:.4f}",
            "explanation": explanation_list,
            "rule_explanation": rule_reasons,  # HUMAN READABLE AI
            "raw_text": job_text,
            "processing_time_s": round(elapsed, 2),
            "success": True
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        err_msg = 'Error during prediction' if output_lang == 'en' else 'Kosa wakati wa utabiri'
        return jsonify({
            "error": str(e),
            "message": err_msg,
            "success": False
        }), 500


load_resources()

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=5000, threaded=True)

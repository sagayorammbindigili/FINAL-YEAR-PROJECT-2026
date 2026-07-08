"""
Flask backend for Job Ad Credibility Checker
- CORS enabled for frontend integration
- Models loaded once at startup (fast inference)
- Image OCR support via pytesseract
- Returns response matching frontend PredictionResult shape
"""

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

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# --- Global Variables --- #
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
    # bert-base-multilingual-cased

    tokenizer = AutoTokenizer.from_pretrained('mbert')
    bert_model = AutoModel.from_pretrained('mbert')
    bert_model.eval()
    bert_model.to(DEVICE)

    logger.info(f"mBERT loaded in {time.time() - start:.1f}s")

    model_path = 'logistic_regression_model.pkl'
    if os.path.exists(model_path):
        log_reg_model = joblib.load(model_path)
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


def explain_job_posting(raw_text_input, raw_salary_str, output_lang='en', class_names=None):
    if class_names is None:
        class_names = ['Real Job', 'Fake Job']

    min_text_length = 50
    if not isinstance(raw_text_input, str) or len(raw_text_input.strip()) < min_text_length:
        not_job = 'Siyo Tangazo la Kazi' if output_lang == 'sw' else 'Not a Job Posting'
        msg = ('Maandishi ni mafupi sana kiasi cha kutoonekana kama tangazo la kazi.'
               if output_lang == 'sw' else
               'Text too short to appear as a job posting.')
        return not_job, 0.0, msg, 0.0, 0, 'N/A'

    text_lower = raw_text_input.lower()
    job_keywords = [
        "job title", "cheo cha kazi", "job description", "maelezo ya kazi",
        "job requirement", "mahitaji ya kazi", "employment type", "aina ya ajira",
        "company profile", "wasifu wa kampuni", "location", "eneo",
        "salary", "mshahara", "developer", "engineer", "manager", "sales",
        "marketing", "nafasi ya kazi", "muajiri", "utaratibu", "mkataba"
    ]
    keyword_count = sum(1 for kw in job_keywords if kw in text_lower)
    if keyword_count < 2:
        not_job = 'Siyo Tangazo la Kazi' if output_lang == 'sw' else 'Not a Job Posting'
        msg = ('Maandishi hayana maneno muhimu ya kutosha kuonyesha ni tangazo la kazi.'
               if output_lang == 'sw' else
               'Text lacks enough job-related keywords to be a job posting.')
        return not_job, 0.0, msg, 0.0, 0, 'N/A'

    salary_numeric_scaled, has_numeric_salary, salary_status_val = \
        get_numerical_features_for_single_input(raw_salary_str)

    def lime_predictor(texts_list):
        cleaned = [preprocess_text_for_bert(t) for t in texts_list]
        text_emb = get_bert_embeddings(cleaned)
        num_feats = np.array([[salary_numeric_scaled, has_numeric_salary]] * text_emb.shape[0])
        combined = np.hstack((text_emb, num_feats))
        return log_reg_model.predict_proba(combined)

    cleaned_original = preprocess_text_for_bert(raw_text_input)
    original_emb = get_bert_embeddings([cleaned_original], batch_size=1)[0]
    original_combined = np.hstack((
        original_emb, [salary_numeric_scaled, has_numeric_salary]
    )).reshape(1, -1)

    prediction_proba = log_reg_model.predict_proba(original_combined)
    predicted_idx = np.argmax(prediction_proba)
    predicted_class = class_names[predicted_idx]
    confidence = prediction_proba[0][predicted_idx]

    explainer = lime.lime_text.LimeTextExplainer(
        class_names=class_names, split_expression=r'\\W+', random_state=42
    )
    explanation = explainer.explain_instance(
        cleaned_original, lime_predictor,
        num_features=10, num_samples=500, labels=[predicted_idx]
    )

    return predicted_class, confidence, explanation, salary_numeric_scaled, has_numeric_salary, salary_status_val


# --- OCR for Image Upload --- #

def extract_text_from_image(image_bytes):
    try:
        from PIL import Image
        import pytesseract
        img = Image.open(io.BytesIO(image_bytes))
        text = pytesseract.image_to_string(img, lang='eng+swa')
        return text.strip()
    except ImportError:
        logger.warning("pytesseract or PIL not installed. Cannot OCR images.")
        return ""
    except Exception as e:
        logger.error(f"OCR failed: {e}")
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
    else:
        job_text = request.form.get('job_text', '')
        salary_str = request.form.get('salary_str', '')
        output_lang = request.form.get('output_lang', 'en')

        # Handle image upload
        if 'image' in request.files:
            image_file = request.files['image']
            if image_file.filename:
                image_bytes = image_file.read()
                ocr_text = extract_text_from_image(image_bytes)
                if ocr_text:
                    job_text = ocr_text
                    logger.info(f"OCR extracted {len(ocr_text)} chars from image")
                else:
                    return jsonify({
                        "success": False,
                        "error": "Could not extract text from image",
                        "message": "Could not read text from the uploaded image. Please paste the text manually."
                    }), 400

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

explanation_list = []

if explanation and not isinstance(explanation, str):

    print("Type:", type(explanation))
    print("Available labels:", explanation.available_labels())
    print("Predicted class:", predicted_class)

    # Chukua label iliyotabiriwa na LIME
    label = explanation.available_labels()[0]

    for word, weight in explanation.as_list(label=label):
        explanation_list.append({
            "word": word,
            "weight": f"{weight:.4f}"
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


if __name__ == '__main__':
    load_resources()
    app.run(debug=False, host='0.0.0.0', port=5000, threaded=True)

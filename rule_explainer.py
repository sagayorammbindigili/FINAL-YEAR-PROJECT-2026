import re

# ----------------------------
# KEYWORD GROUPS
# ----------------------------

PAYMENT_KEYWORDS = [
    "fee", "payment", "pay", "deposit", "registration", "training fee",
    "application fee", "send money", "mpesa", "tigo", "airtel", "halopesa",
    "ada", "malipo", "lipa", "tuma fedha", "gharama"
]

DEADLINE_KEYWORDS = [
    "deadline", "closing date", "apply before", "application closes",
    "mwisho wa kutuma", "tarehe ya mwisho"
]

CONTACT_KEYWORDS = [
    "whatsapp", "gmail", "yahoo", "hotmail", "@"
]

QUALIFICATION_KEYWORDS = [
    "degree", "diploma", "bachelor", "experience", "skills",
    "shahada", "stashahada", "uzoefu", "ujuzi", "sifa"
]

RESPONSIBILITY_KEYWORDS = [
    "responsibilities", "duties", "role", "tasks",
    "majukumu", "wajibu", "kazi"
]


# ----------------------------
# CORE KEYWORD SEARCH (EVIDENCE-BASED)
# ----------------------------

def check_keywords(text, keywords):
    text_lower = text.lower()
    found = []

    for kw in keywords:
        if kw in text_lower:
            found.append(kw)

    return found


# ----------------------------
# FAKE JOB EXPLANATION RULES
# ----------------------------

def generate_fake_explanation(text, output_lang="en"):
    reasons = []
    text_lower = text.lower()

    # PAYMENT RULE
    payment_hits = check_keywords(text, PAYMENT_KEYWORDS)
    if payment_hits:
        reasons.append({
            "type": "payment",
            "risk": "High",
            "evidence": payment_hits,
            "en": f"Payment-related terms found: {', '.join(payment_hits)}",
            "sw": f"Maneno ya malipo yamepatikana: {', '.join(payment_hits)}"
        })

    # DEADLINE MISSING
    deadline_hits = check_keywords(text, DEADLINE_KEYWORDS)
    if not deadline_hits:
        reasons.append({
            "type": "deadline_missing",
            "risk": "Medium",
            "evidence": [],
            "en": "No evidence of application deadline in the text.",
            "sw": "Hakuna ushahidi wa tarehe ya mwisho wa maombi."
        })

    # CONTACT ONLY WHATSAPP
    if "whatsapp" in text_lower:
        contact_hits = check_keywords(text, CONTACT_KEYWORDS)
        if len(contact_hits) == 1:
            reasons.append({
                "type": "contact",
                "risk": "Medium",
                "evidence": contact_hits,
                "en": "Only WhatsApp contact was found.",
                "sw": "Mawasiliano ni WhatsApp pekee."
            })

    # QUALIFICATION MISSING
    qual_hits = check_keywords(text, QUALIFICATION_KEYWORDS)
    if not qual_hits:
        reasons.append({
            "type": "qualification_missing",
            "risk": "Medium",
            "evidence": [],
            "en": "No qualifications were mentioned in the job ad.",
            "sw": "Hakuna sifa za mwombaji zilizoainishwa."
        })

    # RESPONSIBILITY MISSING
    resp_hits = check_keywords(text, RESPONSIBILITY_KEYWORDS)
    if not resp_hits:
        reasons.append({
            "type": "responsibility_missing",
            "risk": "Low",
            "evidence": [],
            "en": "Job responsibilities are not clearly described.",
            "sw": "Majukumu ya kazi hayajaelezwa wazi."
        })

    return reasons


# ----------------------------
# REAL JOB EXPLANATION RULES
# ----------------------------

def generate_real_explanation(text, output_lang="en"):
    reasons = []
    text_lower = text.lower()

    if any(k in text_lower for k in ["company", "organization", "inc", "ltd"]):
        reasons.append({
            "type": "company_present",
            "risk": "Low",
            "evidence": ["company detected"],
            "en": "Employer name is provided.",
            "sw": "Jina la mwajiri limetajwa."
        })

    if check_keywords(text, RESPONSIBILITY_KEYWORDS):
        reasons.append({
            "type": "responsibility_present",
            "risk": "Low",
            "evidence": ["responsibilities found"],
            "en": "Job responsibilities are clearly described.",
            "sw": "Majukumu ya kazi yameelezwa wazi."
        })

    if check_keywords(text, QUALIFICATION_KEYWORDS):
        reasons.append({
            "type": "qualification_present",
            "risk": "Low",
            "evidence": ["qualifications found"],
            "en": "Required qualifications are provided.",
            "sw": "Sifa za mwombaji zimeainishwa."
        })

    if check_keywords(text, DEADLINE_KEYWORDS):
        reasons.append({
            "type": "deadline_present",
            "risk": "Low",
            "evidence": ["deadline found"],
            "en": "Application deadline is provided.",
            "sw": "Tarehe ya mwisho ya maombi ipo."
        })

    return reasons


# ----------------------------
# MAIN FUNCTION
# ----------------------------

def generate_explanation(text, predicted_class, output_lang="en"):
    if "fake" in predicted_class.lower() or "feki" in predicted_class.lower():
        return generate_fake_explanation(text, output_lang)
    else:
        return generate_real_explanation(text, output_lang)
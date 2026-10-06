import os
from flask import Flask, request, jsonify, send_from_directory
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, f1_score, accuracy_score, precision_recall_fscore_support, confusion_matrix
from sklearn.pipeline import Pipeline
import numpy as np

app = Flask(__name__, static_folder='static', static_url_path='')

BASE_DATASET = [
    ("I was charged twice for my subscription this month", "Billing"),
    ("My invoice shows the wrong amount, please refund the difference", "Billing"),
    ("Can I get a receipt for last month's payment?", "Billing"),
    ("The card on file was declined but I was still charged", "Billing"),
    ("Why is my bill higher than usual this cycle?", "Billing"),
    ("I want to cancel my subscription and get a refund", "Billing"),
    ("Please update my billing address on the account", "Billing"),
    ("I never received an invoice for this month's charge", "Billing"),
    ("The upgrade fee seems incorrect, can you check?", "Billing"),
    ("My payment failed but the app still shows premium features locked", "Billing"),
    ("I was billed after cancelling my subscription plan", "Billing"),
    ("Can you send me a VAT tax invoice for tax filing?", "Billing"),
    ("I need to change my credit card payment method", "Billing"),
    ("Double charge on my credit card for annual renewal", "Billing"),

    ("The app crashes every time I try to upload a file", "Technical"),
    ("I'm getting a 500 error when I try to log in", "Technical"),
    ("The dashboard is not loading any data for me", "Technical"),
    ("Export to PDF is broken, the file comes out empty", "Technical"),
    ("Push notifications stopped working after the last update", "Technical"),
    ("The search feature returns no results even for valid queries", "Technical"),
    ("I can't connect the app to my calendar, sync keeps failing", "Technical"),
    ("The mobile app freezes on the home screen", "Technical"),
    ("API requests are timing out constantly today", "Technical"),
    ("Images are not rendering correctly in the report view", "Technical"),
    ("Database connection timed out during data import", "Technical"),
    ("Page loads infinitely and throws JavaScript runtime exception", "Technical"),
    ("Webhook delivery fails with status 502 Bad Gateway", "Technical"),
    ("Web application buttons are non-responsive on Safari browser", "Technical"),

    ("I forgot my password and the reset email never arrives", "Account"),
    ("How do I change the email associated with my account?", "Account"),
    ("I need to add a teammate to my workspace", "Account"),
    ("My account got locked after too many login attempts", "Account"),
    ("Can you delete my account and all associated data?", "Account"),
    ("I want to transfer ownership of my workspace to a colleague", "Account"),
    ("Two-factor authentication isn't sending me a code", "Account"),
    ("I need to merge two accounts I accidentally created", "Account"),
    ("How do I change my username?", "Account"),
    ("My account shows the wrong company name, how do I fix it?", "Account"),
    ("How do I enable 2FA multi-factor authentication?", "Account"),
    ("Revoke access for a team member who left the company", "Account"),
    ("Single Sign-On SSO integration is throwing authorization error", "Account"),

    ("What are your support hours?", "General"),
    ("Do you have a mobile app for iOS?", "General"),
    ("Where can I find your API documentation?", "General"),
    ("Is there a student discount available?", "General"),
    ("Can you tell me more about your enterprise plan?", "General"),
    ("How do I get started with your product?", "General"),
    ("Do you offer onboarding calls for new customers?", "General"),
    ("What integrations do you support?", "General"),
    ("Is there a public roadmap I can follow?", "General"),
    ("How can I give feedback on a feature request?", "General"),
    ("Do you have a referral program or affiliate commission?", "General"),
    ("What are your security certifications and GDPR compliance?", "General"),
    ("Is there a free trial period for the pro tier?", "General"),
]

dataset = list(BASE_DATASET)
model_pipeline = None
model_metrics = {}

def build_and_evaluate_model():
    global model_pipeline, model_metrics, dataset

    texts = [t for t, _ in dataset]
    labels = [l for _, l in dataset]

    try:
        X_train, X_test, y_train, y_test = train_test_split(
            texts, labels, test_size=0.25, random_state=42, stratify=labels
        )
    except Exception:
        X_train, X_test, y_train, y_test = train_test_split(
            texts, labels, test_size=0.25, random_state=42
        )

    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=1, stop_words="english")),
        ("clf", LogisticRegression(max_iter=1000, C=2.0)),
    ])

    pipeline.fit(X_train, y_train)
    y_pred = pipeline.predict(X_test)

    classes = list(pipeline.classes_)
    macro_f1 = f1_score(y_test, y_pred, average="macro")
    acc = accuracy_score(y_test, y_pred)
    
    prec, rec, f1s, supp = precision_recall_fscore_support(y_test, y_pred, labels=classes, zero_division=0)
    
    per_class = {}
    for i, cls in enumerate(classes):
        per_class[cls] = {
            "precision": float(round(prec[i], 3)),
            "recall": float(round(rec[i], 3)),
            "f1": float(round(f1s[i], 3)),
            "support": int(supp[i])
        }

    cm = confusion_matrix(y_test, y_pred, labels=classes).tolist()

    model_pipeline = pipeline
    model_metrics = {
        "macro_f1": float(round(macro_f1, 3)),
        "accuracy": float(round(acc, 3)),
        "dataset_size": len(dataset),
        "train_size": len(X_train),
        "test_size": len(X_test),
        "classes": classes,
        "per_class": per_class,
        "confusion_matrix": cm
    }

build_and_evaluate_model()

def format_prediction_result(text):
    if not text or not text.strip():
        return {"error": "Ticket text cannot be empty"}

    probs = model_pipeline.predict_proba([text])[0]
    classes = list(model_pipeline.classes_)
    
    prob_dict = {cls: float(round(p, 4)) for cls, p in zip(classes, probs)}
    sorted_probs = sorted(prob_dict.items(), key=lambda x: x[1], reverse=True)
    
    top_category, top_confidence = sorted_probs[0]
    
    text_lower = text.lower()
    if top_category == "Technical" or "crash" in text_lower or "500" in text_lower or "timeout" in text_lower:
        priority = "High" if top_category == "Technical" else "Medium"
        team = "Tier 2 Engineering Support"
        sla = "2 Hours"
    elif top_category == "Billing" or "charge" in text_lower or "refund" in text_lower:
        priority = "High"
        team = "Finance & Billing Ops"
        sla = "4 Hours"
    elif top_category == "Account" or "lock" in text_lower or "password" in text_lower:
        priority = "Medium"
        team = "Account Security & IAM"
        sla = "6 Hours"
    else:
        priority = "Low"
        team = "Customer Experience Team"
        sla = "12 Hours"

    auto_responses = {
        "Billing": f"Hello! We received your billing inquiry regarding '{text[:40]}...'. Our Finance team has been notified and will verify your invoice details shortly. Expected response within {sla}.",
        "Technical": f"Thank you for reporting this technical issue ('{text[:40]}...'). Our Engineering team is inspecting system logs to diagnose the failure. Expected response within {sla}.",
        "Account": f"Hi there! We have logged your account request ('{text[:40]}...'). Security verification guidelines will be sent to your email. Expected response within {sla}.",
        "General": f"Hello! Thank you for contacting support regarding '{text[:40]}...'. A Customer Specialist will assist you within {sla}."
    }

    return {
        "text": text,
        "category": top_category,
        "confidence": top_confidence,
        "probabilities": prob_dict,
        "priority": priority,
        "routing_team": team,
        "sla": sla,
        "auto_response": auto_responses.get(top_category, "")
    }

@app.route('/')
def serve_index():
    return send_from_directory('static', 'index.html')

@app.route('/api/classify', methods=['POST'])
def classify_ticket():
    data = request.get_json() or {}
    text = data.get('text', '')
    if not text:
        return jsonify({"error": "Missing 'text' field"}), 400
    
    result = format_prediction_result(text)
    return jsonify(result)

@app.route('/api/classify-batch', methods=['POST'])
def classify_batch():
    data = request.get_json() or {}
    tickets = data.get('tickets', [])
    if not isinstance(tickets, list) or len(tickets) == 0:
        return jsonify({"error": "Field 'tickets' must be a non-empty list"}), 400
    
    results = [format_prediction_result(t) for t in tickets if isinstance(t, str) and t.strip()]
    return jsonify({
        "total": len(results),
        "results": results
    })

@app.route('/api/metrics', methods=['GET'])
def get_metrics():
    return jsonify(model_metrics)

@app.route('/api/dataset', methods=['GET'])
def get_dataset():
    return jsonify({
        "count": len(dataset),
        "dataset": [{"text": t, "category": c} for t, c in dataset]
    })

@app.route('/api/retrain', methods=['POST'])
def retrain_model():
    data = request.get_json() or {}
    new_text = data.get('text', '').strip()
    new_category = data.get('category', '').strip()

    if not new_text or not new_category:
        return jsonify({"error": "Both 'text' and 'category' are required"}), 400

    valid_categories = ["Billing", "Technical", "Account", "General"]
    if new_category not in valid_categories:
        return jsonify({"error": f"Invalid category. Must be one of {valid_categories}"}), 400

    dataset.append((new_text, new_category))
    build_and_evaluate_model()

    return jsonify({
        "message": "Sample added and model retrained successfully!",
        "new_metrics": model_metrics
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)

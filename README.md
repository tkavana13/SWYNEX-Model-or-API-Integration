# Support Ticket Triage Classifier

A machine learning solution and web application designed to automatically classify incoming customer support tickets into four functional categories: **Billing**, **Technical**, **Account**, and **General**.

Built with **Python**, **scikit-learn**, **Flask**, and a responsive **Light Theme Web Interface**, this prototype provides automated classification, confidence scoring, priority assignment, SLA determination, auto-response draft generation, bulk processing, and live active-learning retraining.

---

## 🌟 Executive Summary

In high-volume customer support operations, manually categorizing and assigning incoming support tickets introduces delays and routing errors. This project implements a lightweight NLP pipeline that classifies tickets upon arrival, exposing confidence scores and routing details to assist support teams and automate initial triage.

### Core Capabilities

- **NLP Classification Engine**: TF-IDF Vectorization combined with Logistic Regression for fast, deterministic inference without external GPU or paid API key dependencies.
- **Light UI**: Responsive Single-Page Application (SPA) designed with a clean light color palette, interactive confidence meters, and category probability distribution charts.
- **Smart Triage & SLA Routing**: Automatically derives priority level (`High`, `Medium`, `Low`), target SLA countdowns, and assigned handling teams.
- **Automated Response Generator**: Produces initial customer response drafts with 1-click clipboard copy functionality.
- **Session History Log & CSV Export**: Tracks classified tickets in a filterable table with export capabilities.
- **Bulk Batch Processing**: Classifies multi-line ticket entries concurrently.
- **Model Analytics & Diagnostics**: Exposes real-time Macro F1 scores, accuracy ratings, per-class evaluation metrics, and a Confusion Matrix matrix.
- **Active Learning Retraining**: Interface to submit new labeled ticket examples and trigger live model retraining.

---

## 📁 Repository Structure

```
├── app.py                 # Flask REST API backend & scikit-learn model engine
├── ticket_classifier.py   # Standalone CLI prototype and evaluation script
├── requirements.txt       # Project dependencies (Flask, scikit-learn, numpy)
├── README.md              # Project documentation
└── static/                # Single Page Application frontend
    ├── index.html         # HTML5 UI structure
    ├── css/
    │   └── style.css      # CSS design system (Light Theme)
    └── js/
        └── app.js         # Frontend application logic & REST API integration
```

---

## ⚙️ Technology Stack

- **Machine Learning**: `scikit-learn` (`TfidfVectorizer`, `LogisticRegression`)
- **Backend API**: `Flask` (Python RESTful Web Server)
- **Frontend**: HTML5, Vanilla CSS3 (Custom Light Theme), JavaScript (ES6+)
- **Typography & Icons**: Google Fonts (`Outfit`, `Inter`), FontAwesome 6

---

## 📊 Model Architecture & Performance

The classifier uses an $N$-gram TF-IDF pipeline paired with a multi-class Logistic Regression classifier calibrated for support ticket language patterns.

### Dataset Categories

| Category | Description | Primary Keywords / Signals |
| :--- | :--- | :--- |
| **Billing** | Charges, invoices, payment failures, refunds | `charged`, `invoice`, `refund`, `card`, `subscription` |
| **Technical** | Crashes, HTTP errors, API timeouts, system bugs | `crash`, `500 error`, `timeout`, `freeze`, `broken` |
| **Account** | Passwords, 2FA, ownership, SSO, workspace access | `password`, `locked`, `email`, `2FA`, `ownership` |
| **General** | Sales inquiries, pricing, support hours, docs | `support hours`, `discount`, `documentation`, `pricing` |

### Benchmark Metrics

- **Macro F1-Score**: `~0.85+` (Evaluated on held-out test split)
- **Overall Accuracy**: `>85%`
- **Inference Latency**: `< 10ms` per ticket

---

## 🔌 REST API Reference

### 1. Classify Single Ticket
```http
POST /api/classify
Content-Type: application/json

{
  "text": "I was charged twice for my subscription this month"
}
```

**Response:**
```json
{
  "text": "I was charged twice for my subscription this month",
  "category": "Billing",
  "confidence": 0.7842,
  "probabilities": {
    "Billing": 0.7842,
    "Technical": 0.0812,
    "Account": 0.0721,
    "General": 0.0625
  },
  "priority": "High",
  "routing_team": "Finance & Billing Ops",
  "sla": "4 Hours",
  "auto_response": "Hello! We received your billing inquiry regarding 'I was charged twice for my subscription th...'."
}
```

### 2. Batch Classification
```http
POST /api/classify-batch
Content-Type: application/json

{
  "tickets": [
    "I was charged twice for my subscription",
    "App crashes on report PDF export"
  ]
}
```

### 3. Model Metrics
```http
GET /api/metrics
```

### 4. Active Retraining
```http
POST /api/retrain
Content-Type: application/json

{
  "text": "Can you update our corporate tax ID on invoice PDF downloads?",
  "category": "Billing"
}
```

---

## 🚀 Installation & Running Locally

### Prerequisites

- Python 3.9 or higher
- `pip` package manager

### Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/SuhasSakri/SWYNEX-Model-or-API-Integration.git
   cd SWYNEX-Model-or-API-Integration
   ```

2. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Launch the Web Application**
   ```bash
   python app.py
   ```
   *(Or using the Python launcher on Windows: `py app.py`)*

4. **Access the Interface**
   Open your browser and navigate to:
   ```
   http://127.0.0.1:5000
   ```

---

## 📄 License & Internship Context

Developed as part of **Task 2: Model or API Integration** for the **SWYNEX AI Internship**.

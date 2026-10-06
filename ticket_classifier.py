"""
Support Ticket Triage Classifier — Prototype
Task 2: Model or API Integration (SWYNEX AI Internship)

Integrates scikit-learn (TF-IDF + Logistic Regression) to classify
incoming support tickets into: Billing, Technical, Account, General.

No external API keys required — fully self-contained and reproducible.
"""

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, f1_score
from sklearn.pipeline import Pipeline

# ---------------------------------------------------------------------------
# 1. Small labeled training dataset (ticket text -> category)
#    In production this would be loaded from the Kaggle support-ticket
#    dataset referenced in the Task 1 design doc; a compact inline sample
#    is used here so the prototype runs with zero setup.
# ---------------------------------------------------------------------------
data = [
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
]

texts = [t for t, _ in data]
labels = [l for _, l in data]

# ---------------------------------------------------------------------------
# 2. Train / test split (stratified, as specified in the Task 1 eval plan)
# ---------------------------------------------------------------------------
X_train, X_test, y_train, y_test = train_test_split(
    texts, labels, test_size=0.25, random_state=42, stratify=labels
)

# ---------------------------------------------------------------------------
# 3. Model: TF-IDF + Logistic Regression pipeline
# ---------------------------------------------------------------------------
model = Pipeline([
    ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=1, stop_words="english")),
    ("clf", LogisticRegression(max_iter=1000)),
])

model.fit(X_train, y_train)

# ---------------------------------------------------------------------------
# 4. Evaluation (matches Task 1's success criteria: macro F1)
# ---------------------------------------------------------------------------
y_pred = model.predict(X_test)
macro_f1 = f1_score(y_test, y_pred, average="macro")

print("=" * 60)
print("EVALUATION ON HELD-OUT TEST SET")
print("=" * 60)
print(f"Macro F1-score: {macro_f1:.3f}\n")
print(classification_report(y_test, y_pred, zero_division=0))

# ---------------------------------------------------------------------------
# 5. Example inputs and outputs on brand-new, unseen tickets
# ---------------------------------------------------------------------------
new_tickets = [
    "I was billed twice this month and need a refund",
    "The app keeps crashing when I open the reports tab",
    "I can't log in, it says my account is locked",
    "Do you have a referral program?",
    "My invoice total doesn't match what I was quoted",
    "None of the buttons on the settings page respond",
]

print("=" * 60)
print("EXAMPLE PREDICTIONS ON NEW TICKETS")
print("=" * 60)
probs = model.predict_proba(new_tickets)
classes = model.classes_
for ticket, prob_row in zip(new_tickets, probs):
    pred_idx = prob_row.argmax()
    pred_label = classes[pred_idx]
    confidence = prob_row[pred_idx]
    print(f'\nTicket: "{ticket}"')
    print(f"  -> Predicted category: {pred_label}  (confidence: {confidence:.2f})")

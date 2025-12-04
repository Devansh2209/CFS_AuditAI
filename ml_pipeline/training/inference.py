import joblib
import pandas as pd
import os

class CashFlowClassifier:
    def __init__(self, model_path='cashflow_classifier.joblib', vectorizer_path='tfidf_vectorizer.joblib'):
        print("🚀 Loading model artifacts...")
        if not os.path.exists(model_path) or not os.path.exists(vectorizer_path):
            raise FileNotFoundError("Model artifacts not found. Run train_model.py first.")
            
        self.model = joblib.load(model_path)
        self.vectorizer = joblib.load(vectorizer_path)
        print("✅ Model loaded successfully.")

    def clean_description(self, description: str) -> str:
        import re
        # Remove "Net Cash..." prefixes
        desc = re.sub(r'Net Cash (Provided by|Used in) ', '', description, flags=re.IGNORECASE)
        desc = re.sub(r'Payments to Acquire ', '', desc, flags=re.IGNORECASE)
        desc = re.sub(r'Proceeds from ', '', desc, flags=re.IGNORECASE)
        desc = re.sub(r'Payments for ', '', desc, flags=re.IGNORECASE)
        desc = re.sub(r'Purchase of ', '', desc, flags=re.IGNORECASE)
        desc = re.sub(r'Payment of ', '', desc, flags=re.IGNORECASE)
        return desc.strip()

    def extract_keywords(self, text: str) -> str:
        import re
        stop_words = {'net', 'cash', 'provided', 'used', 'in', 'activities', 'payments', 'proceeds', 'to', 'from', 'for', 'of', 'and'}
        words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
        keywords = [w for w in words if w not in stop_words]
        return " ".join(keywords)

    def predict(self, descriptions):
        """
        Predict categories for a list of descriptions.
        """
        if isinstance(descriptions, str):
            descriptions = [descriptions]
            
        # Preprocess to match training data
        processed_texts = []
        for desc in descriptions:
            clean = self.clean_description(desc)
            keywords = self.extract_keywords(desc)
            text_feature = f"{clean} {keywords}"
            processed_texts.append(text_feature)
            
        # Vectorize
        X = self.vectorizer.transform(processed_texts)
        
        # Predict
        predictions = self.model.predict(X)
        probabilities = self.model.predict_proba(X)
        
        results = []
        for desc, pred, prob in zip(descriptions, predictions, probabilities):
            confidence = max(prob)
            results.append({
                'description': desc,
                'category': pred,
                'confidence': f"{confidence:.2%}"
            })
            
        return results

if __name__ == "__main__":
    # Example Usage
    classifier = CashFlowClassifier()
    
    new_transactions = [
        "Payment for purchase of land",
        "Proceeds from long-term debt",
        "Net income",
        "Dividends paid to common shareholders",
        "Acquisition of subsidiary, net of cash acquired"
    ]
    
    print("\n🔍 Classifying new transactions:")
    results = classifier.predict(new_transactions)
    
    for res in results:
        print(f"  📝 '{res['description']}' \n     -> 🏷️  {res['category']} ({res['confidence']})")
        print("-" * 40)

import pandas as pd
import numpy as np
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
import os

# Configuration
DATASET_PATH = 'v30_data/v31_master_nlp_cleaned.csv'
MODEL_DIR = 'trained_models/finbert_v31'
MODEL_FILE = os.path.join(MODEL_DIR, 'finbert_v31_model.sav')
VECTORIZER_FILE = os.path.join(MODEL_DIR, 'finbert_v31_tfidf.sav')

def train_model():
    print("="*60)
    print("Training V31 Model (Scikit-Learn)")
    print("="*60)
    
    # 1. Load Data
    print(f"Loading dataset from {DATASET_PATH}...")
    df = pd.read_csv(DATASET_PATH)
    print(f"Loaded {len(df)} transactions.")
    
    # Use cleaned sentence if available, else raw sentence
    if 'cleaned_sentence' in df.columns:
        X_text = df['cleaned_sentence'].fillna('')
    else:
        X_text = df['sentence'].fillna('')
        
    y = df['cash_flow_category']
    
    # 2. Split Data
    print("Splitting data (80% train, 20% test)...")
    X_train_raw, X_test_raw, y_train, y_test = train_test_split(
        X_text, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # 3. Vectorization (TF-IDF)
    print("Vectorizing text...")
    vectorizer = TfidfVectorizer(
        max_features=20000,
        ngram_range=(1, 2), # Unigrams and Bigrams
        stop_words='english'
    )
    
    X_train = vectorizer.fit_transform(X_train_raw)
    X_test = vectorizer.transform(X_test_raw)
    
    print(f"Vocabulary size: {len(vectorizer.vocabulary_)}")
    
    # 4. Train Model (Logistic Regression)
    print("Training Logistic Regression classifier...")
    # Using class_weight='balanced' just in case, though V31 is already balanced
    clf = LogisticRegression(
        random_state=42, 
        max_iter=1000, 
        class_weight='balanced',
        n_jobs=-1
    )
    clf.fit(X_train, y_train)
    
    # 5. Evaluate
    print("\nEvaluating model...")
    y_pred = clf.predict(X_test)
    
    accuracy = accuracy_score(y_test, y_pred)
    print(f"Accuracy: {accuracy:.4f}")
    
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))
    
    print("\nConfusion Matrix:")
    print(confusion_matrix(y_test, y_pred))
    
    # 6. Save Model
    print(f"\nSaving model artifacts to {MODEL_DIR}...")
    os.makedirs(MODEL_DIR, exist_ok=True)
    
    joblib.dump(clf, MODEL_FILE)
    joblib.dump(vectorizer, VECTORIZER_FILE)
    
    print("="*60)
    print("SUCCESS! Model trained and saved.")
    print(f"Model: {MODEL_FILE}")
    print(f"Vectorizer: {VECTORIZER_FILE}")
    print("="*60)

if __name__ == '__main__':
    train_model()

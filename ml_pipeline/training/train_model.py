import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix
import joblib
import matplotlib.pyplot as plt
import seaborn as sns

def train_baseline_model(data_path='v25_datasets/transactions.csv'):
    print(f"🚀 Loading data from {data_path}...")
    df = pd.read_csv(data_path)
    
    # 1. Prepare Features
    # Combine description and keywords for better context
    df['text_feature'] = df['clean_description'] + " " + df['keywords'].fillna('')
    
    X = df['text_feature']
    y = df['category']
    
    print(f"📊 Dataset size: {len(df)} examples")
    print(f"   Distribution:\n{y.value_counts()}")
    
    # 2. Split Data (Group Split by Ticker to prevent leakage)
    from sklearn.model_selection import GroupShuffleSplit
    
    splitter = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
    train_idx, test_idx = next(splitter.split(X, y, groups=df['ticker']))
    
    X_train = X.iloc[train_idx]
    X_test = X.iloc[test_idx]
    y_train = y.iloc[train_idx]
    y_test = y.iloc[test_idx]
    
    print(f"   Training on {len(X_train)} examples ({len(df.iloc[train_idx]['ticker'].unique())} companies)")
    print(f"   Testing on {len(X_test)} examples ({len(df.iloc[test_idx]['ticker'].unique())} companies)")
    
    # 3. Vectorize Text (TF-IDF)
    print("\n🔤 Vectorizing text data...")
    vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)
    
    # 4. Train Model (Random Forest)
    print("🌲 Training Random Forest Classifier...")
    rf = RandomForestClassifier(n_estimators=100, random_state=42)
    rf.fit(X_train_vec, y_train)
    
    # 5. Evaluate
    print("\n📈 Evaluation Results:")
    y_pred = rf.predict(X_test_vec)
    print(classification_report(y_test, y_pred))
    
    # 6. Save Artifacts
    print("💾 Saving model artifacts...")
    joblib.dump(rf, 'cashflow_classifier.joblib')
    joblib.dump(vectorizer, 'tfidf_vectorizer.joblib')
    
    # 7. Test with some custom examples
    test_examples = [
        "Purchase of property, plant and equipment",
        "Proceeds from issuance of common stock",
        "Net income adjusted for non-cash items",
        "Payment of dividends to shareholders"
    ]
    print("\n🧪 Testing with new examples:")
    vec_examples = vectorizer.transform(test_examples)
    predictions = rf.predict(vec_examples)
    
    for text, pred in zip(test_examples, predictions):
        print(f"  '{text}' -> {pred}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Train Cash Flow Classifier")
    parser.add_argument("--data", default="v25_datasets/transactions.csv", help="Path to training CSV")
    args = parser.parse_args()

    # Install dependencies if needed
    # pip install pandas scikit-learn matplotlib seaborn
    train_baseline_model(data_path=args.data)

import argparse
import os
import joblib
import pandas as pd
import numpy as np
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
from xgboost import XGBClassifier

from preprocessing import TextCleaner, DateFeatureExtractor, LogAmountTransformer

def model_fn(model_dir):
    """Load model from the model_dir. This is for SageMaker inference."""
    model = joblib.load(os.path.join(model_dir, "model.joblib"))
    return model

def main():
    parser = argparse.ArgumentParser()

    # SageMaker specific arguments. Defaults are set in the environment variables.
    parser.add_argument("--output-data-dir", type=str, default=os.environ.get("SM_OUTPUT_DATA_DIR"))
    parser.add_argument("--model-dir", type=str, default=os.environ.get("SM_MODEL_DIR"))
    parser.add_argument("--train", type=str, default=os.environ.get("SM_CHANNEL_TRAIN"))
    
    # Hyperparameters
    parser.add_argument("--n-estimators", type=int, default=100)
    parser.add_argument("--max-depth", type=int, default=6)
    parser.add_argument("--learning-rate", type=float, default=0.1)

    args = parser.parse_args()

    print("Loading training data...")
    # Assuming a single CSV file in the train channel
    train_file = os.path.join(args.train, "train.csv")
    if not os.path.exists(train_file):
        # Fallback for local testing or if file name differs
        files = [f for f in os.listdir(args.train) if f.endswith('.csv')]
        if files:
            train_file = os.path.join(args.train, files[0])
        else:
            raise ValueError("No CSV file found in training channel")

    df = pd.read_csv(train_file)
    print(f"Data loaded. Shape: {df.shape}")

    # Define features and target
    # Expected columns based on research: 
    # 'amount', 'description', 'date', 'account_code', 'counterparty', 'label'
    
    # Drop rows with missing target
    df = df.dropna(subset=['label'])
    
    X = df.drop('label', axis=1)
    y = df['label']

    # Split data for validation during training
    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)

    # --- Build the Pipeline ---
    
    # 1. Text Pipeline: Clean -> TF-IDF
    text_pipeline = Pipeline([
        ('cleaner', TextCleaner()),
        ('tfidf', TfidfVectorizer(max_features=5000, ngram_range=(1, 2)))
    ])

    # 2. Date Pipeline: Extract features -> OneHot (for categorical like day_of_week) or Pass through
    # For simplicity, we'll treat extracted date features as numeric/ordinal for tree models
    date_pipeline = Pipeline([
        ('extractor', DateFeatureExtractor())
    ])

    # 3. Numeric Pipeline: Log transform -> Scaler
    numeric_pipeline = Pipeline([
        ('log', LogAmountTransformer()),
        ('scaler', StandardScaler())
    ])

    # 4. Categorical Pipeline: OneHot
    categorical_pipeline = Pipeline([
        ('onehot', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
    ])

    # Column Transformer
    preprocessor = ColumnTransformer(
        transformers=[
            ('desc', text_pipeline, 'description'),
            ('date', date_pipeline, 'date'),
            ('amt', numeric_pipeline, 'amount'),
            ('cat', categorical_pipeline, ['account_code', 'counterparty']) # Add other cat features here
        ],
        remainder='drop' # Drop unused columns
    )

    # Full Pipeline with Classifier
    pipeline = Pipeline([
        ('preprocessor', preprocessor),
        ('classifier', XGBClassifier(
            n_estimators=args.n_estimators,
            max_depth=args.max_depth,
            learning_rate=args.learning_rate,
            objective='multi:softmax', # or binary:logistic depending on classes
            eval_metric='mlogloss',
            n_jobs=-1
        ))
    ])

    print("Training model...")
    pipeline.fit(X_train, y_train)

    print("Evaluating model...")
    y_pred = pipeline.predict(X_val)
    accuracy = accuracy_score(y_val, y_pred)
    print(f"Validation Accuracy: {accuracy:.4f}")
    print(classification_report(y_val, y_pred))

    print("Saving model...")
    joblib.dump(pipeline, os.path.join(args.model_dir, "model.joblib"))
    print("Model saved successfully.")

if __name__ == "__main__":
    main()

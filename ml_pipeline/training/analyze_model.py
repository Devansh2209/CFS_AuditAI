import joblib
import pandas as pd
import numpy as np

def analyze_features():
    print("🚀 Loading model artifacts...")
    rf = joblib.load('cashflow_classifier.joblib')
    vectorizer = joblib.load('tfidf_vectorizer.joblib')
    
    feature_names = vectorizer.get_feature_names_out()
    importances = rf.feature_importances_
    
    # Create a DataFrame
    feat_df = pd.DataFrame({'feature': feature_names, 'importance': importances})
    feat_df = feat_df.sort_values('importance', ascending=False)
    
    print("\n🏆 Top 20 Most Important Features:")
    print(feat_df.head(20))
    
    # Check specific keywords
    keywords = ['purchase', 'property', 'equipment', 'stock', 'debt', 'proceeds', 'payments']
    print("\n🔍 Importance of specific keywords:")
    print(feat_df[feat_df['feature'].isin(keywords)])

if __name__ == "__main__":
    analyze_features()

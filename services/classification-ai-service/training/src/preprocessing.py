import pandas as pd
import numpy as np
import nltk
import re
from sklearn.base import BaseEstimator, TransformerMixin
from nltk.corpus import stopwords
from nltk.stem import PorterStemmer

# Download NLTK data (if not present in image)
try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords', quiet=True)

class TextCleaner(BaseEstimator, TransformerMixin):
    def __init__(self):
        self.stop_words = set(stopwords.words('english'))
        self.stemmer = PorterStemmer()

    def fit(self, X, y=None):
        return self

    def transform(self, X):
        # Assumes X is a pandas Series or DataFrame column
        return X.apply(self._clean_text)

    def _clean_text(self, text):
        if not isinstance(text, str):
            return ""
        
        # Lowercase
        text = text.lower()
        
        # Remove special chars and numbers (keep only letters)
        text = re.sub(r'[^a-z\s]', '', text)
        
        # Tokenize and remove stopwords
        tokens = [word for word in text.split() if word not in self.stop_words]
        
        # Stemming
        tokens = [self.stemmer.stem(word) for word in tokens]
        
        return " ".join(tokens)

class DateFeatureExtractor(BaseEstimator, TransformerMixin):
    def fit(self, X, y=None):
        return self

    def transform(self, X):
        # Assumes X is a DataFrame with a 'date' column or similar
        # If X is a Series, convert to DF
        if isinstance(X, pd.Series):
            X = X.to_frame()
            
        X_out = X.copy()
        
        # Ensure datetime
        col_name = X_out.columns[0]
        X_out[col_name] = pd.to_datetime(X_out[col_name])
        
        # Extract features
        X_out['month'] = X_out[col_name].dt.month
        X_out['day_of_week'] = X_out[col_name].dt.dayofweek
        X_out['is_quarter_end'] = X_out[col_name].dt.is_quarter_end.astype(int)
        X_out['is_year_end'] = X_out[col_name].dt.is_year_end.astype(int)
        
        return X_out[['month', 'day_of_week', 'is_quarter_end', 'is_year_end']]

class LogAmountTransformer(BaseEstimator, TransformerMixin):
    def fit(self, X, y=None):
        return self

    def transform(self, X):
        # Log transform absolute amount to handle skewness
        # Add 1 to avoid log(0)
        return np.log1p(np.abs(X))

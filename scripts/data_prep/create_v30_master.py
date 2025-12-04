import pandas as pd
import nltk
import re
import random
from nltk.tokenize import word_tokenize
from nltk.tag import pos_tag
from collections import Counter

# Download NLTK resources (if not already present)
try:
    nltk.data.find('tokenizers/punkt')
    nltk.data.find('taggers/averaged_perceptron_tagger_eng')
except LookupError:
    nltk.download('punkt')
    nltk.download('averaged_perceptron_tagger')
    nltk.download('averaged_perceptron_tagger_eng')

# Financial terms to preserve even if tagged as Proper Nouns
FINANCIAL_TERMS = {
    'company', 'corporation', 'inc', 'ltd', 'plc', 'group', 'bank', 'fund',
    'trust', 'capital', 'equity', 'debt', 'bond', 'stock', 'share', 'asset',
    'liability', 'revenue', 'income', 'expense', 'profit', 'loss', 'cash',
    'tax', 'interest', 'dividend', 'investment', 'acquisition', 'merger',
    'amortization', 'depreciation', 'goodwill', 'intangible', 'receivable',
    'payable', 'inventory', 'treasury', 'common', 'preferred', 'notes',
    'credit', 'facility', 'loan', 'lease', 'obligation', 'pension', 'benefit',
    'restructuring', 'impairment', 'derivative', 'hedging', 'foreign', 'exchange'
}

def clean_text_nlp(text):
    """
    Advanced NLP cleaning using POS tagging.
    Removes non-financial Proper Nouns (names, places) and dates.
    """
    # 1. Basic normalization
    text = re.sub(r'\s+', ' ', str(text)).strip()
    
    # 2. Remove specific date patterns (e.g., "December 31, 2023")
    text = re.sub(r'(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}', 'DATE', text, flags=re.IGNORECASE)
    
    # 3. Tokenize
    try:
        tokens = word_tokenize(text)
    except:
        return text # Fallback if tokenization fails
        
    # 4. POS Tagging
    tags = pos_tag(tokens)
    
    clean_tokens = []
    for word, tag in tags:
        word_lower = word.lower()
        
        # Remove non-financial Proper Nouns (NNP/NNPS)
        # We keep the word if it's in our financial whitelist OR if it looks like a standard word
        if tag.startswith('NNP'):
            if word_lower in FINANCIAL_TERMS:
                clean_tokens.append(word)
            else:
                # Replace with generic entity placeholder or skip?
                # For FinBERT, skipping names is often better to avoid bias
                continue
        else:
            clean_tokens.append(word)
            
    # Reconstruct
    cleaned_text = " ".join(clean_tokens)
    
    # Final cleanup of punctuation artifacts
    cleaned_text = re.sub(r'\s+([.,;)])', r'\1', cleaned_text) # Fix "word ." -> "word."
    cleaned_text = re.sub(r'([(])\s+', r'\1', cleaned_text)     # Fix "( word" -> "(word"
    
    return cleaned_text

def create_master_dataset():
    print("Loading datasets...")
    
    # Load Base V30
    df_base = pd.read_csv('v30_data/v30_all_extracted.csv')
    print(f"Base V30: {len(df_base)} transactions")
    
    # Load Boost
    try:
        df_boost = pd.read_csv('v30_data/v30_investing_boost.csv')
        print(f"Boost Data: {len(df_boost)} transactions")
        
        # Combine
        df_all = pd.concat([df_base, df_boost], ignore_index=True)
    except FileNotFoundError:
        print("Boost file not found, using base only.")
        df_all = df_base

    print(f"Total Raw: {len(df_all)}")
    
    # Deduplicate
    df_all.drop_duplicates(subset=['sentence'], inplace=True)
    print(f"Total Unique: {len(df_all)}")
    
    # Clean Text
    print("Applying NLP Cleaning (this may take a minute)...")
    df_all['cleaned_sentence'] = df_all['sentence'].apply(clean_text_nlp)
    
    # Filter out empty or too short sentences after cleaning
    df_all = df_all[df_all['cleaned_sentence'].str.len() > 20]
    
    # Balance Categories
    final_dfs = []
    
    for category in ['operating', 'investing', 'financing']:
        cat_df = df_all[df_all['cash_flow_category'] == category]
        count = len(cat_df)
        print(f"Category {category}: {count} available")
        
        if count >= 10000:
            # Downsample
            sampled = cat_df.sample(n=10000, random_state=42)
            final_dfs.append(sampled)
        else:
            print(f"WARNING: {category} has only {count} transactions! Upsampling to 10k.")
            # Upsample (duplicate with replacement)
            sampled = cat_df.sample(n=10000, replace=True, random_state=42)
            final_dfs.append(sampled)
            
    # Create Master DataFrame
    df_master = pd.concat(final_dfs, ignore_index=True)
    
    # Shuffle
    df_master = df_master.sample(frac=1, random_state=42).reset_index(drop=True)
    
    # Save
    output_file = 'v30_data/v30_master_nlp_cleaned.csv'
    df_master.to_csv(output_file, index=False)
    
    print("="*60)
    print(f"SUCCESS! Master Dataset Saved: {output_file}")
    print(f"Total Rows: {len(df_master)}")
    print(df_master['cash_flow_category'].value_counts())
    print("="*60)

if __name__ == '__main__':
    create_master_dataset()

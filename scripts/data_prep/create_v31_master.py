import pandas as pd
import nltk
import re
import random
from nltk.tokenize import word_tokenize
from nltk.tag import pos_tag

# Download NLTK resources
try:
    nltk.data.find('tokenizers/punkt')
    nltk.data.find('taggers/averaged_perceptron_tagger_eng')
except LookupError:
    nltk.download('punkt')
    nltk.download('averaged_perceptron_tagger')
    nltk.download('averaged_perceptron_tagger_eng')

# Financial terms to preserve
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
    """Advanced NLP cleaning using POS tagging."""
    text = re.sub(r'\s+', ' ', str(text)).strip()
    text = re.sub(r'(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}', 'DATE', text, flags=re.IGNORECASE)
    
    try:
        tokens = word_tokenize(text)
    except:
        return text
        
    tags = pos_tag(tokens)
    clean_tokens = []
    for word, tag in tags:
        word_lower = word.lower()
        if tag.startswith('NNP'):
            if word_lower in FINANCIAL_TERMS:
                clean_tokens.append(word)
            else:
                continue
        else:
            clean_tokens.append(word)
            
    cleaned_text = " ".join(clean_tokens)
    cleaned_text = re.sub(r'\s+([.,;)])', r'\1', cleaned_text)
    cleaned_text = re.sub(r'([(])\s+', r'\1', cleaned_text)
    return cleaned_text

def create_v31_master():
    print("Loading datasets for V31...")
    
    # Load Base
    df_base = pd.read_csv('v30_data/v30_all_extracted.csv')
    print(f"Base Data: {len(df_base)} transactions")
    
    # Load Boost
    try:
        df_boost = pd.read_csv('v30_data/v30_investing_boost.csv')
        print(f"Boost Data: {len(df_boost)} transactions")
        df_all = pd.concat([df_base, df_boost], ignore_index=True)
    except FileNotFoundError:
        print("Boost file not found, using base only.")
        df_all = df_base

    print(f"Total Raw: {len(df_all)}")
    
    # 1. Strict Deduplication
    df_all.drop_duplicates(subset=['sentence'], inplace=True)
    print(f"Total Unique: {len(df_all)}")
    
    # 2. NLP Cleaning
    print("Applying NLP Cleaning...")
    df_all['cleaned_sentence'] = df_all['sentence'].apply(clean_text_nlp)
    
    # Filter short sentences
    df_all = df_all[df_all['cleaned_sentence'].str.len() > 20]
    
    # 3. Determine Max Balanced Count
    counts = df_all['cash_flow_category'].value_counts()
    print("\nUnique Counts per Category:")
    print(counts)
    
    min_count = counts.min()
    print(f"\nLimiting Factor: {min_count} transactions (based on smallest category)")
    
    # 4. Create Balanced Dataset
    final_dfs = []
    for category in ['operating', 'investing', 'financing']:
        cat_df = df_all[df_all['cash_flow_category'] == category]
        # Sample exactly min_count
        sampled = cat_df.sample(n=min_count, random_state=42)
        final_dfs.append(sampled)
        
    df_master = pd.concat(final_dfs, ignore_index=True)
    df_master = df_master.sample(frac=1, random_state=42).reset_index(drop=True)
    
    # Save
    output_file = 'v30_data/v31_master_nlp_cleaned.csv'
    df_master.to_csv(output_file, index=False)
    
    print("="*60)
    print(f"SUCCESS! V31 Master Dataset Saved: {output_file}")
    print(f"Total Rows: {len(df_master)}")
    print(f"Transactions per Category: {min_count}")
    print("="*60)

if __name__ == '__main__':
    create_v31_master()

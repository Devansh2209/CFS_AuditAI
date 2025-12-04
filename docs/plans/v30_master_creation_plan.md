# V30 Master Dataset Creation Plan

## Objective
Create the final **V30 Master Dataset** with:
- **30,000 Total Transactions**
- **Perfect Balance**: 10,000 Operating, 10,000 Investing, 10,000 Financing
- **NLP Cleaning**: Advanced cleaning using NLTK POS tagging

---

## Phase 1: Data Aggregation
1. **Download Sources**:
   - `v30_all_extracted.csv` (Base V30 data: ~36k transactions)
   - `v30_investing_boost.csv` (Boost data: ~10k+ Investing transactions)
   
2. **Merge Strategy**:
   - Combine all datasets
   - Deduplicate based on exact sentence text
   - Separate into categories

## Phase 2: NLP Cleaning (NLTK)
Implement `clean_text_nlp(text)` function:
1. **Tokenization**: Split sentences into words.
2. **POS Tagging**: Identify parts of speech (Noun, Verb, Adjective, etc.).
3. **Noise Removal**:
   - Remove **Proper Nouns (NNP)** that are not financial entities (e.g., "John Smith", "New York").
   - Keep financial Proper Nouns (e.g., "Company", "Bank").
   - Remove specific dates/years (e.g., "December 31, 2023" -> "DATE").
4. **Lemmatization**: Convert words to base form (e.g., "acquired" -> "acquire") - *Optional, might lose tense context*.

## Phase 3: Balancing & Sampling
1. **Operating**: Downsample from ~15k to 10,000.
2. **Financing**: Downsample from ~17k to 10,000.
3. **Investing**: Downsample from ~13k (Base + Boost) to 10,000.
   - *Prioritize Boost data* as it's from targeted companies.

## Phase 4: Final Output
- Save to `v30_master_nlp_cleaned.csv`
- Upload to S3
- Generate distribution report

---

## Script Structure (`create_v30_master.py`)

```python
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from nltk.tag import pos_tag

def clean_text_nlp(text):
    tokens = word_tokenize(text)
    tags = pos_tag(tokens)
    
    clean_tokens = []
    for word, tag in tags:
        # Remove non-financial Proper Nouns (names, places)
        if tag == 'NNP' and word.lower() not in FINANCIAL_TERMS:
            continue
        clean_tokens.append(word)
        
    return " ".join(clean_tokens)
```

## Execution
1. Install `nltk` and download resources (`punkt`, `averaged_perceptron_tagger`).
2. Run script locally (since we have the data).
3. Upload final dataset.

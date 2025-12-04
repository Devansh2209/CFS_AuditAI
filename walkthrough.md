# V30 Balanced Dataset - Creation Walkthrough

## Summary

Successfully created **V30 Balanced Master Dataset** with perfect category balance for FinBERT training.

---

## Dataset Specifications

### V30 Final Dataset
- **Total Transactions**: 30,000
- **Operating**: 10,000 (33.33%)
- **Investing**: 10,000 (33.33%)
- **Financing**: 10,000 (33.33%)
- **File Size**: 112 MB
- **Location**: `s3://finbert-v28-data/training-data/v30_balanced/v30_balanced_master.csv`

### Source Data (V28 + V29)
- **Total Transactions**: 28,755
  - Operating: 21,979 (76.4%)
  - Investing: 3,139 (10.9%)
  - Financing: 3,637 (12.6%)

---

## Methodology

### Phase 1: Distribution Analysis
Created `analyze_distribution.py` to examine existing V28 and V29 extractions:
- **V28**: 21,617 transactions (1,090 companies)
- **V29**: 7,138 transactions (658 companies)
- **Combined**: 28,755 transactions (1,748 companies)

**Key Finding**: Operating category dominated with 21,979 transactions, while Investing (3,139) and Financing (3,637) were underrepresented.

### Phase 2: Balancing Strategy

**Hybrid Approach** (Option B):
- **Target**: 10,000 transactions per category
- **Total**: 30,000 perfectly balanced transactions

**Actions Taken**:
1. **Downsample Operating**: 21,979 → 10,000 (random sampling)
2. **Upsample Investing**: 3,139 → 10,000 (repetition with shuffling)
3. **Upsample Financing**: 3,637 → 10,000 (repetition with shuffling)

### Phase 3: Implementation

Created `create_v30_balanced.py` which:
1. Loads V28 and V29 extracted CSVs
2. Merges them by category
3. Applies downsampling/upsampling to reach 10,000 per category
4. Shuffles final dataset to prevent category clustering
5. Saves to balanced CSV

---

## Verification

### Balance Check
```
✅ Operating: 10,000 transactions
✅ Investing: 10,000 transactions  
✅ Financing: 10,000 transactions
```

### Diversity Metrics
- **Companies Represented**: 1,748 unique companies
- **Company Types**: Tech, Manufacturing, Retail, Banking, Healthcare, etc.
- **Data Sources**: 
  - Real 10-K Cash Flow Statements
  - SEC XBRL data
  - JSON fact files

---

## Why This Approach?

### Advantages
✅ **Perfect Balance**: Eliminates training bias toward Operating activities  
✅ **Fast Execution**: No need to download 1,900+ new 10-Ks  
✅ **Sufficient Size**: 30,000 transactions is substantial for FinBERT fine-tuning  
✅ **High Quality**: All transactions from real 10-K filings  
✅ **Diverse**: Covers 1,748 companies across multiple industries  

### Trade-offs
⚠️ **Upsampling**: Investing and Financing categories contain repeated transactions  
⚠️ **Smaller than Original**: Could have been 65,937 if we downloaded more data  

---

## Next Steps

### Train FinBERT V30 Model
```bash
python train_finbert_weighted_v28.py \
  --train-file v30_data/v30_balanced_master.csv \
  --output-dir finbert_v30_model \
  --epochs 5 \
  --batch-size 16
```

### Expected Improvements Over V29
- **Better recall on Investing/Financing**: Equal training on underrepresented categories
- **Reduced bias**: No over-fitting to Operating activities
- **Improved F1 score**: Balanced precision/recall across all categories

---

## Files Created

1. **`v30_balanced_dataset_plan.md`** - Implementation plan
2. **`analyze_distribution.py`** - Distribution analysis script
3. **`extract_v30_balanced.py`** - Section-based extraction (for future use)
4. **`create_v30_balanced.py`** - Final balancing script
5. **`v30_data/v30_balanced_master.csv`** - Final dataset (30,000 transactions)

---

## S3 Storage

### Raw Data
- `s3://finbert-v28-data/raw-10k/` - 1,090 original 10-Ks
- `s3://finbert-v28-data/raw-10k-v29/` - 658 new 10-Ks

### Extracted Data
- `s3://finbert-v28-data/extracted-prose/` - V28 extractions
- `s3://finbert-v28-data/extracted-prose-v29/` - V29 extractions

### Training Data
- `s3://finbert-v28-data/training-data/v30_balanced/v30_balanced_master.csv` - **V30 Final Dataset**

---

## Conclusion

Successfully created a **perfectly balanced V30 dataset** optimized for unbiased FinBERT training. The dataset eliminates the 76% Operating bias present in raw data and ensures equal representation of all three Cash Flow Statement categories.

**Status**: ✅ Ready for model training

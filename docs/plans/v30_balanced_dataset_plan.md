# V30 Balanced Dataset Extraction Plan

## Objective
Create a perfectly balanced training dataset where Operating, Investing, and Financing categories have **equal representation** by intelligently extracting transactions from 1,748 existing 10-K filings and downloading additional targeted filings as needed.

---

## Phase 1: Analyze Current Distribution

### Step 1.1: Download Existing Extracted Data
```bash
# Download V28 extractions
aws s3 cp s3://finbert-v28-data/extracted-prose/extracted_prose.csv ./v30_data/v28_extracted.csv

# Download V29 extractions  
aws s3 cp s3://finbert-v28-data/extracted-prose-v29/extracted_prose.csv ./v30_data/v29_extracted.csv
```

### Step 1.2: Analyze Category Distribution
Create `analyze_distribution.py` to:
- Load both V28 and V29 extracted datasets
- Count transactions by category
- Generate distribution report:
  ```
  Operating: X transactions
  Investing: Y transactions  
  Financing: Z transactions
  Target: MAX(X, Y, Z) per category
  ```

**Expected Distribution** (based on typical 10-K content):
- Operating: ~60-70% (most common - operational cash flows)
- Financing: ~20-25% (debt, equity, dividends)
- Investing: ~10-15% (CapEx, acquisitions)

---

## Phase 2: Targeted Extraction Strategy

### Approach A: If Operating Has Most Transactions
**Problem**: Too many operating, need more Investing + Financing

**Solution**:
1. **Investing Boost**: Download 10-Ks from:
   - Tech companies (high CapEx: GOOGL, META, MSFT)
   - Manufacturing (equipment purchases: CAT, DE, BA)
   - Real estate (property acquisitions: SPG, PLD)
   
2. **Financing Boost**: Download 10-Ks from:
   - High-dividend companies (O, T, VZ)
   - Banks (frequent debt issuance: JPM, BAC, WFC)
   - Growth companies (equity raises: UBER, ABNB)

### Approach B: If Financing Has Most Transactions
**Problem**: Too many financing, need more Operating + Investing

**Solution**:
1. **Operating Boost**: Download 10-Ks from:
   - Retailers (high operating cash flow: WMT, COST, TGT)
   - Service companies (GOOGL, META for ad revenue)
   - Healthcare providers (UNH, CVS)

2. **Investing Boost**: Same as Approach A

### Approach C: If Investing Has Most Transactions (Unlikely)
**Problem**: Too many investing, need more Operating + Financing

**Solution**:
1. **Operating Boost**: Same as Approach B
2. **Financing Boost**: Same as Approach A

---

## Phase 3: Enhanced Extraction Script

### Create `extract_v30_balanced.py`

**Key Features**:
1. **Category-Specific Extraction**:
   ```python
   OPERATING_KEYWORDS = [
       'net income', 'depreciation', 'amortization',
       'accounts receivable', 'inventory', 'accounts payable',
       'changes in operating', 'net cash provided by operating'
   ]
   
   INVESTING_KEYWORDS = [
       'capital expenditures', 'purchase of property',
       'acquisition', 'sale of equipment', 'purchase of equipment',
       'net cash used in investing', 'capex'
   ]
   
   FINANCING_KEYWORDS = [
       'dividends', 'issuance of debt', 'repayment of debt',
       'issuance of stock', 'share repurchase', 'treasury stock',
       'net cash from financing', 'borrowings'
   ]
   ```

2. **Intelligent Sectioning**:
   - Parse 10-K to find "Cash Flows from Operating Activities" section
   - Extract only Operating transactions from that section
   - Repeat for Investing and Financing sections
   - Label each transaction with its source section

3. **Quality Filtering**:
   - Remove XBRL debris
   - Filter out table headers
   - Keep only sentences with dollar amounts or percentages
   - Minimum sentence length: 30 characters

---

## Phase 4: Balanced Dataset Assembly

### Step 4.1: Determine Target Count
```python
category_counts = {
    'operating': len(operating_txns),
    'investing': len(investing_txns),
    'financing': len(financing_txns)
}

target_count = max(category_counts.values())
print(f"Target: {target_count} transactions per category")
```

### Step 4.2: Balancing Strategy

**Option 1: Upsample Underrepresented Categories**
- If a category has fewer than target, download more 10-Ks
- Use targeted ticker lists (see Phase 2)
- Extract until category reaches target count

**Option 2: Downsample Overrepresented Categories**  
- If a category exceeds target, randomly sample to target count
- Preserve diversity (sample from multiple companies)
- Keep high-quality examples (prioritize those with clear keywords)

**Recommended: Hybrid Approach**
- Set target to 10,000-15,000 per category (30K-45K total)
- Upsample categories below target
- Downsample categories above target
- Ensures manageable dataset size with perfect balance

### Step 4.3: Create Final Dataset
```python
balanced_data = []

# Sample each category to exact target
for category in ['operating', 'investing', 'financing']:
    category_samples = sample_or_upsample(
        transactions=category_data[category],
        target_count=target_count,
        strategy='stratified'  # Maintain diversity
    )
    balanced_data.extend(category_samples)

# Shuffle to prevent category clustering
random.shuffle(balanced_data)

# Save as v30_master_training_data.csv
save_to_csv(balanced_data, 'v30_master_training_data.csv')
```

---

## Phase 5: Verification & Upload

### Verification Steps
1. **Count Check**:
   ```python
   assert operating_count == investing_count == financing_count
   ```

2. **Quality Check**:
   - No XBRL debris
   - No duplicate transactions
   - All transactions have clear category keywords

3. **Diversity Check**:
   - Transactions from at least 500+ unique companies
   - Multiple industries represented
   - Various transaction amounts

### Upload to S3
```bash
aws s3 cp v30_master_training_data.csv s3://finbert-v28-data/training-data/v30_balanced/
```

---

## Expected Outcomes

### Dataset Specifications
- **Total Records**: 30,000-45,000
- **Per Category**: 10,000-15,000 each
- **Balance**: Perfect 33.33% distribution
- **Quality**: High (XBRL-cleaned, keyword-validated)
- **Diversity**: 500+ companies, 10+ industries

### Model Performance Improvement
- **Reduced Bias**: No category over/under-represented
- **Better Recall**: Equal training on all categories
- **Improved F1 Score**: Balanced precision/recall across categories
- **Real-World Alignment**: Matches actual CFS proportions better

---

## Implementation Timeline

1. **Phase 1** (2 hours): Analyze distribution, create reports
2. **Phase 2** (1 hour): Create targeted ticker lists
3. **Phase 3** (4 hours): Build enhanced extraction script
4. **Phase 4** (3 hours): Download additional data if needed
5. **Phase 5** (2 hours): Balance, verify, upload

**Total Estimated Time**: 12 hours (can run overnight on AWS)

---

## Next Steps

1. ✅ Create `analyze_distribution.py`
2. ✅ Download and analyze existing extractions
3. ⏳ Identify which category needs boosting
4. ⏳ Create targeted ticker lists
5. ⏳ Build `extract_v30_balanced.py`
6. ⏳ Execute extraction on AWS
7. ⏳ Verify and upload final dataset

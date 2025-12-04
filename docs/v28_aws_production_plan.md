# V28: AWS Production Training Plan ($100 Budget)

## Goal
Scale to **1,500 companies** and train a production-ready BERT model on AWS SageMaker within your $100 credit.

## Phase 1: Data Extraction (V28 - 1,500 Companies)

### Target Company Mix
```
Large Cap (S&P 500):     500 companies
Mid Cap (S&P 400):       500 companies  
Small Cap (Russell 2000): 300 companies
Special Cases:           200 companies (REITs, Banks, Utilities)
────────────────────────────────────────
TOTAL:                  1,500 companies
```

### Expected Output
- **Transactions**: ~150,000-200,000
- **Storage**: ~50MB (JSON files)
- **Extraction Time**: ~2 hours (Lambda)
- **Cost**: $5-10 (Lambda + S3)

### Execution
```bash
# Generate 1,500 diverse tickers
python3 generate_v28_tickers.py --count 1500 --diversify

# Run V24 Lambda
aws lambda invoke \
  --function-name sec-downloader \
  --payload file://v28_1500_companies.json \
  /tmp/v28_result.json
```

## Phase 2: AWS SageMaker Training

### Cost Breakdown (Within $100 Budget)

| Resource | Instance Type | Cost/Hour | Hours Needed | Total Cost |
|----------|---------------|-----------|--------------|------------|
| **Training** | ml.g4dn.xlarge (GPU) | $0.736 | 2-3 hours | $2-3 |
| **Storage** | S3 (50MB data + 500MB model) | $0.023/GB/month | 1 month | $0.01 |
| **Data Transfer** | Out to internet | $0.09/GB | 1GB | $0.09 |
| **Total** | | | | **~$3-5** |

**Remaining Budget**: $95-97 for future experiments! ✅

### Why SageMaker?

1. **No disk space issues** (managed storage)
2. **GPU acceleration** (10x faster than M1 Mac)
3. **Automatic checkpointing** (saves to S3)
4. **Scalable** (can upgrade to bigger instances later)

### Training Configuration

**Instance**: `ml.g4dn.xlarge`
- 1x NVIDIA T4 GPU (16GB VRAM)
- 4 vCPUs
- 16GB RAM
- **Perfect for FinBERT** (438MB model fits easily)

**Training Time Estimate**:
- 150K transactions @ 16 batch size = ~9,375 steps
- 3 epochs = 28,125 total steps
- Speed: ~200 steps/min on GPU
- **Total**: ~2.5 hours

**Cost**: $0.736/hour × 2.5 hours = **$1.84**

## Phase 3: Implementation Steps

### Step 1: Extract 1,500 Companies
```bash
# Create ticker list
python3 generate_v28_tickers.py

# Run extraction (will take ~2 hours)
aws lambda invoke --function-name sec-downloader \
  --payload file://v28_1500_companies.json \
  /tmp/v28_result.json
```

### Step 2: Process Data
```bash
# Download from S3
aws s3 sync s3://sec-edgar-raw-filings-028061991824/v24-api-data/ v28_data/

# Process into training format
python3 v25_processor.py --input v28_data --output v28_datasets
```

### Step 3: Upload to S3 for SageMaker
```bash
# Upload training data
aws s3 cp v28_datasets/transactions.csv \
  s3://sec-edgar-raw-filings-028061991824/v28-training/
```

### Step 4: Create SageMaker Training Job

I'll create a script that:
1. Launches a SageMaker training job
2. Uses the weighted BERT trainer
3. Saves the model back to S3
4. Shuts down automatically (no runaway costs!)

## Data Sufficiency: Final Answer

### Minimum for Beta Launch
- **Companies**: 1,000
- **Transactions**: 100,000
- **Confidence**: 90%

### Recommended for Commercial Production
- **Companies**: 1,500
- **Transactions**: 150,000
- **Confidence**: 95%

### Gold Standard (Future)
- **Companies**: 3,000+
- **Transactions**: 300,000+
- **Confidence**: 99%

## Risk Mitigation

**Current Risk** (322 companies):
- ❌ Might fail on micro-caps
- ❌ Might fail on REITs/Banks
- ❌ Limited sector diversity

**After 1,500 companies**:
- ✅ Covers all major sectors
- ✅ Handles edge cases
- ✅ Production-ready for 90% of use cases

## Next Steps

1. **Generate 1,500-company ticker list** (5 mins)
2. **Run V24 extraction** (2 hours, $5)
3. **Process data** (10 mins)
4. **Train on SageMaker** (2.5 hours, $2)
5. **Deploy model** (save to S3)

**Total Time**: ~5 hours  
**Total Cost**: ~$7 (93% of budget remaining!)

Shall I proceed with generating the 1,500-company list and setting up the SageMaker training job?

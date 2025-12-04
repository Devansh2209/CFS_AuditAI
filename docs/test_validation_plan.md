# SEC Pipeline Test & Validation Plan

## Objective
Systematically test and validate each component before deploying V14 with small-scale training to ensure the pipeline works end-to-end.

---

## Phase 1: Component Testing (Local)

### 1.1 Downloader Component
**Test File**: `test_downloader.py`

**Tests**:
- ✅ Download single ticker (AAPL)
- ✅ Verify file saved to S3
- ✅ Check file format (.txt)
- ✅ Validate file size > 0

**Validation**:
```bash
cd sec-edgar-pipeline/src/downloader
python -m pytest test_downloader.py -v
```

---

### 1.2 Processor Component  
**Test File**: `test_processor_local.py`

**Tests**:
- ✅ Download sample filing from S3
- ✅ Parse HTML/text content
- ✅ Extract cash flow data
- ✅ Verify DataFrame structure
- ✅ Check labeled data (operating/investing/financing)
- ✅ Validate CSV output

**Sample Test**:
```python
def test_process_single_filing():
    processor = DataProcessor(RAW_BUCKET, PROCESSED_BUCKET)
    # Test with AAPL filing
    df = processor.parser.parse_html(sample_html)
    assert df is not None
    assert 'description' in df.columns
    assert 'label' in df.columns
```

---

### 1.3 Training Component
**Test File**: `test_training_local.py`

**Tests**:
- ✅ Load sample CSV data
- ✅ Initialize FinancialBERT model
- ✅ Tokenize sample data
- ✅ Run 1 epoch training
- ✅ Verify model saves correctly
- ✅ Test inference on sample

**Sample Dataset**: 100 rows, 3 classes

---

## Phase 2: Integration Testing (AWS - Small Scale)

### 2.1 Test Configuration
**Tickers**: `["AAPL", "MSFT", "GOOGL"]` (3 only)  
**Filing Type**: 10-K  
**Limit**: 1 per ticker  
**Expected Files**: 3 filings

---

### 2.2 Download Test
**Execution**: `test-download-3-tickers`

**Success Criteria**:
- ✅ All 3 tickers downloaded
- ✅ Files in S3 raw bucket
- ✅ Correct path structure
- ✅ File sizes reasonable (>1MB)
- ✅ Execution time < 30 seconds

---

### 2.3 Processing Test
**Execution**: Manual Lambda invocation

**Success Criteria**:
- ✅ Processes all 3 files
- ✅ No timeouts (<15 min)
- ✅ Creates CSV in processed bucket
- ✅ CSV has >50 rows total
- ✅ All 3 labels present
- ✅ No parsing errors

---

### 2.4 Training Test
**Execution**: Manual ECS task

**Success Criteria**:
- ✅ Downloads processed CSV from S3
- ✅ Loads data successfully
- ✅ Initializes model
- ✅ Completes 1 epoch
- ✅ Saves model to S3
- ✅ Model files exist in S3
- ✅ Total time < 10 minutes

---

## Phase 3: End-to-End Validation

### 3.1 Full Pipeline Test  
**Execution**: `test-pipeline-e2e-3-tickers`

**Input**:
```json
{
  "tickers": ["AAPL", "MSFT", "GOOGL"],
  "filing_type": "10-K",
  "limit": 1,
  "after_date": "2023-01-01"
}
```

**Success Criteria**:
- ✅ Downloads: SUCCEEDED (3/3)
- ✅ Processing: SUCCEEDED (CSV created)
- ✅ Training: SUCCEEDED (model in S3)
- ✅ Total time: < 20 minutes
- ✅ No errors in CloudWatch logs

---

## Phase 4: V14 Deployment

### 4.1 Pre-Deployment Checklist
- [ ] All Phase 1 tests passing
- [ ] Phase 2 integration tests passing
- [ ] Phase 3 E2E test successful
- [ ] Model artifacts verified in S3
- [ ] All CloudWatch logs reviewed
- [ ] No error patterns identified

### 4.2 V14 Configuration
**Scale**: 10 tickers (proven workload)  
**Tickers**: Top 10 by market cap  
**Timeout**: Processor 900s, Training 30min  
**Expected**: 100% success rate

---

## Testing Timeline

1. **Component Testing**: 1-2 hours
2. **Integration Testing**: 1 hour  
3. **E2E Validation**: 30 minutes
4. **V14 Deployment**: 20 minutes

**Total**: ~3-4 hours for complete validation

---

## Rollback Plan

If V14 fails:
1. Check which phase failed (Download/Process/Train)
2. Review that component's test results
3. Fix identified issue
4. Re-run component test
5. If passes, deploy V15

---

## Success Metrics

**Phase 1**: 100% unit tests passing  
**Phase 2**: All 3-ticker tests succeed  
**Phase 3**: E2E pipeline completes  
**Phase 4**: V14 trains model successfully

**Definition of Done**: Trained model artifacts in S3 that can be loaded for inference

# V20 Enhanced Processor Implementation Plan

## Overview
Transform the SEC pipeline from basic CSV extraction to a comprehensive ML training data generator with XBRL support, intelligent filing type detection, and structured multi-format outputs.

## User Review Required

> [!WARNING]
> **Scope Change**: This is a significant architectural enhancement that will:
> - Add new Python dependencies (`python-xbrl`, `py-xbrl-us`)
> - Require ECS container rebuild
> - Change output format from single CSV to multiple structured files
> - Increase processing time per filing (XBRL parsing + enrichment)
> - May require additional ECS memory/CPU

> [!IMPORTANT]
> **Breaking Changes**:
> - Current trainer expects `training-data/train.csv`
> - V20 will output `transaction_training_data.json` + `statement_level_data.csv` + `processing_log.json`
> - Need to decide: Keep backward compatibility OR update trainer to use new format?

---

## Proposed Changes

### 1. Intelligent Downloader Enhancement

#### [infrastructure/main.tf](file:///Users/devanshsoni/Desktop/Cashflow/services/sec-edgar-pipeline/infrastructure/main.tf)
- No changes needed (downloader logic is in Python)

#### [NEW] [sec_downloader.py](file:///Users/devanshsoni/Desktop/Cashflow/services/sec-edgar-pipeline/src/downloader/sec_downloader.py)
**Current**: Downloads only 10-K filings
**Enhanced**:
```python
def download_with_fallback(ticker, filing_types=['10-K', '20-F'], limit=3):
    """
    Priority logic:
    1. Try 10-K first
    2. If 0 results → Try 20-F (foreign issuers)
    3. Filter out amendments (10-K/A, 20-F/A)
    """
    # Exclude amendments via filename filtering
    # Return filing metadata: {ticker, filing_type, year, path}
```

---

### 2. XBRL-First Cash Flow Extractor

#### [NEW] [xbrl_parser.py](file:///Users/devanshsoni/Desktop/Cashflow/services/sec-edgar-pipeline/src/processor/xbrl_parser.py)
**Purpose**: Primary parser using XBRL structured data
```python
class XBRLParser:
    def extract_cash_flow_statement(self, filing_path):
        """
        Search for XBRL tags:
        - us-gaap:NetCashProvidedByUsedInOperatingActivities
        - us-gaap:PaymentsToAcquirePropertyPlantAndEquipment
        - us-gaap:PaymentsOfDividends
        
        Returns: List[CashFlowTransaction]
        """
```

#### [MODIFY] [financial_parser.py](file:///Users/devanshsoni/Desktop/Cashflow/services/sec-edgar-pipeline/src/processor/financial_parser.py)
**Current**: HTML-only BeautifulSoup parsing
**Enhanced**:
```python
class FinancialParser:
    def parse_filing(self, filing_path):
        # 1. Try XBRL first
        xbrl_result = self.xbrl_parser.extract(filing_path)
        if xbrl_result.is_valid():
            return xbrl_result
        
        # 2. Fallback to HTML with fuzzy regex
        html_result = self.parse_html_fuzzy(filing_path)
        return html_result
    
    def parse_html_fuzzy(self, html_content):
        """
        Enhanced regex patterns:
        - "Statement of Cash Flows"
        - "Cash Flow Statement" 
        - "Changes in Financial Position"
        """
```

---

### 3. Structured Output Generation

#### [MODIFY] [data_processor.py](file:///Users/devanshsoni/Desktop/Cashflow/services/sec-edgar-pipeline/src/processor/data_processor.py)
**Current**: Outputs single `training-data/train.csv`
**Enhanced**:
```python
def save_processed_data(self, transactions, statements, processing_log):
    # Output 1: Transaction-level training data
    self.save_json(
        'training-data/transaction_training_data.json',
        transactions  # Format: {description, amount, account, classification, sub_category, confidence, reasoning}
    )
    
    # Output 2: Statement-level aggregate data
    self.save_csv(
        'training-data/statement_level_data.csv',
        statements  # Format: {company, filing_year, transaction_type, amount, classification, gaap_reference, industry, materiality}
    )
    
    # Output 3: Processing metrics
    self.save_json(
        'training-data/processing_log.json',
        processing_log  # Format: {ticker, filing_type, success, errors, extraction_method}
    )
```

---

### 4. Data Enrichment Module

#### [NEW] [enrichment.py](file:///Users/devanshsoni/Desktop/Cashflow/services/sec-edgar-pipeline/src/processor/enrichment.py)
```python
class DataEnricher:
    def calculate_materiality(self, amount, revenue):
        """Returns 'high' | 'medium' | 'low' based on amount/revenue ratio"""
    
    def map_gaap_reference(self, transaction_type):
        """Maps to ASC 230-10-45-XX standards"""
    
    def extract_industry(self, filing_content):
        """Parses SIC code or business description"""
    
    def calculate_confidence(self, extraction_method, data_quality):
        """Scores confidence: XBRL=0.95, HTML_table=0.85, Fuzzy=0.70"""
```

---

### 5. Sub-Categorization Logic

#### [NEW] [categorization.py](file:///Users/devanshsoni/Desktop/Cashflow/services/sec-edgar-pipeline/src/processor/categorization.py)
```python
OPERATING_SUBCATEGORIES = {
    'customer_collections': ['accounts receivable', 'cash receipt', 'sales'],
    'supplier_payments': ['accounts payable', 'inventory', 'cost of goods'],
    'tax_payments': ['income tax', 'tax payment'],
    'interest_paid': ['interest expense', 'interest paid']
}

INVESTING_SUBCATEGORIES = {
    'capital_expenditure': ['capex', 'property, plant', 'equipment'],
    'business_acquisition': ['acquisition', 'purchase of business'],
    'investment_purchase': ['marketable securities', 'investment']
}

FINANCING_SUBCATEGORIES = {
    'dividend_payment': ['dividend', 'distribution'],
    'stock_repurchase': ['buyback', 'treasury stock'],
    'debt_issuance': ['bond', 'note', 'loan']
}
```

---

## Verification Plan

### Testing Strategy
1. **Unit Tests**: Test XBRL parser on known filings (AAPL, MSFT)
2. **Foreign Issuer Test**: Verify 20-F handling with BTI
3. **Amendment Filter**: Confirm 10-K/A files are excluded
4. **Output Format Validation**: Check JSON/CSV schemas match spec
5. **E2E Test**: Run V20 with 10 tickers, validate all 3 output files

### Success Metrics
- [ ] >90% of filings yield valid cash flow data
- [ ] XBRL used for >70% of filings (HTML fallback <30%)
- [ ] All 3 output files generated correctly
- [ ] Foreign issuers (BTI, etc.) successfully processed via 20-F
- [ ] Zero 10-K/A amendments in output data

---

## Dependencies to Add

```txt
# requirements.txt additions
python-xbrl==1.1.1
py-xbrl-us==0.1.0
fuzzywuzzy==0.18.0
python-Levenshtein==0.12.2
```

---

## Deployment Plan

### Phase 1: Development (Local)
1. Create new modules: `xbrl_parser.py`, `enrichment.py`, `categorization.py`
2. Update existing: `data_processor.py`, `financial_parser.py`
3. Add dependencies to `requirements.txt`
4. Run local tests with sample filings

### Phase 2: Docker Build
1. Rebuild `sec-processor-ecs` image with new dependencies
2. Push to ECR
3. Update ECS task definition (may need more memory for XBRL parsing)

### Phase 3: V20 Execution
1. Clear S3 buckets (fresh data)
2. Start V20 with 10 test tickers
3. Validate output files in S3
4. If successful → Scale to 100 tickers

---

## Open Questions

1. **Backward Compatibility**: Should we keep the old CSV output alongside new formats?
2. **Trainer Updates**: Do we want to update the trainer to consume JSON format now, or later?
3. **ECS Resources**: Should we increase CPU/memory for XBRL parsing overhead?
4. **XBRL Library**: `python-xbrl` vs `arelle` (more robust but heavier)?


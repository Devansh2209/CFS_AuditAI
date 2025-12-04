# V21 Comprehensive Data Format Implementation Plan

## Overview
Enhance V20 to output comprehensive, gold-standard training data matching the user's specification: transaction IDs, keywords, clean descriptions, cash flow summaries, company metadata, validation checks, and US-only filtering.

## User Review Required

> [!IMPORTANT]
> **Key Changes from V20**:
> - **US-Only**: Remove 20-F fallback logic (domestic issuers only)
> - **Enhanced Fields**: Add 15+ new fields per transaction
> - **Statement Summaries**: New cash_flow_statements.json with full statement structure
> - **Validation**: Mathematical integrity checks before output
> - **Metadata**: Company info, filing metadata, accounting policies

---

## Proposed Changes

### 1. Enhanced Transaction Output Structure

#### [MODIFY] [data_processor.py](file:///Users/devanshsoni/Desktop/Cashflow/services/sec-edgar-pipeline/src/processor/data_processor.py)

**Add to `_enrich_transactions` method**:
```python
def _enrich_transactions(self, transactions, company_name, filing_year, ...):
    enriched = []
    for idx, txn in enumerate(transactions):
        enriched_txn = {
            # V21: New ID fields
            'transaction_id': f"{ticker}_{filing_year}_CF_{idx:03d}",
            
            # V21: Enhanced description fields
            'transaction_description': txn.description,
            'clean_description': self._clean_description(txn.description),
            'keywords': self._extract_keywords(txn.description),
            
            # Core amount fields
            'amount': txn.amount,
            'absolute_amount': abs(txn.amount),
            'currency': 'USD',
            
            # Classification fields
            'classification': txn.classification,
            'sub_category': txn.sub_category,
            'confidence': self.enricher.calculate_confidence(...),
            
            # V21: Metadata fields
            'company': company_name,
            'filing_year': filing_year,
            'form_type': '10-K',
            'gaap_reference': txn.gaap_reference,
            'account_mapping': txn.account,
            'materiality': self.enricher.calculate_materiality(...),
            
            # V21: Context fields
            'period_context': 'annual',
            'reasoning': txn.reasoning,
            'parsing_quality': 'high' if extraction_method == 'xbrl' else 'medium',
            
            # Source tracking
            'extraction_method': extraction_method,
            'filing_source': accession_number
        }
        enriched.append(enriched_txn)
    return enriched
```

---

### 2. Cash Flow Statement Summary Generation

#### [NEW] Method in [data_processor.py](file:///Users/devanshsoni/Desktop/Cashflow/services/sec-edgar-pipeline/src/processor/data_processor.py)

```python
def _create_cash_flow_summary(self, transactions, company_name, filing_year, ticker):
    """Generate complete cash flow statement structure"""
    
    # Group by classification
    operating = [t for t in transactions if t['classification'] == 'operating']
    investing = [t for t in transactions if t['classification'] == 'investing']
    financing = [t for t in transactions if t['classification'] == 'financing']
    
    summary = {
        'statement_id': f"{ticker}_{filing_year}_CFS",
        'company': company_name,
        'filing_year': filing_year,
        'form_type': '10-K',
        'cash_flow_statement': {
            'operating_activities': {
                'net_cash_operating': sum(t['amount'] for t in operating),
                'components': [
                    {
                        'description': t['transaction_description'],
                        'amount': t['amount'],
                        'type': t['sub_category']
                    } for t in operating
                ]
            },
            'investing_activities': {
                'net_cash_investing': sum(t['amount'] for t in investing),
                'components': [...]
            },
            'financing_activities': {
                'net_cash_financing': sum(t['amount'] for t in financing),
                'components': [...]
            },
            'net_change_cash': sum(t['amount'] for t in transactions)
        },
        'validation': self._validate_cash_flow_integrity(...)
    }
    return summary
```

---

### 3. Company Metadata Extraction

#### [NEW] [metadata_extractor.py](file:///Users/devanshsoni/Desktop/Cashflow/services/sec-edgar-pipeline/src/processor/metadata_extractor.py)

```python
class MetadataExtractor:
    def extract_company_metadata(self, filing_content):
        return {
            'company_info': {
                'ticker': self._extract_ticker(),
                'legal_name': self._extract_legal_name(),
                'cik_number': self._extract_cik(),
                'industry': self._extract_industry(),
                'fiscal_year_end': self._extract_fiscal_year_end(),
                'entity_type': 'Domestic Issuer'  # V21: US-only
            },
            'filing_metadata': {
                'filing_date': self._extract_filing_date(),
                'filing_period': self._extract_period(),
                'form_type': '10-K',
                'accession_number': self._extract_accession(),
                'has_xbrl': self._check_xbrl_availability()
            }
        }
```

---

### 4. Validation & Quality Checks

#### [NEW] [validators.py](file:///Users/devanshsoni/Desktop/Cashflow/services/sec-edgar-pipeline/src/processor/validators.py)

```python
class CashFlowValidator:
    def validate_mathematical_integrity(self, statement):
        """Check if Operating + Investing + Financing = Net Change"""
        calculated = (statement['net_cash_operating'] + 
                     statement['net_cash_investing'] + 
                     statement['net_cash_financing'])
        tolerance = 1000  # Allow $1k rounding difference
        return abs(calculated - statement['net_change_cash']) < tolerance
    
    def validate_data_quality(self, transaction):
        """Comprehensive quality checks"""
        checks = {
            'has_valid_amount': transaction['amount'] != 0,
            'has_classification': transaction['classification'] in ['operating', 'investing', 'financing'],
            'has_company_context': bool(transaction['company']),
            'confidence_reasonable': 0.5 <= transaction['confidence'] <= 1.0,
            'has_description': len(transaction['transaction_description']) > 5
        }
        return all(checks.values()), checks
```

---

### 5. US-Only Filtering

#### [MODIFY] [sec_downloader.py](file:///Users/devanshsoni/Desktop/Cashflow/services/sec-edgar-pipeline/src/downloader/sec_downloader.py)

**Remove 20-F fallback logic**:
```python
def download_filings(self, ticker, filing_type="10-K", ...):
    # V21: US companies only - no 20-F fallback
    count = self.dl.get(filing_type, ticker, limit=limit, after=after_date)
    
    if count == 0:
        print(f"❌ No {filing_type} filings found for {ticker} (US companies only)")
        return 0
    
    # Continue with US processing...
```

---

### 6. Enhanced Output Files

#### New Output Structure:
1. **`transaction_training_data.json`** - Enhanced with V21 fields
2. **`cash_flow_statements.json`** - NEW: Complete statement summaries
3. **`company_metadata.json`** - NEW: Company context data
4. **`processing_log.json`** - Enhanced with quality metrics
5. **`train.csv`** - Legacy format (backward compatibility)

---

## Verification Plan

### Testing Strategy
1. **V21 Test Run**: 10 US-only tickers (AAPL, MSFT, GOOGL, JPM, JNJ, PFE, COST, HD, EXC, AMT)
2. **Validate Output Format**: Check all new fields are present
3. **Mathematical Validation**: Verify cash flow integrity checks pass
4. **Quality Metrics**: Ensure >90% confidence on transactions
5. **Scale Test**: Run with 50 US companies

### Success Criteria
- [ ] All 5 output files generated
- [ ] Transaction IDs properly formatted
- [ ] Keywords extracted for all transactions
- [ ] Cash flow statements mathematically valid
- [ ] Company metadata complete
- [ ] No 20-F filings in output
- [ ] >90% data quality score

---

## Implementation Phases

### Phase 1: Core Enhancements (2-3 hours)
- Add transaction ID generation
- Implement keyword extraction
- Create clean_description logic
- Add new metadata fields

### Phase 2: Statement Summaries (1-2 hours)
- Create cash flow summary structure
- Implement grouping logic
- Add mathematical validation

### Phase 3: Metadata & Validation (1 hour)
- Create metadata extractor
- Implement validators
- Add quality scoring

### Phase 4: Testing & Refinement (1 hour)
- Test with 10 companies
- Fix any issues
- Validate output format

---

## Open Questions

1. **Keyword Extraction**: Use simple regex or NLP library (spaCy)?
2. **Validation Failures**: Should we exclude statements that fail validation?
3. **Output Size**: With enhanced fields, expect 3-5x larger files - acceptable?


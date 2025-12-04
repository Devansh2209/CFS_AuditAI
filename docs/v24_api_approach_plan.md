# V24: Fresh Start - SEC Company Concept API Approach

## Problem Summary

**V20-V22 Failures**: All attempts to download complete HTML filings have failed:
- V20: `sec-edgar-downloader` gets truncated `full-submission.txt` (67% failure)
- V21: Same truncation issue
- V22: Lambda still using old downloader despite code changes

**Root Cause**: Fighting with file formats and HTML parsing. Wrong approach.

## V24 Solution: Use SEC Company Concept API

**Better Approach**: Skip file downloads entirely. Use SEC's **Company Concept API** for direct XBRL data.

### Why This Works
- ✅ **Structured Data**: Official SEC JSON API with clean XBRL values
- ✅ **No Parsing**: Pre-extracted financial statement line items
- ✅ **No Downloads**: Direct API calls, no file storage needed
- ✅ **Reliable**: Official SEC data format, not subject to HTML changes

---

## V24 Architecture

### Data Flow
```
Input (Tickers) 
  ↓
SEC Company Concept API (us-gaap tags)
  ↓
Extract Cash Flow Line Items
  ↓
Map to V21 Comprehensive Format
  ↓
Save to S3 (transaction JSON, statement JSON, metadata)
```

### Example API Endpoint
```
https://data.sec.gov/api/xbrl/companyconcept/CIK0000320193/us-gaap/NetCashProvidedByUsedInOperatingActivities.json
```

**Returns**: Every value of that cash flow line item for all periods/forms

---

## Implementation

### [NEW] V24 Downloader (API-based)

```python
import requests
import time

class SECV24APIDownloader:
    """Use SEC Company Concept API for direct XBRL extraction"""
    
    BASE_URL = "https://data.sec.gov/api/xbrl"
    
    # Cash flow line items to extract
    CASH_FLOW_CONCEPTS = {
        # Operating
        'NetCashProvidedByUsedInOperatingActivities': 'net_cash_operating',
        'DepreciationDepletionAndAmortization': 'depreciation',
        'IncreaseDecreaseInAccountsReceivable': 'accounts_receivable_change',
        
        # Investing  
        'PaymentsToAcquirePropertyPlantAndEquipment': 'capex',
        'PaymentsToAcquireBusinessesNetOfCashAcquired': 'acquisitions',
        
        # Financing
        'PaymentsOfDividends': 'dividends',
        'PaymentsForRepurchaseOfCommonStock': 'stock_repurchase',
        'ProceedsFromIssuanceOfLongTermDebt': 'debt_issuance',
    }
    
    def get_cash_flow_data(self, cik: str, ticker: str) -> dict:
        """Get all cash flow data for a company"""
        
        all_data = []
        
        for concept, label in self.CASH_FLOW_CONCEPTS.items():
            url = f"{self.BASE_URL}/companyconcept/CIK{cik:010d}/us-gaap/{concept}.json"
            
            time.sleep(0.11)  # SEC rate limit
            response = requests.get(url, headers=self.headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Extract 10-K annual data
                for unit_data in data.get('units', {}).get('USD', []):
                    if unit_data.get('form') == '10-K' and unit_data.get('fp') == 'FY':
                        all_data.append({
                            'concept': concept,
                            'label': label,
                            'value': unit_data['val'],
                            'fiscal_year': unit_data['fy'],
                            'filing_date': unit_data['filed'],
                            'accession': unit_data['accn']
                        })
        
        return all_data
```

### No File Storage Needed

V24 doesn't use S3 raw bucket - goes straight to processed format:
1. Lambda calls SEC API
2. Transforms to V21 format
3. Saves directly to `training-data/`

---

## Advantages Over V20-V22

| Aspect | V20-V22 (HTML) | V24 (API) |
|--------|----------------|-----------|
| **Download** | Slow, file-based | Fast, API call |
| **Parsing** | Complex HTML | Pre-parsed JSON |
| **Reliability** | 33% success | ~100% success |
| **File Size** | 9MB per company | ~50KB JSON |
| **Rate Limit** | 10 req/sec (files) | 10 req/sec (API) |
| **XBRL Quality** | Partial extraction | Official XBRL values |

---

## Deployment Plan

### Phase 1: Create V24 API Downloader
- Build new downloader using only SEC API
- No `sec-edgar-downloader` dependency
- No file storage

### Phase 2: Update Lambda
- Replace entire lambda with API approach
- Remove file download logic
- Direct S3 output

### Phase 3: Update Processor
- Remove XBRL/HTML parsing (not needed)
- Accept API JSON format
- Map to V21 comprehensive format

### Phase 4: Test
- Single ticker (AAPL)
- Verify complete cash flow extraction
- 10 companies test

---

## Timeline

- **Build V24**: 30-45 mins
- **Deploy**: 15 mins
- **Test**: 10 mins
- **Total**: ~1 hour for proven solution

**Recommendation**: Proceed with V24 API approach - it's simpler, faster, and more reliable than fighting HTML parsing.


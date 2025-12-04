# V22 Complete Filing Downloader Implementation Plan

## Problem Identified

**Root Cause**: The `sec-edgar-downloader` library downloads `full-submission.txt` files which are:
- Truncated (only first page)
- Missing financial statement tables
- Lack complete XBRL rendering
- **Result**: 67% failure rate (AAPL, GOOGL, KO, PFE all failed)

## Solution: Download Primary Document HTML

Replace `sec-edgar-downloader` with direct SEC EDGAR API to get **primary document** (aapl-20250927.htm) containing complete financial statements.

---

## Proposed Changes

### [NEW] Complete SEC EDGAR Downloader

#### [MODIFY] [sec_downloader.py](file:///Users/devanshsoni/Desktop/Cashflow/services/sec-edgar-pipeline/src/downloader/sec_downloader.py)

**Replace with Direct SEC EDGAR API**:

```python
import requests
import time
from bs4 import BeautifulSoup

class SECDownloaderV22:
    """Direct SEC EDGAR downloader for complete primary documents"""
    
    BASE_URL = "https://www.sec.gov"
    
    def __init__(self, email: str, company: str):
        self.headers = {
            'User-Agent': f'{company} {email}',
            'Accept-Encoding': 'gzip, deflate'
        }
        self.rate_limit_delay = 0.1  # SEC requires 10 requests/second max
    
    def find_primary_document(self, cik: str, accession: str) -> str:
        """Find the primary document filename from filing index"""
        # Get filing index page
        accession_no_dash = accession.replace('-', '')
        index_url = f"{self.BASE_URL}/cgi-bin/viewer?action=view&cik={cik}&accession_number={accession}&xbrl_type=v"
        
        time.sleep(self.rate_limit_delay)
        response = requests.get(index_url, headers=self.headers)
        
        # Parse to find primary document
        soup = BeautifulSoup(response.text, 'html.parser')
        # Primary document typically has 'Type: 10-K' and is first in sequence
        
        # Common patterns: {ticker}-{date}.htm or {accession}/{ticker}.htm
        return f"{cik}/{accession_no_dash}/{ticker}-{fiscal_date}.htm"
    
    def download_filing(self, ticker: str, cik: str, accession: str) -> str:
        """Download complete primary document"""
        accession_no_dash = accession.replace('-', '')
        
        # Try multiple URL patterns
        url_patterns = [
            f"{self.BASE_URL}/Archives/edgar/data/{cik}/{accession_no_dash}/{ticker.lower()}-{fiscal_date}.htm",
            f"{self.BASE_URL}/cgi-bin/viewer?action=view&cik={cik}&accession_number={accession}&xbrl_type=v",
        ]
        
        for url in url_patterns:
            try:
                time.sleep(self.rate_limit_delay)
                response = requests.get(url, headers=self.headers)
                if response.status_code == 200:
                    return response.text
            except:
                continue      
        return None
```

---

### Alternative Approach: Use SEC Company Concept API

```python
def get_cash_flow_data_via_api(cik: str, ticker: str) -> Dict:
    """Use SEC Company Concept API for structured XBRL data"""
    
    # SEC Company Concept API endpoint
    url = f"https://data.sec.gov/api/xbrl/companyconcept/CIK{cik:010d}/us-gaap/NetCashProvidedByUsedInOperatingActivities.json"
    
    response = requests.get(url, headers=headers)
    data = response.json()
    
    # Extract annual 10-K data
    for item in data['units']['USD']:
        if item['form'] == '10-K' and item['fp'] == 'FY':
            return {
                'net_cash_operating': item['val'],
                'filing_date': item['filed'],
                'fiscal_year': item['fy']
            }
```

---

## Verification Plan

### Test with Known Good Filing
- AAPL 10-K (0000320193-25-000079)
- Expected URL: `https://www.sec.gov/Archives/edgar/data/320193/000032019325000079/aapl-20250927.htm`
- Should contain complete financial statements

### Success Criteria
- [ ] Download complete HTML (>100KB, not truncated)
- [ ] Extract cash flow statement successfully
- [ ] AAPL, GOOGL extraction success rate: 100%
- [ ] Overall success rate: >90%

---

## Implementation Priority

**Option 1 (Recommended)**: Direct HTML download
- ✅ Complete financial statements
- ✅ Works with existing parser
- ⚠️ Need to determine primary document filename

**Option 2**: SEC Company Concept API
- ✅ Structured XBRL data
- ✅ No parsing needed
- ⚠️ Requires complete API integration

**Recommendation**: Start with Option 1, add Option 2 as enhancement


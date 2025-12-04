"""
V24: SEC Company Concept API Downloader
Direct XBRL data extraction - no HTML downloads or parsing needed
"""
import requests
import time
import json
from typing import Dict, List, Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SECV24APIDownloader:
    """Extract cash flow data using SEC Company Concept API"""
    
    BASE_URL = "https://data.sec.gov/api/xbrl"
    TICKERS_URL = "https://www.sec.gov/files/company_tickers.json"
    
    # US-GAAP cash flow concepts to extract
    CASH_FLOW_CONCEPTS = {
        # Operating Activities
        'NetCashProvidedByUsedInOperatingActivities': {
            'label': 'Net Cash from Operating Activities',
            'classification': 'operating',
            'sub_category': 'net_operating_cash'
        },
        'DepreciationDepletionAndAmortization': {
            'label': 'Depreciation and Amortization',
            'classification': 'operating',
            'sub_category': 'depreciation'
        },
        'IncreaseDecreaseInAccountsReceivable': {
            'label': 'Change in Accounts Receivable',
            'classification': 'operating',
            'sub_category': 'customer_collections'
        },
        'IncreaseDecreaseInInventories': {
            'label': 'Change in Inventories',
            'classification': 'operating',
            'sub_category': 'inventory_changes'
        },
        
        # Investing Activities
        'PaymentsToAcquirePropertyPlantAndEquipment': {
            'label': 'Capital Expenditures',
            'classification': 'investing',
            'sub_category': 'capital_expenditure'
        },
        'PaymentsToAcquireBusinessesNetOfCashAcquired': {
            'label': 'Business Acquisitions',
            'classification': 'investing',
            'sub_category': 'business_acquisition'
        },
        
        # Financing Activities
        'PaymentsOfDividends': {
            'label': 'Dividends Paid',
            'classification': 'financing',
            'sub_category': 'dividend_payment'
        },
        'PaymentsForRepurchaseOfCommonStock': {
            'label': 'Stock Repurchases',
            'classification': 'financing',
            'sub_category': 'stock_repurchase'
        },
        'ProceedsFromIssuanceOfLongTermDebt': {
            'label': 'Debt Issuance',
            'classification': 'financing',
            'sub_category': 'debt_issuance'
        },
        'RepaymentsOfLongTermDebt': {
            'label': 'Debt Repayment',
            'classification': 'financing',
            'sub_category': 'debt_repayment'
        },
    }
    
    def __init__(self, email: str, company: str):
        self.headers = {
            'User-Agent': f'{company} {email}',
            'Accept-Encoding': 'gzip, deflate'
        }
        self.rate_limit_delay = 0.11  # SEC: 10 requests/second max
        self.cik_cache = {}
    
    def get_cik(self, ticker: str) -> Optional[str]:
        """Get CIK for a ticker using SEC company tickers JSON"""
        if ticker in self.cik_cache:
            return self.cik_cache[ticker]
        
        try:
            time.sleep(self.rate_limit_delay)
            response = requests.get(self.TICKERS_URL, headers=self.headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                for item in data.values():
                    if item['ticker'].upper() == ticker.upper():
                        cik = str(item['cik_str']).zfill(10)
                        self.cik_cache[ticker] = cik
                        logger.info(f"✅ Found CIK for {ticker}: {cik}")
                        return cik
        except Exception as e:
            logger.error(f"❌ Error getting CIK for {ticker}: {e}")
        
        return None
    
    def get_company_cash_flow_data(self, cik: str, ticker: str) -> Dict:
        """
        Get cash flow data for a company using Company Concept API
        
        Returns structured dict ready for V21 format
        """
        logger.info(f"\n🔍 Fetching cash flow data for {ticker} (CIK: {cik})")
        
        all_transactions = []
        company_name = None
        
        for concept, metadata in self.CASH_FLOW_CONCEPTS.items():
            url = f"{self.BASE_URL}/companyconcept/CIK{cik}/us-gaap/{concept}.json"
            
            try:
                time.sleep(self.rate_limit_delay)
                response = requests.get(url, headers=self.headers, timeout=10)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Extract company name from first response
                    if not company_name:
                        company_name = data.get('entityName', ticker)
                    
                    # Get USD values
                    units = data.get('units', {})
                    usd_data = units.get('USD', [])
                    
                    # Filter for 10-K annual filings only
                    for item in usd_data:
                        if item.get('form') == '10-K' and item.get('fp') == 'FY':
                            transaction = {
                                'concept': concept,
                                'transaction_description': metadata['label'],
                                'amount': item['val'],
                                'classification': metadata['classification'],
                                'sub_category': metadata['sub_category'],
                                'fiscal_year': item['fy'],
                                'filing_date': item['filed'],
                                'accession_number': item['accn'],
                                'end_date': item.get('end'),
                                'frame': item.get('frame')
                            }
                            all_transactions.append(transaction)
                            logger.info(f"  ✓ {metadata['label']}: ${item['val']:,}")
                    
                elif response.status_code == 404:
                    logger.warning(f"  ⚠️ Concept not found: {concept}")
                else:
                    logger.error(f"  ❌ HTTP {response.status_code} for {concept}")
                    
            except Exception as e:
                logger.error(f"  ❌ Error fetching {concept}: {e}")
                continue
        
        logger.info(f"✅ Extracted {len(all_transactions)} cash flow line items for {ticker}")
        
        return {
            'ticker': ticker,
            'cik': cik,
            'company_name': company_name or ticker,
            'transactions': all_transactions,
            'data_source': 'SEC Company Concept API',
            'extraction_method': 'xbrl_api'
        }
    
    def download_company_data(self, ticker: str) -> Optional[Dict]:
        """
        Main entry point: Get complete cash flow data for a ticker
        """
        logger.info(f"\n{'='*60}")
        logger.info(f"V24 API Downloader: {ticker}")
        logger.info(f"{'='*60}")
        
        # Get CIK
        cik = self.get_cik(ticker)
        if not cik:
            logger.error(f"❌ Could not find CIK for {ticker}")
            return None
        
        # Get cash flow data via API
        data = self.get_company_cash_flow_data(cik, ticker)
        
        if not data.get('transactions'):
            logger.warning(f"⚠️ No cash flow data found for {ticker}")
            return None
        
        return data

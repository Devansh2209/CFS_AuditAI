"""
V24 Lambda Handler - Single File (No Imports)
SEC Company Concept API extraction
"""
import json
import os
import boto3
import requests
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

# SEC API Downloader - Inlined
class SECV24APIDownloader:
    """Extract cash flow data using SEC Company Concept API"""
    
    BASE_URL = "https://data.sec.gov/api/xbrl"
    TICKERS_URL = "https://www.sec.gov/files/company_tickers.json"
    
    CASH_FLOW_CONCEPTS = {
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
        'PaymentsToAcquirePropertyPlantAndEquipment': {
            'label': 'Capital Expenditures',
            'classification': 'investing',
            'sub_category': 'capital_expenditure'
        },
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
    }
    
    def __init__(self, email, company):
        self.headers = {
            'User-Agent': f'{company} {email}',
            'Accept-Encoding': 'gzip, deflate'
        }
        self.rate_limit_delay = 0.11
        self.cik_cache = {}
    
    def get_cik(self, ticker):
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
                        print(f"✅ Found CIK for {ticker}: {cik}")
                        return cik
        except Exception as e:
            print(f"❌ Error getting CIK for {ticker}: {e}")
        
        return None
    
    def get_company_cash_flow_data(self, cik, ticker):
        print(f"\n🔍 Fetching cash flow data for {ticker} (CIK: {cik})")
        
        all_transactions = []
        company_name = None
        
        for concept, metadata in self.CASH_FLOW_CONCEPTS.items():
            url = f"{self.BASE_URL}/companyconcept/CIK{cik}/us-gaap/{concept}.json"
            
            try:
                time.sleep(self.rate_limit_delay)
                response = requests.get(url, headers=self.headers, timeout=10)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if not company_name:
                        company_name = data.get('entityName', ticker)
                    
                    usd_data = data.get('units', {}).get('USD', [])
                    
                    for item in usd_data:
                        if item.get('form') == '10-K' and item.get('fp') == 'FY':
                            transaction = {
                                'concept': str(concept),
                                'transaction_description': str(metadata['label']),
                                'amount': float(item['val']),
                                'classification': str(metadata['classification']),
                                'sub_category': str(metadata['sub_category']),
                                'fiscal_year': int(item['fy']),
                                'filing_date': str(item['filed']),
                                'accession_number': str(item['accn'])
                            }
                            all_transactions.append(transaction)
                            print(f"  ✓ {metadata['label']}: ${item['val']:,}")
                    
            except Exception as e:
                print(f"  ⚠️ Error fetching {concept}: {e}")
                continue
        
        print(f"✅ Extracted {len(all_transactions)} line items for {ticker}")
        
        return {
            'ticker': ticker,
            'cik': cik,
            'company_name': company_name or ticker,
            'transactions': all_transactions,
            'data_source': 'SEC Company Concept API'
        }
    
    def download_company_data(self, ticker):
        print(f"\n{'='*60}")
        print(f"V24 API: {ticker}")
        print(f"{'='*60}")
        
        cik = self.get_cik(ticker)
        if not cik:
            print(f"❌ Could not find CIK for {ticker}")
            return None
        
        data = self.get_company_cash_flow_data(cik, ticker)
        
        if not data.get('transactions'):
            print(f"⚠️ No cash flow data found for {ticker}")
            return None
        
        return data

# Lambda Handler
def lambda_handler(event, context):
    """V24: Direct SEC API extraction"""
    print("=" * 70)
    print("🚀 V24 SEC API Downloader - Direct XBRL Extraction")
    print("=" * 70)
    
    tickers = event.get('tickers', [])
    processed_bucket = os.getenv('S3_BUCKET_NAME')  # Match Lambda env var
    email = os.getenv('SEC_EDGAR_EMAIL', 'admin@example.com')
    company = os.getenv('SEC_EDGAR_COMPANY', 'CashflowAI')
    
    print(f"📊 Processing {len(tickers)} tickers via SEC API...")
    
    downloader = SECV24APIDownloader(email=email, company=company)
    s3 = boto3.client('s3')
    
    results = {}
    all_company_data = []
    
    def process_ticker(ticker):
        print(f"\n[V24] Processing {ticker}...")
        try:
            data = downloader.download_company_data(ticker)
            if data and data.get('transactions'):
                s3_key = f"v24-api-data/{ticker}_cash_flow.json"
                s3.put_object(
                    Bucket=processed_bucket,
                    Key=s3_key,
                    Body=json.dumps(data, indent=2),
                    ContentType='application/json'
                )
                print(f"✅ Saved {ticker} to S3: {s3_key}")
                return (ticker, 'success', data)
            else:
                return (ticker, 'no_data', None)
        except Exception as e:
            print(f"❌ Error: {ticker}: {str(e)}")
            return (ticker, 'error', None)
    
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(process_ticker, ticker) for ticker in tickers]
        for future in as_completed(futures):
            ticker, status, data = future.result()
            results[ticker] = status
            if data:
                all_company_data.append(data)
    
    if all_company_data:
        summary_key = "v24-api-data/all_companies_summary.json"
        s3.put_object(
            Bucket=processed_bucket,
            Key=summary_key,
            Body=json.dumps({
                'total_companies': len(all_company_data),
                'companies': all_company_data
            }, indent=2)
        )
        print(f"\n✅ Saved summary: {summary_key}")
    
    success_count = sum(1 for s in results.values() if s == 'success')
    
    print(f"\n{'='*70}")
    print(f"✅ V24 Complete: {success_count}/{len(tickers)} successful")
    print(f"{'='*70}")
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'version': 'V24',
            'successful': success_count,
            'results': results
        })
    }

"""
V24 Lambda Handler: SEC API-based cash flow extraction
No file downloads - direct API to S3
"""
import json
import os
import boto3
from sec_api_downloader_v24 import SECV24APIDownloader
from concurrent.futures import ThreadPoolExecutor, as_completed

def lambda_handler(event, context):
    """
    V24: Direct SEC API extraction - no file downloads
    """
    print("=" * 70)
    print("🚀 V24 SEC API Downloader - Direct XBRL Extraction")
    print("=" * 70)
    
    tickers = event.get('tickers', [])
    processed_bucket = os.getenv('PROCESSED_BUCKET_NAME')
    email = os.getenv('SEC_EDGAR_EMAIL', 'admin@example.com')
    company = os.getenv('SEC_EDGAR_COMPANY', 'CashflowAI')
    
    print(f"📊 Processing {len(tickers)} tickers via SEC API...")
    
    # Create V24 downloader
    downloader = SECV24APIDownloader(email=email, company=company)
    s3 = boto3.client('s3')
    
    # Download and process in parallel
    results = {}
    all_company_data = []
    
    def process_ticker(ticker):
        print(f"\n[V24] Processing {ticker}...")
        try:
            data = downloader.download_company_data(ticker)
            if data and data.get('transactions'):
                # Save individual company data to S3
                s3_key = f"v24-api-data/{ticker}_cash_flow.json"
                s3.put_object(
                    Bucket=processed_bucket,
                    Key=s3_key,
                    Body=json.dumps(data, indent=2),
                    ContentType='application/json'
                )
                print(f"✅ Saved {ticker} data to S3: {s3_key}")
                return (ticker, 'success', data)
            else:
                print(f"⚠️ No data for {ticker}")
                return (ticker, 'no_data', None)
        except Exception as e:
            print(f"❌ Error processing {ticker}: {str(e)}")
            return (ticker, 'error', None)
    
    # Use thread pool
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(process_ticker, ticker) for ticker in tickers]
        for future in as_completed(futures):
            ticker, status, data = future.result()
            results[ticker] = status
            if data:
                all_company_data.append(data)
    
    # Save aggregated results
    if all_company_data:
        summary_key = "v24-api-data/all_companies_summary.json"
        s3.put_object(
            Bucket=processed_bucket,
            Key=summary_key,
            Body=json.dumps({
                'total_companies': len(all_company_data),
                'companies': all_company_data
            }, indent=2),
            ContentType='application/json'
        )
        print(f"\n✅ Saved aggregated data: {summary_key}")
    
    success_count = sum(1 for s in results.values() if s == 'success')
    
    print(f"\n{'='*70}")
    print(f"✅ V24 Complete: {success_count}/{len(tickers)} successful")
    print(f"{'='*70}")
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'version': 'V24',
            'method': 'SEC Company Concept API',
            'total': len(tickers),
            'successful': success_count,
            'results': results
        })
    }

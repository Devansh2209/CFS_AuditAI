import json
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from sec_downloader import SECDownloaderV22

def lambda_handler(event, context):
    """
    V22: Lambda handler using new complete filing downloader
    """
    print("🚀 Starting SEC Downloader Lambda (V22)...")
    
    tickers = event.get('tickers', [])
    filing_type = event.get('filing_type', '10-K')
    limit = event.get('limit', 1)
    after_date = event.get('after_date', None)
    
    raw_bucket = os.getenv('RAW_BUCKET_NAME')
    email = os.getenv('SEC_EDGAR_EMAIL', 'admin@example.com')
    company = os.getenv('SEC_EDGAR_COMPANY', 'CashflowAI')
    
    print(f"📥 Downloading {filing_type} filings for {len(tickers)} tickers in parallel...")
    
    # Create V22 downloader
    downloader = SECDownloaderV22(
        email=email,
        company=company,
        s3_bucket=raw_bucket
    )
    
    # Download in parallel
    results = {}
    
    def download_ticker(ticker):
        print(f"[Thread] Downloading {ticker}...")
        try:
            count = downloader.download_filings(
                ticker=ticker,
                filing_type=filing_type,
                limit=limit,
                after_date=after_date
            )
            return (ticker, count)
        except Exception as e:
            print(f"❌ Error downloading {ticker}: {str(e)}")
            return (ticker, 0)
    
    # Use thread pool for parallel downloads (respect SEC rate limits per thread)
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(download_ticker, ticker) for ticker in tickers]
        for future in as_completed(futures):
            ticker, count = future.result()
            results[ticker] = count
    
    success_count = sum(1 for c in results.values() if c > 0)
    print(f"✅ Completed: {success_count}/{len(tickers)} successful downloads")
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'message': f'Downloaded filings for {success_count}/{len(tickers)} tickers',
            'results': results
        })
    }

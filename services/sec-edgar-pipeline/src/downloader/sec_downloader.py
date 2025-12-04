import os
import time
import re
import requests
from typing import List, Optional, Dict
import boto3
from botocore.exceptions import ClientError
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SECDownloaderV22:
    """
    V22: Direct SEC EDGAR API downloader for complete primary documents
    Replaces sec-edgar-downloader to get full HTML filings instead of truncated submissions
    """
    
    BASE_URL = "https://www.sec.gov"
    COMPANY_SEARCH_URL = "https://www.sec.gov/cgi-bin/browse-edgar"
    
    def __init__(self, email: str, company: str, download_dir: str = "/tmp/sec-filings", s3_bucket: Optional[str] = None):
        self.email = email
        self.company_name = company
        self.download_dir = download_dir
        self.s3_bucket = s3_bucket
        
        self.headers = {
            'User-Agent': f'{company} {email}',
            'Accept-Encoding': 'gzip, deflate',
            'Host': 'www.sec.gov'
        }
        
        # SEC rate limit: 10 requests/second
        self.rate_limit_delay = 0.11
        
        if self.s3_bucket:
            self.s3_client = boto3.client('s3')
    
    def get_company_cik(self, ticker: str) -> Optional[str]:
        """Get CIK number for a ticker symbol"""
        # SEC company tickers JSON (updated daily)
        tickers_url = "https://www.sec.gov/files/company_tickers.json"
        
        try:
            time.sleep(self.rate_limit_delay)
            response = requests.get(tickers_url, headers=self.headers)
            if response.status_code == 200:
                data = response.json()
                # Search for ticker
                for item in data.values():
                    if item['ticker'].upper() == ticker.upper():
                        cik = str(item['cik_str']).zfill(10)
                        logger.info(f"Found CIK for {ticker}: {cik}")
                        return cik
        except Exception as e:
            logger.error(f"Failed to get CIK for {ticker}: {e}")
        
        return None
    
    def get_recent_filings(self, cik: str, filing_type: str = "10-K", count: int = 1) -> List[Dict]:
        """Get recent filing metadata"""
        # SEC Company filings JSON endpoint
        filings_url = f"https://data.sec.gov/submissions/CIK{cik}.json"
        
        try:
            time.sleep(self.rate_limit_delay)
            response = requests.get(filings_url, headers=self.headers)
            if response.status_code == 200:
                data = response.json()
                filings = data['filings']['recent']
                
                # Filter for filing type (10-K only, exclude amendments)
                results = []
                for i in range(len(filings['form'])):
                    form = filings['form'][i]
                    if form == filing_type:  # Exact match, excludes 10-K/A
                        results.append({
                            'accession_number': filings['accessionNumber'][i],
                            'filing_date': filings['filingDate'][i],
                            'primary_document': filings['primaryDocument'][i],
                            'primary_doc_description': filings['primaryDocDescription'][i]
                        })
                        
                        if len(results) >= count:
                            break
                
                return results[:count]
        except Exception as e:
            logger.error(f"Failed to get filings for CIK {cik}: {e}")
        
        return []
    
    def download_primary_document(self, cik: str, accession: str, primary_doc: str, ticker: str) -> Optional[str]:
        """Download the complete primary document HTML"""
        # Remove dashes from accession number for URL
        accession_no_dash = accession.replace('-', '')
        
        # Construct URL to primary document
        doc_url = f"{self.BASE_URL}/Archives/edgar/data/{cik}/{accession_no_dash}/{primary_doc}"
        
        logger.info(f"Downloading primary document: {doc_url}")
        
        try:
            time.sleep(self.rate_limit_delay)
            response = requests.get(doc_url, headers=self.headers)
            
            if response.status_code == 200:
                content = response.text
                logger.info(f"✅ Downloaded {len(content)} bytes for {ticker}")
                
                # Save locally
                os.makedirs(self.download_dir, exist_ok=True)
                local_path = os.path.join(self.download_dir, f"{ticker}_{accession}_{primary_doc}")
                
                with open(local_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                return content
            else:
                logger.error(f"Failed to download: HTTP {response.status_code}")
                
        except Exception as e:
            logger.error(f"Error downloading {doc_url}: {e}")
        
        return None
    
    def download_filings(self, ticker: str, filing_type: str = "10-K", limit: int = 1, after_date: Optional[str] = None):
        """
        V22: Download complete primary document HTML filings
        
        Returns: number of filings successfully downloaded
        """
        print(f"\n📥 V22 Downloader: {ticker} ({filing_type}, limit={limit})")
        
        # Get CIK
        cik = self.get_company_cik(ticker)
        if not cik:
            print(f"❌ Could not find CIK for {ticker}")
            return 0
        
        # Get recent filings
        filings = self.get_recent_filings(cik, filing_type, limit)
        if not filings:
            print(f"❌ No {filing_type} filings found for {ticker}")
            return 0
        
        print(f"Found {len(filings)} {filing_type} filing(s) for {ticker}")
        
        # Download each filing
        count = 0
        for filing in filings:
            accession = filing['accession_number']
            primary_doc = filing['primary_document']
            filing_date = filing['filing_date']
            
            # Check date filter
            if after_date and filing_date < after_date:
                continue
            
            print(f"  📄 Filing: {accession} ({filing_date})")
            print(f"     Primary doc: {primary_doc}")
            
            # Download primary document
            content = self.download_primary_document(cik, accession, primary_doc, ticker)
            
            if content:
                # Upload to S3
                if self.s3_bucket:
                    self._upload_to_s3(ticker, accession, primary_doc, content)
                count += 1
        
        print(f"✅ Successfully downloaded {count} filing(s) for {ticker}")
        return count
    
    def _upload_to_s3(self, ticker: str, accession: str, filename: str, content: str):
        """Upload complete HTML filing to S3"""
        # Use consistent path structure: raw-filings/TICKER/10-K/ACCESSION/filename
        s3_key = f"raw-filings/sec-edgar-filings/{ticker}/10-K/{accession}/{filename}"
        
        try:
            self.s3_client.put_object(
                Bucket=self.s3_bucket,
                Key=s3_key,
                Body=content.encode('utf-8'),
                ContentType='text/html'
            )
            logger.info(f"   Uploaded to s3://{self.s3_bucket}/{s3_key}")
        except ClientError as e:
            logger.error(f"   ❌ S3 Upload Failed: {e}")

if __name__ == "__main__":
    # Test with Apple
    downloader = SECDownloaderV22(
        email="admin@example.com",
        company="TestCompany"
    )
    downloader.download_filings("AAPL", "10-K", limit=1)

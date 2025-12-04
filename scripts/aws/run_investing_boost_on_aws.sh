#!/bin/bash
# run_investing_boost_on_aws.sh
# Run this on EC2 to download targeted 10-Ks and extract Investing transactions

set -e

echo "================================================================"
echo "V30 Investing Boost - AWS EC2"
echo "================================================================"

# Install dependencies
echo "Installing dependencies..."
pip3 install boto3 pandas sec-edgar-downloader --quiet

# Cleanup previous run artifacts
echo "Cleaning up disk space..."
rm -rf sec-edgar-filings temp_processing_10k.txt

# Download the ticker list and extraction script
echo "Downloading resources..."
aws s3 cp s3://finbert-v28-data/scripts/investing_tickers.csv .
aws s3 cp s3://finbert-v28-data/scripts/extract_v30_balanced.py .

# Create a Python script to download and process targeted filings
cat << 'EOF' > process_targeted_tickers.py
import csv
import boto3
import os
import shutil
import random
from pathlib import Path
from sec_edgar_downloader import Downloader
from extract_v30_balanced import extract_from_10k

s3_client = boto3.client('s3')
dl = Downloader("MyCompany", "email@example.com")

TARGET_COUNT = 20000

def process_tickers():
    # Read tickers
    tickers = []
    with open('investing_tickers.csv', 'r') as f:
        reader = csv.reader(f)
        next(reader) # Skip header
        for row in reader:
            if row:
                tickers.append(row[0])
    
    # Shuffle to avoid sector bias if we stop early
    random.shuffle(tickers)
    print(f"Loaded {len(tickers)} targeted tickers. Target: {TARGET_COUNT} transactions.")
    
    # Output CSV
    output_csv = 'v30_investing_boost.csv'
    fieldnames = ['sentence', 'cash_flow_category', 'data_source', 'ticker', 'complexity_level']
    
    # Check if file exists to resume count
    total_extracted = 0
    if Path(output_csv).exists():
        with open(output_csv, 'r', encoding='utf-8') as f:
            total_extracted = sum(1 for line in f) - 1 # Subtract header
            if total_extracted < 0: total_extracted = 0
    
    print(f"Starting with {total_extracted} existing transactions.")
    
    # Open in append mode
    file_exists = Path(output_csv).exists()
    
    with open(output_csv, 'a', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        if not file_exists:
            writer.writeheader()
        
        for i, ticker in enumerate(tickers, 1):
            if total_extracted >= TARGET_COUNT:
                print(f"\nSUCCESS! Reached target of {TARGET_COUNT} transactions!")
                break
                
            print(f"[{i}/{len(tickers)}] Processing {ticker}... (Total: {total_extracted})")
            
            try:
                # Download 10-K (limit 5 recent filings)
                dl.get("10-K", ticker, limit=5, download_details=False)
                
                # Find the downloaded file
                download_dir = Path("sec-edgar-filings") / ticker / "10-K"
                if not download_dir.exists():
                    print(f"  No 10-K found for {ticker}")
                    continue
                    
                # Process the text file
                ticker_count = 0
                for file_path in download_dir.rglob("*.txt"):
                    # Extract
                    result = extract_from_10k(str(file_path), ticker)
                    
                    # Write ONLY Investing transactions
                    for category in ['investing']:
                        for record in result[category]:
                            writer.writerow(record)
                            total_extracted += 1
                            ticker_count += 1
                            
                print(f"  Extracted {ticker_count} investing transactions")
                f.flush() # Ensure data is written
                
                # Cleanup immediately to save space
                if download_dir.parent.exists():
                    shutil.rmtree(download_dir.parent)
                
            except Exception as e:
                print(f"  Error processing {ticker}: {e}")
                
    print(f"\nFinal Total Investing transactions: {total_extracted}")

if __name__ == '__main__':
    process_tickers()
EOF

# Run the processing script
echo "Starting targeted extraction..."
python3 process_targeted_tickers.py

# Upload result to S3
echo "Uploading results to S3..."
aws s3 cp v30_investing_boost.csv s3://finbert-v28-data/training-data/v30_real/v30_investing_boost.csv

echo "================================================================"
echo "BOOST COMPLETE! Check s3://finbert-v28-data/training-data/v30_real/"
echo "================================================================"

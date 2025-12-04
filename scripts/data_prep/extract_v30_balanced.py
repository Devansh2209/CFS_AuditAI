#!/usr/bin/env python3
"""
V30 Balanced Data Extraction Script
Extracts Operating, Investing, and Financing transactions separately from 10-K Cash Flow Statements
"""

import boto3
import csv
import re
import sys
from pathlib import Path
from typing import List, Dict, Tuple
import argparse

# Category-specific keywords for validation
CATEGORY_KEYWORDS = {
    'operating': [
        'net income', 'net loss', 'depreciation', 'amortization', 
        'accounts receivable', 'inventory', 'accounts payable',
        'deferred taxes', 'stock-based compensation', 'working capital',
        'prepaid expenses', 'accrued liabilities', 'operating activities'
    ],
    'investing': [
        'capital expenditures', 'capex', 'purchase of property', 
        'sale of property', 'acquisition', 'divestiture',
        'marketable securities', 'purchase of equipment', 'sale of equipment',
        'business combination', 'equity method', 'investing activities',
        'purchase of investments', 'sale of investments'
    ],
    'financing': [
        'issuance of debt', 'repayment of debt', 'dividends', 
        'issuance of common stock', 'issuance of preferred stock',
        'repurchase of common stock', 'treasury stock', 'share repurchase',
        'credit facility', 'borrowings', 'principal payments',
        'term loan', 'revolving credit', 'debt issuance costs',
        'distributions to', 'contributions from', 'financing activities'
    ]
}

# Section markers in 10-K filings
SECTION_MARKERS = {
    'operating': [
        'cash flows from operating activities',
        'net cash provided by operating activities',
        'net cash used in operating activities',
        'operating activities:'
    ],
    'investing': [
        'cash flows from investing activities',
        'net cash provided by investing activities',
        'net cash used in investing activities',
        'investing activities:'
    ],
    'financing': [
        'cash flows from financing activities',
        'net cash provided by financing activities',
        'net cash used in financing activities',
        'financing activities:'
    ]
}

s3_client = boto3.client('s3')

def clean_text(text: str) -> str:
    """Remove XBRL debris and normalize text"""
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', ' ', text)
    
    # Remove XBRL patterns
    text = re.sub(r'us-gaap_[A-Za-z0-9_]+', '', text)
    text = re.sub(r'label[A-Za-z0-9_:\.]+', '', text)
    text = re.sub(r'documentation[A-Za-z0-9_:\.]+', '', text)
    text = re.sub(r'xbrltype[A-Za-z0-9_:\.]+', '', text)
    
    # Remove table artifacts
    text = re.sub(r'F-\d+', '', text)
    text = re.sub(r'Page \d+', '', text)
    
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text)
    
    return text.strip()

def find_section_boundaries(filing_text: str) -> Dict[str, Tuple[int, int]]:
    """Find the start and end positions of each Cash Flow section"""
    filing_lower = filing_text.lower()
    boundaries = {}
    
    for category, markers in SECTION_MARKERS.items():
        start_pos = -1
        
        # Find section start
        for marker in markers:
            pos = filing_lower.find(marker)
            if pos != -1:
                start_pos = pos
                break
        
        if start_pos != -1:
            # Find section end (next section or significant gap)
            end_pos = len(filing_text)
            
            # Check for next section
            for other_category in ['operating', 'investing', 'financing']:
                if other_category == category:
                    continue
                for marker in SECTION_MARKERS[other_category]:
                    next_pos = filing_lower.find(marker, start_pos + 100)
                    if next_pos != -1 and next_pos < end_pos:
                        end_pos = next_pos
            
            boundaries[category] = (start_pos, end_pos)
    
    return boundaries

def extract_transactions_from_section(section_text: str, category: str) -> List[str]:
    """Extract transaction sentences from a specific section"""
    transactions = []
    
    # Clean the section text
    cleaned = clean_text(section_text)
    
    # Split into sentences
    sentences = re.split(r'[.;](?=\s+[A-Z])', cleaned)
    
    for sentence in sentences:
        sentence = sentence.strip()
        
        # Filter by length
        if len(sentence) < 30 or len(sentence) > 500:
            continue
        
        # Must contain a number (dollar amount or percentage)
        if not re.search(r'\d', sentence):
            continue
        
        # Filter garbage
        if re.search(r'(table|header|page|see note|f-\d+)', sentence, re.I):
            continue
        
        # Validate with category keywords
        sentence_lower = sentence.lower()
        has_keyword = any(kw in sentence_lower for kw in CATEGORY_KEYWORDS[category])
        
        if has_keyword:
            transactions.append(sentence)
    
    return transactions

def extract_from_10k(file_path: str, ticker: str = "UNKNOWN") -> Dict[str, List[Dict]]:
    """Extract categorized transactions from a single 10-K filing"""
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            filing_text = f.read()
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return {'operating': [], 'investing': [], 'financing': []}
    
    # Find section boundaries
    boundaries = find_section_boundaries(filing_text)
    
    result = {'operating': [], 'investing': [], 'financing': []}
    
    for category, (start, end) in boundaries.items():
        section_text = filing_text[start:end]
        transactions = extract_transactions_from_section(section_text, category)
        
        # Create records
        for txn in transactions:
            result[category].append({
                'sentence': txn,
                'cash_flow_category': category,
                'data_source': 'Real_10K_CFS_Section',
                'ticker': ticker,
                'complexity_level': 'medium'
            })
    
    return result

def process_bucket_stream(bucket: str, prefix: str, output_csv: str, limit: int = None):
    """Process files from S3 one by one (stream-like) to save disk space"""
    print(f"Starting stream processing from s3://{bucket}/{prefix}...")
    
    # Initialize CSV
    Path(output_csv).parent.mkdir(parents=True, exist_ok=True)
    file_exists = Path(output_csv).exists()
    
    fieldnames = ['sentence', 'cash_flow_category', 'data_source', 'ticker', 'complexity_level']
    
    # Open CSV in append mode if it exists, else write mode
    mode = 'a' if file_exists else 'w'
    
    with open(output_csv, mode, newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        if not file_exists:
            writer.writeheader()
            
        paginator = s3_client.get_paginator('list_objects_v2')
        pages = paginator.paginate(Bucket=bucket, Prefix=prefix)
        
        processed_count = 0
        total_transactions = {'operating': 0, 'investing': 0, 'financing': 0}
        
        temp_file = Path('temp_processing_10k.txt')
        
        try:
            for page in pages:
                if 'Contents' not in page:
                    continue
                
                for obj in page['Contents']:
                    if limit and processed_count >= limit:
                        break
                        
                    key = obj['Key']
                    if not key.endswith('.txt'):
                        continue
                    
                    processed_count += 1
                    ticker = Path(key).name.split('_')[0] if '_' in key else "UNKNOWN"
                    
                    print(f"[{processed_count}] Processing {ticker} ({key})...")
                    
                    try:
                        # Download single file
                        s3_client.download_file(bucket, key, str(temp_file))
                        
                        # Extract
                        result = extract_from_10k(str(temp_file), ticker)
                        
                        # Write immediately to CSV
                        for category in ['operating', 'investing', 'financing']:
                            for record in result[category]:
                                writer.writerow(record)
                                total_transactions[category] += 1
                        
                        # Delete file immediately
                        if temp_file.exists():
                            temp_file.unlink()
                            
                    except Exception as e:
                        print(f"Error processing {key}: {e}")
                        if temp_file.exists():
                            temp_file.unlink()
                
                if limit and processed_count >= limit:
                    break
                    
        finally:
            if temp_file.exists():
                temp_file.unlink()

    print("\n" + "="*80)
    print(f"STREAM PROCESSING COMPLETE for {prefix}")
    print("="*80)
    for cat, count in total_transactions.items():
        print(f"{cat.capitalize()}: {count:,} transactions")

def main():
    parser = argparse.ArgumentParser(description='Extract balanced V30 dataset (Stream Mode)')
    parser.add_argument('--bucket', default='finbert-v28-data', help='S3 bucket')
    parser.add_argument('--input-prefix', default='raw-10k', help='Input S3 prefix')
    parser.add_argument('--local-dir', default='v30_data/raw_10k', help='Ignored in stream mode')
    parser.add_argument('--output-csv', default='v30_data/v30_extracted_by_category.csv', help='Output CSV file')
    parser.add_argument('--limit', type=int, default=None, help='Limit number of files to process')
    
    args = parser.parse_args()
    
    print("="*80)
    print("V30 Balanced Dataset Extraction (Stream Mode)")
    print("="*80)
    
    process_bucket_stream(args.bucket, args.input_prefix, args.output_csv, args.limit)

if __name__ == '__main__':
    main()

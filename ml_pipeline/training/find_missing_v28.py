import json
import boto3
from pathlib import Path

def find_missing_tickers():
    """
    Compare v28_1500_companies.json with S3 bucket to find missing tickers
    """
    print("🔍 Finding missing tickers...")
    
    # 1. Load the original 1,500 tickers
    with open('v28_1500_companies.json', 'r') as f:
        data = json.load(f)
        all_tickers = set(data['tickers'])
    
    print(f"   Original list: {len(all_tickers)} tickers")
    
    # 2. Get extracted tickers from S3
    s3 = boto3.client('s3', region_name='ca-central-1')
    bucket = 'sec-edgar-raw-filings-028061991824'
    prefix = 'v24-api-data/'
    
    extracted_tickers = set()
    paginator = s3.get_paginator('list_objects_v2')
    
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        if 'Contents' not in page:
            continue
        for obj in page['Contents']:
            key = obj['Key']
            if key.endswith('_cash_flow.json') and key != prefix + 'all_companies_summary.json':
                # Extract ticker from filename: "AAPL_cash_flow.json" -> "AAPL"
                ticker = key.replace(prefix, '').replace('_cash_flow.json', '')
                extracted_tickers.add(ticker)
    
    print(f"   Extracted: {len(extracted_tickers)} tickers")
    
    # 3. Find missing
    missing_tickers = all_tickers - extracted_tickers
    print(f"   Missing: {len(missing_tickers)} tickers")
    
    return sorted(list(missing_tickers))

def create_batch_files(missing_tickers, batch_size=300):
    """
    Split missing tickers into batches (Lambda can handle ~300 companies in 15 mins)
    """
    print(f"\n📦 Creating batch files (batch size: {batch_size})...")
    
    batches = []
    for i in range(0, len(missing_tickers), batch_size):
        batch = missing_tickers[i:i+batch_size]
        batches.append(batch)
    
    print(f"   Total batches: {len(batches)}")
    
    # Save batch files
    batch_files = []
    for idx, batch in enumerate(batches, 1):
        filename = f'v28_batch_{idx}.json'
        payload = {
            "tickers": batch,
            "filing_type": "10-K",
            "limit": 1
        }
        
        with open(filename, 'w') as f:
            json.dump(payload, f, indent=2)
        
        batch_files.append(filename)
        print(f"   Batch {idx}: {len(batch)} tickers -> {filename}")
    
    return batch_files

def generate_invoke_commands(batch_files):
    """
    Generate AWS CLI commands to invoke Lambda for each batch
    """
    print(f"\n🚀 Lambda invocation commands:")
    print("=" * 60)
    
    for idx, batch_file in enumerate(batch_files, 1):
        abs_path = Path(batch_file).absolute()
        cmd = f"""
# Batch {idx}
aws lambda invoke \\
  --function-name sec-downloader \\
  --cli-binary-format raw-in-base64-out \\
  --payload file://{abs_path} \\
  /tmp/v28_batch_{idx}_result.json \\
  --region ca-central-1
"""
        print(cmd)
    
    print("=" * 60)
    print(f"\n💡 Run these commands sequentially (wait ~15 mins between each)")
    print(f"   Or run them in parallel in separate terminals")

if __name__ == "__main__":
    # 1. Find missing tickers
    missing = find_missing_tickers()
    
    if not missing:
        print("\n✅ All tickers extracted! No missing companies.")
    else:
        # 2. Create batch files
        batch_files = create_batch_files(missing, batch_size=300)
        
        # 3. Generate commands
        generate_invoke_commands(batch_files)
        
        print(f"\n📊 Summary:")
        print(f"   Missing tickers: {len(missing)}")
        print(f"   Batches created: {len(batch_files)}")
        print(f"   Estimated time: {len(batch_files) * 15} minutes")
        print(f"   Estimated cost: ${len(batch_files) * 3:.2f}")

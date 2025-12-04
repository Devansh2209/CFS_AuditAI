#!/bin/bash
# run_v30_extraction_on_aws.sh
# Run this script on your AWS EC2 instance to extract V30 dataset

set -e

echo "================================================================"
echo "V30 Real Transaction Extraction - AWS EC2"
echo "================================================================"

# Install dependencies
echo "Installing dependencies..."
pip3 install boto3 pandas --quiet

# Cleanup previous run artifacts to free space
echo "Cleaning up disk space..."
rm -rf v30_data *.txt raw-10k raw-10k-v29

# Download the extraction script from S3
echo "Downloading extraction script..."
aws s3 cp s3://finbert-v28-data/scripts/extract_v30_balanced.py .

# Run extraction on all raw 10-K filings
echo "Starting extraction from 1,748 raw 10-K filings..."
echo "This will take 2-3 hours..."

python3 extract_v30_balanced.py \
  --bucket finbert-v28-data \
  --input-prefix raw-10k \
  --output-csv v30_extracted_all.csv

# Also extract from V29 filings
echo "Extracting from V29 filings..."
python3 extract_v30_balanced.py \
  --bucket finbert-v28-data \
  --input-prefix raw-10k-v29 \
  --output-csv v30_extracted_v29.csv

# Combine both outputs
echo "Combining extractions..."
python3 << 'EOF'
import pandas as pd

df1 = pd.read_csv('v30_extracted_all.csv')
df2 = pd.read_csv('v30_extracted_v29.csv')

combined = pd.concat([df1, df2], ignore_index=True)

# Remove duplicates
combined.drop_duplicates(subset=['sentence'], inplace=True)

# Save
combined.to_csv('v30_all_extracted.csv', index=False)

# Report counts
counts = combined['cash_flow_category'].value_counts()
print("\n" + "="*60)
print("EXTRACTION COMPLETE")
print("="*60)
for category, count in counts.items():
    print(f"{category.capitalize()}: {count:,} unique transactions")

print(f"\nTotal: {len(combined):,} unique transactions")
EOF

# Upload to S3
echo "Uploading to S3..."
aws s3 cp v30_all_extracted.csv s3://finbert-v28-data/training-data/v30_real/v30_all_extracted.csv

echo "================================================================"
echo "COMPLETE! Check s3://finbert-v28-data/training-data/v30_real/"
echo "================================================================"

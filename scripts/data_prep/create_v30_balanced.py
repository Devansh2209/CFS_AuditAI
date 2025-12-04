#!/usr/bin/env python3
"""
Create Balanced V30 Dataset
Takes existing V28+V29 extractions and creates a perfectly balanced dataset
Target: 10,000 transactions per category (30,000 total)
"""

import csv
import random
import sys
from pathlib import Path
from collections import defaultdict

# Target count per category
TARGET_PER_CATEGORY = 10000

def load_csv_by_category(file_path):
    """Load CSV and group by category"""
    category_data = defaultdict(list)
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            csv.field_size_limit(sys.maxsize)
            reader = csv.DictReader(f)
            
            for row in reader:
                category = row.get('cash_flow_category', '').lower()
                if category in ['operating', 'investing', 'financing']:
                    category_data[category].append(row)
    
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
    
    return category_data

def balance_dataset(category_data, target_count):
    """Balance dataset to target count per category"""
    balanced = []
    
    for category in ['operating', 'investing', 'financing']:
        transactions = category_data[category]
        current_count = len(transactions)
        
        print(f"\n{category.capitalize()}:")
        print(f"  Current: {current_count:,} transactions")
        
        if current_count >= target_count:
            # Downsample
            print(f"  Action: Downsample to {target_count:,}")
            sampled = random.sample(transactions, target_count)
            balanced.extend(sampled)
        else:
            # Upsample (this dataset already has this category, just repeat)
            print(f"  Action: Upsample to {target_count:,} (WARNING: May need more raw data)")
            
            # For now, use what we have and warn
            balanced.extend(transactions)
            remaining = target_count - current_count
            
            if remaining > 0:
                # Repeat existing transactions to fill gap
                repeats_needed = (remaining // current_count) + 1
                extended = transactions * repeats_needed
                balanced.extend(extended[:remaining])
    
    # Shuffle to mix categories
    random.shuffle(balanced)
    
    return balanced

def main():
    print("="*80)
    print("V30 Balanced Dataset Creator")
    print("="*80)
    
    # Load V28 and V29 data
    print("\nLoading V28 extracted data...")
    v28_data = load_csv_by_category('v30_data/v28_extracted.csv')
    
    print("Loading V29 extracted data...")
    v29_data = load_csv_by_category('v30_data/v29_extracted.csv')
    
    # Combine datasets
    combined_data = defaultdict(list)
    for category in ['operating', 'investing', 'financing']:
        combined_data[category] = v28_data[category] + v29_data[category]
    
    # Print current distribution
    print("\n" + "="*80)
    print("CURRENT DISTRIBUTION")
    print("="*80)
    
    for category in ['operating', 'investing', 'financing']:
        count = len(combined_data[category])
        print(f"{category.capitalize()}: {count:,} transactions")
    
    total = sum(len(combined_data[cat]) for cat in ['operating', 'investing', 'financing'])
    print(f"Total: {total:,}")
    
    # Create balanced dataset
    print("\n" + "="*80)
    print(f"BALANCING TO {TARGET_PER_CATEGORY:,} PER CATEGORY")
    print("="*80)
    
    balanced_data = balance_dataset(combined_data, TARGET_PER_CATEGORY)
    
    # Save to CSV
    output_file = 'v30_data/v30_balanced_master.csv'
    print(f"\nSaving balanced dataset to {output_file}...")
    
    Path(output_file).parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        fieldnames = ['sentence', 'cash_flow_category', 'data_source', 'complexity_level']
        
        # Add any other fields from the first record
        if balanced_data:
            first_record = balanced_data[0]
            for key in first_record.keys():
                if key not in fieldnames:
                    fieldnames.append(key)
        
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction='ignore')
        writer.writeheader()
        
        for record in balanced_data:
            writer.writerow(record)
    
    # Final verification
    print("\n" + "="*80)
    print("VERIFICATION")
    print("="*80)
    
    final_counts = defaultdict(int)
    for record in balanced_data:
        category = record.get('cash_flow_category', '').lower()
        final_counts[category] += 1
    
    for category in ['operating', 'investing', 'financing']:
        count = final_counts[category]
        status = "✅" if count == TARGET_PER_CATEGORY else "⚠️ "
        print(f"{status} {category.capitalize()}: {count:,} transactions")
    
    print(f"\nTotal: {len(balanced_data):,} transactions")
    print(f"\nDataset saved to: {output_file}")
    
    # Upload to S3
    print("\n" + "="*80)
    print("UPLOAD TO S3")
    print("="*80)
    print("\nTo upload to S3, run:")
    print(f"  aws s3 cp {output_file} s3://finbert-v28-data/training-data/v30_balanced/")

if __name__ == '__main__':
    main()

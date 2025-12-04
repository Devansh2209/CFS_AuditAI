#!/usr/bin/env python3
"""
Analyze Distribution of Cash Flow Categories
Analyzes existing V28 and V29 extracted datasets to determine category balance
"""

import csv
import sys
from collections import Counter
from pathlib import Path

def analyze_csv(file_path):
    """Analyze a single CSV file and return category counts"""
    if not Path(file_path).exists():
        print(f"⚠️  File not found: {file_path}")
        return Counter()
    
    category_counter = Counter()
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            # Increase field size limit
            csv.field_size_limit(sys.maxsize)
            
            reader = csv.DictReader(f)
            for row in reader:
                category = row.get('cash_flow_category', '').lower()
                if category in ['operating', 'investing', 'financing']:
                    category_counter[category] += 1
        
        return category_counter
    
    except Exception as e:
        print(f"❌ Error reading {file_path}: {e}")
        return Counter()

def print_distribution(name, counter, total):
    """Print formatted distribution report"""
    print(f"\n{'='*60}")
    print(f"{name} Distribution")
    print(f"{'='*60}")
    
    for category in ['operating', 'investing', 'financing']:
        count = counter[category]
        percentage = (count / total * 100) if total > 0 else 0
        print(f"{category.capitalize():12} {count:>8,} ({percentage:>5.1f}%)")
    
    print(f"{'Total':12} {total:>8,}")

def main():
    print("🔍 Analyzing V28 & V29 Transaction Distribution\n")
    
    # Paths to extracted data
    v28_file = "v30_data/v28_extracted.csv"
    v29_file = "v30_data/v29_extracted.csv"
    
    # Analyze both datasets
    print("Analyzing V28 dataset...")
    v28_counts = analyze_csv(v28_file)
    v28_total = sum(v28_counts.values())
    
    print("Analyzing V29 dataset...")
    v29_counts = analyze_csv(v29_file)
    v29_total = sum(v29_counts.values())
    
    # Combined analysis
    combined_counts = v28_counts + v29_counts
    combined_total = sum(combined_counts.values())
    
    # Print individual reports
    if v28_total > 0:
        print_distribution("V28", v28_counts, v28_total)
    
    if v29_total > 0:
        print_distribution("V29", v29_counts, v29_total)
    
    # Print combined report
    if combined_total > 0:
        print_distribution("COMBINED (V28 + V29)", combined_counts, combined_total)
        
        # Calculate target and gaps
        print(f"\n{'='*60}")
        print("V30 BALANCED DATASET TARGETS")
        print(f"{'='*60}")
        
        max_count = max(combined_counts.values())
        print(f"\n🎯 Target per category: {max_count:,} transactions\n")
        
        for category in ['operating', 'investing', 'financing']:
            count = combined_counts[category]
            gap = max_count - count
            status = "✅ At target" if gap == 0 else f"📈 Need {gap:,} more"
            print(f"{category.capitalize():12} {count:>8,} → {max_count:>8,}  {status}")
        
        # Calculate total target
        total_target = max_count * 3
        print(f"\n{'Total V30':12} {total_target:>8,} (perfectly balanced)")
        
        # Determine strategy
        print(f"\n{'='*60}")
        print("RECOMMENDED STRATEGY")
        print(f"{'='*60}\n")
        
        # Find which category has most/least
        sorted_cats = sorted(combined_counts.items(), key=lambda x: x[1], reverse=True)
        majority_cat, majority_count = sorted_cats[0]
        minority_cat, minority_count = sorted_cats[2]
        
        print(f"📊 Majority Category: {majority_cat.capitalize()} ({majority_count:,})")
        print(f"📊 Minority Category: {minority_cat.capitalize()} ({minority_count:,})")
        
        # Calculate total additional downloads needed
        total_needed = sum(max_count - combined_counts[cat] for cat in ['operating', 'investing', 'financing'])
        
        if total_needed > 0:
            print(f"\n🔄 Strategy: UPSAMPLE underrepresented categories")
            print(f"   Need ~{total_needed:,} additional transactions")
            print(f"   Estimated new 10-Ks to download: {total_needed // 20}-{total_needed // 10}")
            
            # Recommend company types
            if combined_counts['investing'] < max_count:
                print(f"\n   🏢 For Investing: Target tech, manufacturing, real estate companies")
            if combined_counts['financing'] < max_count:
                print(f"\n   💰 For Financing: Target banks, dividend aristocrats, growth companies")
            if combined_counts['operating'] < max_count:
                print(f"\n   ⚙️  For Operating: Target retailers, service companies, industrials")
        else:
            print(f"\n✅ All categories already balanced!")
            print(f"   Strategy: DOWNSAMPLE to {max_count:,} per category")
    
    else:
        print("\n❌ No data found. Please download extracted datasets from S3:")
        print(f"\n   aws s3 cp s3://finbert-v28-data/extracted-prose/extracted_prose.csv {v28_file}")
        print(f"   aws s3 cp s3://finbert-v28-data/extracted-prose-v29/extracted_prose.csv {v29_file}")

if __name__ == "__main__":
    main()

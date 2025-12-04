"""
ECS Fargate entrypoint for SEC data processor
Processes all downloaded SEC filings and creates labeled training data
"""
import os
import sys
from data_processor import DataProcessor

def main():
    """Main entrypoint for ECS processor task"""
    print("=" * 60)
    print("🚀 SEC Data Processor - ECS Fargate")
    print("=" * 60)
    
    # Get bucket names from environment
    raw_bucket = os.getenv('RAW_BUCKET_NAME')
    processed_bucket = os.getenv('PROCESSED_BUCKET_NAME')
    
    print(f"📦 Raw Bucket: {raw_bucket}")
    print(f"📦 Processed Bucket: {processed_bucket}")
    
    if not raw_bucket or not processed_bucket:
        print("❌ ERROR: Missing bucket environment variables")
        sys.exit(1)
    
    try:
        # Initialize processor
        processor = DataProcessor(raw_bucket, processed_bucket)
        
        # Process all filings
        processor.process_filings()
        
        print("=" * 60)
        print("✅ Processing Complete!")
        print("=" * 60)
        sys.exit(0)
        
    except Exception as e:
        print("=" * 60)
        print(f"❌ Processing Failed: {str(e)}")
        print("=" * 60)
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()

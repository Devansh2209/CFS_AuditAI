import json
import os
from data_processor import DataProcessor

def lambda_handler(event, context):
    """
    AWS Lambda Handler for Data Processor.
    """
    print("🚀 Starting Data Processor Lambda...")
    
    raw_bucket = os.getenv("RAW_BUCKET")
    processed_bucket = os.getenv("PROCESSED_BUCKET")
    
    if not raw_bucket or not processed_bucket:
        return {
            "statusCode": 500,
            "body": json.dumps("Missing bucket environment variables.")
        }

    try:
        processor = DataProcessor(raw_bucket, processed_bucket)
        processor.process_filings()
        return {
            "statusCode": 200,
            "body": json.dumps("Processing complete.")
        }
    except Exception as e:
        print(f"❌ Processing failed: {str(e)}")
        return {
            "statusCode": 500,
            "body": json.dumps(f"Error: {str(e)}")
        }

import os
import json
import re
import boto3
import pandas as pd
from io import StringIO
from financial_parser import FinancialParser
from xbrl_parser import XBRLParser, CashFlowTransaction
from enrichment import DataEnricher
from categorization import TransactionCategorizer
from metadata_extractor import MetadataExtractor
from validators import CashFlowValidator
import signal
from typing import List, Dict
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TimeoutException(Exception): pass

def timeout_handler(signum, frame):
    raise TimeoutException("Processing timed out")

class DataProcessor:
    def __init__(self, raw_bucket: str, processed_bucket: str):
        self.s3 = boto3.client('s3')
        self.raw_bucket = raw_bucket
        self.processed_bucket = processed_bucket
        
        # V21: Initialize all processors
        self.html_parser = FinancialParser()
        self.xbrl_parser = XBRLParser()
        self.enricher = DataEnricher()
        self.categorizer = TransactionCategorizer()
        self.metadata_extractor = MetadataExtractor()
        self.validator = CashFlowValidator()
        
        # Track processing metrics
        self.processing_log = []
        self.company_metadata = []
        self.cash_flow_statements = []

    def process_filings(self):
        """V21 Enhanced ETL: Comprehensive format with validation"""
        print("=" * 70)
        print("🚀 SEC Data Processor V21 - Comprehensive Format Edition")
        print("=" * 70)
        print(f"📦 Raw Bucket: {self.raw_bucket}")
        print(f"📦 Processed Bucket: {self.processed_bucket}")
        print()
        
        all_transactions = []
        
        # List all files in raw bucket
        paginator = self.s3.get_paginator('list_objects_v2')
        pages = paginator.paginate(Bucket=self.raw_bucket, Prefix='raw-filings/')
        
        file_count = 0
        for page in pages:
            if 'Contents' not in page:
                continue
                
            for obj in page['Contents']:
                key = obj['Key']
                if not (key.endswith('.html') or key.endswith('.txt')):
                    continue
                
                file_count += 1
                logger.info(f"\n📄 Processing ({file_count}): {key}")
                
                # Extract ticker from path (e.g., raw-filings/sec-edgar-filings/AAPL/10-K/...)
                ticker = self._extract_ticker_from_path(key)
                accession_number = self._extract_accession_from_path(key)
                
                # Download content
                response = self.s3.get_object(Bucket=self.raw_bucket, Key=key)
                filing_content = response['Body'].read().decode('utf-8')
                
                # V21: Extract comprehensive metadata
                metadata = self.metadata_extractor.extract_company_metadata(filing_content, ticker)
                company_name = metadata['company_info']['legal_name']
                filing_year = self.metadata_extractor.extract_actual_year(filing_content)
                industry = metadata['company_info']['industry']
                
                # Set timeout
                signal.signal(signal.SIGALRM, timeout_handler)
                signal.alarm(300)
                
                try:
                    # Try XBRL first, then HTML fallback
                    xbrl_result = self.xbrl_parser.extract_cash_flow_statement(filing_content)
                    
                    if xbrl_result['is_valid']:
                        logger.info(f"✅ XBRL extraction successful")
                        transactions = xbrl_result['transactions']
                        extraction_method = 'xbrl'
                    else:
                        logger.warning("⚠️ XBRL failed, trying HTML parser...")
                        df = self.html_parser.parse_html(filing_content)
                        
                        if df is not None and not df.empty:
                            transactions = self._df_to_transactions(df, filing_content)
                            extraction_method = 'html_table'
                            logger.info(f"✅ HTML extraction successful")
                        else:
                            logger.error("❌ Both XBRL and HTML extraction failed")
                            self.processing_log.append({
                                'file': key,
                                'ticker': ticker,
                                'company': company_name,
                                'status': 'failed',
                                'error': 'No cash flow data found'
                            })
                            signal.alarm(0)
                            continue
                    
                    # V21: Enrich transactions with comprehensive format
                    enriched_transactions = self._enrich_transactions_v21(
                        transactions, ticker, company_name, filing_year or 2023,
                        industry, extraction_method, accession_number
                    )
                    
                    # V21: Create cash flow statement summary
                    cf_summary = self._create_cash_flow_summary_v21(
                        enriched_transactions, ticker, company_name, filing_year or 2023
                    )
                    
                    # V21: Validate
                    is_valid, msg = self.validator.validate_mathematical_integrity(cf_summary)
                    cf_summary['validation']['mathematical_integrity'] = is_valid
                    cf_summary['validation']['integrity_message'] = msg
                    
                    # Add to collections
                    all_transactions.extend(enriched_transactions)
                    self.cash_flow_statements.append(cf_summary)
                    self.company_metadata.append(metadata)
                    
                    # Log success
                    self.processing_log.append({
                        'file': key,
                        'ticker': ticker,
                        'company': company_name,
                        'status': 'success',
                        'transactions_extracted': len(enriched_transactions),
                        'extraction_method': extraction_method,
                        'validation_passed': is_valid
                    })
                    
                    signal.alarm(0)
                    
                except TimeoutException:
                    logger.error(f"❌ Skipping {key}: Processing timed out")
                    self.processing_log.append({
                        'file': key,
                        'ticker': ticker,
                        'status': 'timeout'
                    })
                    continue
                except Exception as e:
                    logger.error(f"❌ Error processing {key}: {str(e)}")
                    self.processing_log.append({
                        'file': key,
                        'ticker': ticker,
                        'status': 'error',
                        'error': str(e)
                    })
                    signal.alarm(0)
                    continue
                finally:
                    signal.alarm(0)
        
        if not all_transactions:
            logger.warning("⚠️ No data extracted")
            return
        
        # V21: Save 5 output files
        self._save_v21_outputs(all_transactions)
        
        print("\n" + "=" * 70)
        print(f"✅ V21 Processing Complete!")
        print(f"   Transactions: {len(all_transactions)}")
        print(f"   Statements: {len(self.cash_flow_statements)}")
        print(f"   Files: {file_count}")
        print("=" * 70)

    def _enrich_transactions_v21(self, transactions, ticker, company_name,
                                filing_year, industry, extraction_method, accession):
        """V21: Comprehensive enrichment"""
        enriched = []
        
        for idx, txn in enumerate(transactions):
            enriched_txn = {
                # V21: ID fields
                'transaction_id': f"{ticker}_{filing_year}_CF_{idx+1:03d}",
                
                # V21: Description fields
                'transaction_description': txn.description,
                'clean_description': self._clean_description(txn.description),
                'keywords': self._extract_keywords(txn.description),
                
                # Amount fields
                'amount': txn.amount,
                'absolute_amount': abs(txn.amount),
                'currency': 'USD',
                
                # Classification
                'classification': txn.classification,
                'sub_category': txn.sub_category,
                'confidence': 0.95 if extraction_method == 'xbrl' else 0.85,
                
                # Metadata
                'company': company_name,
                'filing_year': filing_year,
                'form_type': '10-K',
                'gaap_reference': txn.gaap_reference,
                'account_mapping': txn.account,
                'materiality': 'medium',  # Simplified
                
                # Context
                'period_context': 'annual',
                'reasoning': txn.reasoning,
                'parsing_quality': 'high' if extraction_method == 'xbrl' else 'medium',
                
                # Source
                'extraction_method': extraction_method,
                'filing_source': accession
            }
            enriched.append(enriched_txn)
        
        return enriched

    def _create_cash_flow_summary_v21(self, transactions, ticker, company_name, filing_year):
        """V21: Create comprehensive cash flow statement"""
        operating = [t for t in transactions if t['classification'] == 'operating']
        investing = [t for t in transactions if t['classification'] == 'investing']
        financing = [t for t in transactions if t['classification'] == 'financing']
        
        return {
            'statement_id': f"{ticker}_{filing_year}_CFS",
            'company': company_name,
            'filing_year': filing_year,
            'form_type': '10-K',
            'cash_flow_statement': {
                'operating_activities': {
                    'net_cash_operating': sum(t['amount'] for t in operating),
                    'components': [
                        {
                            'description': t['transaction_description'],
                            'amount': t['amount'],
                            'type': t['sub_category']
                        } for t in operating
                    ]
                },
                'investing_activities': {
                    'net_cash_investing': sum(t['amount'] for t in investing),
                    'components': [
                        {
                            'description': t['transaction_description'],
                            'amount': t['amount'],
                            'type': t['sub_category']
                        } for t in investing
                    ]
                },
                'financing_activities': {
                    'net_cash_financing': sum(t['amount'] for t in financing),
                    'components': [
                        {
                            'description': t['transaction_description'],
                            'amount': t['amount'],
                            'type': t['sub_category']
                        } for t in financing
                    ]
                },
                'net_change_cash': sum(t['amount'] for t in transactions)
            },
            'validation': {}
        }

    def _save_v21_outputs(self, transactions):
        """V21: Save 5 comprehensive output files"""
        
        # 1. transaction_training_data.json
        txn_data = {
            'metadata': {
                'total_transactions': len(transactions),
                'date_processed': pd.Timestamp.now().isoformat(),
                'version': 'V21'
            },
            'training_examples': transactions
        }
        self.s3.put_object(
            Bucket=self.processed_bucket,
            Key='training-data/transaction_training_data.json',
            Body=json.dumps(txn_data, indent=2)
        )
        logger.info(f"✅ Saved transaction_training_data.json")
        
        # 2. cash_flow_statements.json
        self.s3.put_object(
            Bucket=self.processed_bucket,
            Key='training-data/cash_flow_statements.json',
            Body=json.dumps(self.cash_flow_statements, indent=2)
        )
        logger.info(f"✅ Saved cash_flow_statements.json")
        
        # 3. company_metadata.json
        self.s3.put_object(
            Bucket=self.processed_bucket,
            Key='training-data/company_metadata.json',
            Body=json.dumps(self.company_metadata, indent=2)
        )
        logger.info(f"✅ Saved company_metadata.json")
        
        # 4. processing_log.json (enhanced with quality metrics)
        validation_summary = self.validator.validate_transaction_list(transactions)
        log_data = {
            'processing_summary': {
                'total_filings_processed': len(self.processing_log),
                'successful_extractions': len([l for l in self.processing_log if l.get('status') == 'success']),
                'success_rate': len([l for l in self.processing_log if l.get('status') == 'success']) /len(self.processing_log) if self.processing_log else 0
            },
            'quality_metrics': validation_summary,
            'company_breakdown': self.processing_log
        }
        self.s3.put_object(
            Bucket=self.processed_bucket,
            Key='training-data/processing_log.json',
            Body=json.dumps(log_data, indent=2)
        )
        logger.info(f"✅ Saved processing_log.json")
        
        # 5. train.csv (legacy, backward compatibility)
        legacy_df = pd.DataFrame([{
            'description': t['transaction_description'],
            'amount': t['amount'],
            'label': t['classification']
        } for t in transactions])
        csv_buffer = StringIO()
        legacy_df.to_csv(csv_buffer, index=False)
        self.s3.put_object(
            Bucket=self.processed_bucket,
            Key='training-data/train.csv',
            Body=csv_buffer.getvalue()
        )
        logger.info(f"✅ Saved train.csv (legacy)")

    def _df_to_transactions(self, df, filing_content):
        """Convert DataFrame to CashFlowTransaction objects"""
        transactions = []
        for _, row in df.iterrows():
            description = row.get('description', '')
            amount = row.get('amount', 0)
            classification, sub_category = self.categorizer.categorize(description)
            account = self.categorizer.get_account_mapping(sub_category)
            reasoning = self.categorizer.generate_reasoning(classification, sub_category)
            
            transaction = CashFlowTransaction(
                description=description,
                amount=float(amount),
                account=account,
                classification=classification,
                sub_category=sub_category,
                confidence=0.85,
                reasoning=reasoning,
                gaap_reference=self.enricher.map_gaap_reference(classification, sub_category)
            )
            transactions.append(transaction)
        return transactions

    def _clean_description(self, desc: str) -> str:
        """Clean transaction description for ML training"""
        cleaned = desc.lower()
        cleaned = re.sub(r'[\d,]+\.?\d*', '', cleaned)  # Remove numbers
        cleaned = re.sub(r'[^\w\s]', ' ', cleaned)  # Remove punctuation
        cleaned = ' '.join(cleaned.split())  # Normalize whitespace
        return cleaned.strip()

    def _extract_keywords(self, desc: str) -> List[str]:
        """Extract keywords from description"""
        cleaned = self._clean_description(desc)
        stopwords = {'the', 'and', 'of', 'to', 'in', 'for', 'on', 'by', 'at', 'from'}
        words = [w for w in cleaned.split() if w not in stopwords and len(w) > 2]
        return words[:10]  # Top 10 keywords

    def _extract_ticker_from_path(self, path: str) -> str:
        """Extract ticker from S3 key path"""
        parts = path.split('/')
        if len(parts) >= 3:
            return parts[2]
        return 'UNKNOWN'

    def _extract_accession_from_path(self, path: str) -> str:
        """Extract accession number from S3 key path"""
        parts = path.split('/')
        if len(parts) >= 5:
            return parts[4]
        return 'Unknown'

if __name__ == "__main__":
    RAW_BUCKET = os.getenv("RAW_BUCKET", "sec-edgar-raw-filings-dev")
    PROCESSED_BUCKET = os.getenv("PROCESSED_BUCKET", "sec-edgar-processed-data-dev")
    
    processor = DataProcessor(RAW_BUCKET, PROCESSED_BUCKET)
    print("V21 Data Processor initialized.")

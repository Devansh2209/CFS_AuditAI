import json
import csv
import os
import re
from pathlib import Path
from typing import List, Dict, Any

class V25Processor:
    def __init__(self, input_dir: str, output_dir: str):
        self.input_dir = Path(input_dir)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Define concept mapping rules (XBRL -> Category)
        self.concept_map = {
            # Operating
            'NetCashProvidedByUsedInOperatingActivities': 'Operating',
            'DepreciationDepletionAndAmortization': 'Operating',
            'ShareBasedCompensation': 'Operating',
            'DeferredIncomeTaxExpenseBenefit': 'Operating',
            'IncreaseDecreaseInAccountsReceivable': 'Operating',
            'IncreaseDecreaseInInventories': 'Operating',
            'IncreaseDecreaseInAccountsPayable': 'Operating',
            
            # Investing
            'NetCashProvidedByUsedInInvestingActivities': 'Investing',
            'PaymentsToAcquirePropertyPlantAndEquipment': 'Investing',
            'PaymentsToAcquireMarketableSecurities': 'Investing',
            'ProceedsFromSaleOfMarketableSecurities': 'Investing',
            'PaymentsToAcquireBusinessesNetOfCashAcquired': 'Investing',
            
            # Financing
            'NetCashProvidedByUsedInFinancingActivities': 'Financing',
            'PaymentsOfDividends': 'Financing',
            'PaymentsForRepurchaseOfCommonStock': 'Financing',
            'ProceedsFromIssuanceOfCommonStock': 'Financing',
            'ProceedsFromIssuanceOfLongTermDebt': 'Financing',
            'RepaymentsOfLongTermDebt': 'Financing'
        }

    def clean_description(self, description: str) -> str:
        """Remove common prefixes/suffixes to get the core term"""
        # Remove "Net Cash..." prefixes
        desc = re.sub(r'Net Cash (Provided by|Used in) ', '', description, flags=re.IGNORECASE)
        desc = re.sub(r'Payments to Acquire ', '', desc, flags=re.IGNORECASE)
        desc = re.sub(r'Proceeds from ', '', desc, flags=re.IGNORECASE)
        desc = re.sub(r'Payments for ', '', desc, flags=re.IGNORECASE)
        return desc.strip()

    def extract_keywords(self, text: str) -> List[str]:
        """Extract significant keywords for the model"""
        stop_words = {'net', 'cash', 'provided', 'used', 'in', 'activities', 'payments', 'proceeds', 'to', 'from', 'for', 'of', 'and'}
        words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
        return [w for w in words if w not in stop_words]

    def process_file(self, file_path: Path) -> List[Dict]:
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
            
            processed_txns = []
            ticker = data.get('ticker', 'UNKNOWN')
            
            for tx in data.get('transactions', []):
                concept = tx.get('concept')
                
                # Skip if we don't have a mapping for this concept (or map to 'Other')
                category = self.concept_map.get(concept)
                if not category:
                    continue
                
                # Normalize amount (ensure outflows are negative if they are payments)
                amount = tx.get('amount', 0)
                description = tx.get('transaction_description', '')
                
                # Heuristic: Payments should generally be negative in a CFS context
                # But XBRL usually reports them as positive values for the concept "Payments..."
                # We will keep them as signed for the model based on the concept type if needed.
                # For now, let's trust the raw value but maybe flag it.
                
                processed_tx = {
                    'ticker': ticker,
                    'fiscal_year': tx.get('fiscal_year'),
                    'raw_concept': concept,
                    'raw_description': description,
                    'clean_description': self.clean_description(description),
                    'amount': amount,
                    'category': category,
                    'keywords': self.extract_keywords(description)
                }
                processed_txns.append(processed_tx)
                
            return processed_txns
        except Exception as e:
            print(f"Error processing {file_path}: {e}")
            return []

    def generate_datasets(self):
        all_transactions = []
        
        # Process all JSON files
        for file_path in self.input_dir.glob('*_cash_flow.json'):
            all_transactions.extend(self.process_file(file_path))
            
        print(f"Processed {len(all_transactions)} transactions from {len(list(self.input_dir.glob('*_cash_flow.json')))} files.")
        
        # 1. Generate CSV (Tabular)
        csv_path = self.output_dir / 'transactions.csv'
        if all_transactions:
            keys = all_transactions[0].keys()
            with open(csv_path, 'w', newline='') as f:
                writer = csv.DictWriter(f, fieldnames=keys)
                writer.writeheader()
                writer.writerows(all_transactions)
            print(f"✅ Generated CSV: {csv_path}")
            
        # 2. Generate JSONL (LLM Fine-tuning)
        jsonl_path = self.output_dir / 'training_data.jsonl'
        with open(jsonl_path, 'w') as f:
            for tx in all_transactions:
                # Create a prompt-completion pair
                # Prompt: "Classify this cash flow item: {description}"
                # Completion: "{category}"
                
                # We can also add context like keywords
                user_content = f"Classify the following cash flow line item into Operating, Investing, or Financing.\nDescription: {tx['raw_description']}\nKeywords: {', '.join(tx['keywords'])}"
                
                example = {
                    "messages": [
                        {"role": "system", "content": "You are an expert financial analyst assistant."},
                        {"role": "user", "content": user_content},
                        {"role": "assistant", "content": tx['category']}
                    ]
                }
                f.write(json.dumps(example) + '\n')
        print(f"✅ Generated JSONL: {jsonl_path}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Process SEC cash flow data")
    parser.add_argument("--input", default="v24_data", help="Input directory containing JSON files")
    parser.add_argument("--output", default="v25_datasets", help="Output directory for CSV/JSONL")
    args = parser.parse_args()

    print(f"🚀 Starting Processor...")
    print(f"   Input:  {args.input}")
    print(f"   Output: {args.output}")

    processor = V25Processor(input_dir=args.input, output_dir=args.output)
    processor.generate_datasets()

"""
XBRL-based Cash Flow Statement Parser
Provides structured extraction from SEC filings using XBRL tags
"""
import re
from typing import Dict, List, Optional
from dataclasses import dataclass
from bs4 import BeautifulSoup
import logging

logger = logging.getLogger(__name__)

@dataclass
class CashFlowTransaction:
    """Structured cash flow transaction data"""
    description: str
    amount: float
    account: str
    classification: str  # operating/investing/financing
    sub_category: str
    confidence: float
    reasoning: str
    gaap_reference: Optional[str] = None

class XBRLParser:
    """Parse cash flow statements from XBRL-formatted SEC filings"""
    
    # XBRL tag mappings to cash flow categories
    XBRL_MAPPINGS = {
        # Operating Activities
        'NetCashProvidedByUsedInOperatingActivities': {
            'classification': 'operating',
            'sub_category': 'net_operating_cash',
            'account': 'Operating Cash Flow'
        },
        'DepreciationDepletionAndAmortization': {
            'classification': 'operating',
            'sub_category': 'depreciation',
            'account': 'Depreciation & Amortization'
        },
        'IncreaseDecreaseInAccountsReceivable': {
            'classification': 'operating',
            'sub_category': 'customer_collections',
            'account': 'Accounts Receivable'
        },
        
        # Investing Activities
        'PaymentsToAcquirePropertyPlantAndEquipment': {
            'classification': 'investing',
            'sub_category': 'capital_expenditure',
            'account': 'Property, Plant & Equipment'
        },
        'PaymentsToAcquireBusinessesNetOfCashAcquired': {
            'classification': 'investing',
            'sub_category': 'business_acquisition',
            'account': 'Business Acquisitions'
        },
        
        # Financing Activities
        'PaymentsOfDividends': {
            'classification': 'financing',
            'sub_category': 'dividend_payment',
            'account': 'Dividends'
        },
        'PaymentsForRepurchaseOfCommonStock': {
            'classification': 'financing',
            'sub_category': 'stock_repurchase',
            'account': 'Treasury Stock'
        },
    }
    
    def extract_cash_flow_statement(self, filing_content: str) -> Dict:
        """
        Extract cash flow statement from XBRL filing
        
        Returns:
            {
                'is_valid': bool,
                'extraction_method': 'xbrl',
                'transactions': List[CashFlowTransaction],
                'confidence': float
            }
        """
        try:
            soup = BeautifulSoup(filing_content, 'lxml-xml')
            transactions = []
            
            for tag_name, metadata in self.XBRL_MAPPINGS.items():
                # Search for XBRL tags with namespace
                elements = soup.find_all(re.compile(f'.*:{tag_name}$', re.IGNORECASE))
                
                for element in elements:
                    amount = self._extract_amount(element)
                    if amount is not None:
                        transaction = CashFlowTransaction(
                            description=self._clean_tag_name(tag_name),
                            amount=amount,
                            account=metadata['account'],
                            classification=metadata['classification'],
                            sub_category=metadata['sub_category'],
                            confidence=0.95,  # XBRL is highly reliable
                            reasoning=f"Extracted from XBRL tag: {tag_name}",
                            gaap_reference=self._map_gaap_reference(metadata['classification'])
                        )
                        transactions.append(transaction)
            
            if len(transactions) >= 3:  # Minimum viable cash flow statement
                logger.info(f"✅ XBRL extraction successful: {len(transactions)} transactions found")
                return {
                    'is_valid': True,
                    'extraction_method': 'xbrl',
                    'transactions': transactions,
                    'confidence': 0.95
                }
            else:
                logger.warning(f"⚠️ XBRL extraction incomplete: only {len(transactions)} tags found")
                return {
                    'is_valid': False,
                    'extraction_method': 'xbrl',
                    'transactions': [],
                    'confidence': 0.0
                }
                
        except Exception as e:
            logger.error(f"❌ XBRL parsing failed: {str(e)}")
            return {
                'is_valid': False,
                'extraction_method': 'xbrl',
                'transactions': [],
                'confidence': 0.0
            }
    
    def _extract_amount(self, element) -> Optional[float]:
        """Extract numeric amount from XBRL element"""
        try:
            text = element.get_text(strip=True)
            # Remove commas and convert to float
            amount_str = re.sub(r'[,\s]', '', text)
            amount = float(amount_str)
            
            # Check for negative indicator
            if element.get('sign') == '-' or amount < 0:
                amount = abs(amount) * -1
            
            return amount
        except (ValueError, AttributeError):
            return None
    
    def _clean_tag_name(self, tag_name: str) -> str:
        """Convert CamelCase XBRL tag to readable description"""
        readable = re.sub(r'([A-Z])', r' \1', tag_name).strip()
        return readable.title()
    
    def _map_gaap_reference(self, classification: str) -> str:
        """Map classification to GAAP ASC reference"""
        gaap_map = {
            'operating': 'ASC 230-10-45-28',
            'investing': 'ASC 230-10-45-12',
            'financing': 'ASC 230-10-45-14'
        }
        return gaap_map.get(classification, 'ASC 230')

"""
Cash Flow Transaction Categorization Logic
Maps transaction descriptions to operating/investing/financing sub-categories
"""
import re
from typing import Optional, Tuple
import logging

logger = logging.getLogger(__name__)

class TransactionCategorizer:
    """Categorize cash flow transactions into detailed sub-categories"""
    
    # Operating Activity Sub-categories
    OPERATING_SUBCATEGORIES = {
        'customer_collections': [
            'accounts receivable', 'cash receipt', 'sales', 'revenue', 
            'collections', 'customer payments'
        ],
        'supplier_payments': [
            'accounts payable', 'inventory', 'cost of goods', 'purchases',
            'vendor payments', 'supplies'
        ],
        'tax_payments': [
            'income tax', 'tax payment', 'tax paid', 'taxes paid',
            'tax expense', 'tax refund'
        ],
        'interest_paid': [
            'interest expense', 'interest paid', 'interest payment'
        ],
        'employee_compensation': [
            'salaries', 'wages', 'compensation', 'payroll', 'employee'
        ],
        'depreciation': [
            'depreciation', 'amortization', 'depletion'
        ]
    }
    
    # Investing Activity Sub-categories
    INVESTING_SUBCATEGORIES = {
        'capital_expenditure': [
            'capex', 'capital expenditure', 'property, plant', 'equipment',
            'ppe', 'fixed assets', 'property and equipment'
        ],
        'business_acquisition': [
            'acquisition', 'purchase of business', 'merger', 'acquired',
            'business combination'
        ],
        'investment_purchase': [
            'marketable securities', 'investment', 'securities purchase',
            'equity investment', 'debt securities'
        ],
        'asset_sale': [
            'sale of assets', 'disposal', 'proceeds from sale', 
            'asset disposition'
        ]
    }
    
    # Financing Activity Sub-categories
    FINANCING_SUBCATEGORIES = {
        'dividend_payment': [
            'dividend', 'distribution', 'dividend paid', 'cash dividend'
        ],
        'stock_repurchase': [
            'buyback', 'treasury stock', 'repurchase', 'share repurchase',
            'stock buyback'
        ],
        'debt_issuance': [
            'bond', 'note', 'loan', 'borrowing', 'debt issuance',
            'proceeds from debt'
        ],
        'debt_repayment': [
            'debt repayment', 'repayment of', 'principal payment',
            'debt reduction', 'loan repayment'
        ],
        'stock_issuance': [
            'stock issuance', 'equity issuance', 'shares issued',
            'stock offering', 'ipo proceeds'
        ]
    }
    
    def __init__(self):
        self.all_categories = {
            'operating': self.OPERATING_SUBCATEGORIES,
            'investing': self.INVESTING_SUBCATEGORIES,
            'financing': self.FINANCING_SUBCATEGORIES
        }
    
    def categorize(self, description: str, existing_classification: Optional[str] = None) -> Tuple[str, str]:
        """
        Categorize transaction into classification and sub-category
        
        Args:
            description: Transaction description text
            existing_classification: Optional pre-determined classification
            
        Returns:
            (classification, sub_category) tuple
            classification: 'operating' | 'investing' | 'financing' | 'unknown'
            sub_category: specific sub-category name
        """
        description_lower = description.lower()
        
        # If classification is provided, only search within that category
        if existing_classification and existing_classification in self.all_categories:
            sub_category = self._find_subcategory(
                description_lower, 
                self.all_categories[existing_classification]
            )
            if sub_category:
                return (existing_classification, sub_category)
            return (existing_classification, 'other')
        
        # Search all categories
        for classification, subcategories in self.all_categories.items():
            sub_category = self._find_subcategory(description_lower, subcategories)
            if sub_category:
                logger.info(f"Categorized '{description}' as {classification}/{sub_category}")
                return (classification, sub_category)
        
        # Fallback heuristics
        classification = self._heuristic_classification(description_lower)
        return (classification, 'other')
    
    def _find_subcategory(self, description: str, subcategories: dict) -> Optional[str]:
        """Find matching sub-category from keyword list"""
        for sub_category, keywords in subcategories.items():
            if any(keyword in description for keyword in keywords):
                return sub_category
        return None
    
    def _heuristic_classification(self, description: str) -> str:
        """Fallback classification based on general keywords"""
        
        # Operating indicators
        if any(term in description for term in ['net income', 'operating', 'receivable', 'payable']):
            return 'operating'
        
        # Investing indicators
        if any(term in description for term in ['purchase', 'acquisition', 'investment', 'property']):
            return 'investing'
        
        # Financing indicators
        if any(term in description for term in ['dividend', 'stock', 'debt', 'loan', 'financing']):
            return 'financing'
        
        return 'unknown'
    
    def get_account_mapping(self, sub_category: str) -> str:
        """Map sub-category to typical account name"""
        account_map = {
            # Operating
            'customer_collections': 'Accounts Receivable',
            'supplier_payments': 'Accounts Payable',
            'tax_payments': 'Income Tax Payable',
            'interest_paid': 'Interest Expense',
            'employee_compensation': 'Salaries & Wages Payable',
            'depreciation': 'Accumulated Depreciation',
            
            # Investing
            'capital_expenditure': 'Property, Plant & Equipment',
            'business_acquisition': 'Goodwill',
            'investment_purchase': 'Marketable Securities',
            'asset_sale': 'Fixed Assets',
            
            # Financing
            'dividend_payment': 'Retained Earnings',
            'stock_repurchase': 'Treasury Stock',
            'debt_issuance': 'Long-term Debt',
            'debt_repayment': 'Long-term Debt',
            'stock_issuance': 'Common Stock',
        }
        return account_map.get(sub_category, 'Cash')
    
    def generate_reasoning(self, classification: str, sub_category: str) -> str:
        """Generate human-readable reasoning for categorization"""
        reasoning_map = {
            'customer_collections': 'Cash collected from customers for goods/services sold',
            'supplier_payments': 'Cash paid to suppliers for inventory and services',
            'tax_payments': 'Income tax payments to tax authorities',
            'interest_paid': 'Interest payments on debt obligations',
            'capital_expenditure': 'Investment in property, plant, and equipment',
            'business_acquisition': 'Cash paid to acquire other businesses',
            'dividend_payment': 'Cash distributed to shareholders',
            'stock_repurchase': 'Cash used to buy back company stock',
            'debt_issuance': 'Cash received from issuing debt instruments',
        }
        
        specific_reasoning = reasoning_map.get(sub_category)
        if specific_reasoning:
            return specific_reasoning
        
        # Generic reasoning
        return f"{classification.capitalize()} activity cash flow transaction"

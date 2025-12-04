"""
Cash Flow Data Validators
Implements validation and quality checks for V21 comprehensive format
"""
from typing import Dict, List, Tuple
import logging

logger = logging.getLogger(__name__)

class CashFlowValidator:
    """Validate cash flow data integrity and quality"""
    
    def validate_mathematical_integrity(self, statement: Dict) -> Tuple[bool, str]:
        """
        Check if Operating + Investing + Financing = Net Change in Cash
        
        Returns: (is_valid, message)
        """
        try:
            cf_statement = statement['cash_flow_statement']
            
            calculated_net = (
                cf_statement['operating_activities']['net_cash_operating'] +
                cf_statement['investing_activities']['net_cash_investing'] +
                cf_statement['financing_activities']['net_cash_financing']
            )
            
            reported_net = cf_statement['net_change_cash']
            
            # Allow small rounding differences (up to $1000)
            tolerance = 1000
            difference = abs(calculated_net - reported_net)
            
            if difference < tolerance:
                return True, f"Mathematical integrity valid (diff: ${difference:,.0f})"
            else:
                return False, f"Mathematical mismatch: calculated ${calculated_net:,.0f} vs reported ${reported_net:,.0f} (diff: ${difference:,.0f})"
                
        except Exception as e:
            return False, f"Validation error: {str(e)}"
    
    def validate_data_quality(self, transaction: Dict) -> Tuple[bool, Dict]:
        """
        Comprehensive quality checks for transaction data
        
        Returns: (is_valid, checks_dict)
        """
        checks = {
            'has_valid_amount': transaction.get('amount', 0) != 0,
            'has_classification': transaction.get('classification') in ['operating', 'investing', 'financing'],
            'has_company_context': bool(transaction.get('company')),
            'confidence_reasonable': 0.5 <= transaction.get('confidence', 0) <= 1.0,
            'has_description': len(transaction.get('transaction_description', '')) > 5,
            'has_transaction_id': bool(transaction.get('transaction_id')),
            'has_keywords': len(transaction.get('keywords', [])) > 0
        }
        
        is_valid = all(checks.values())
        return is_valid, checks
    
    def calculate_data_quality_score(self, checks: Dict) -> float:
        """Calculate overall quality score from validation checks"""
        if not checks:
            return 0.0
        
        passed = sum(1 for v in checks.values() if v)
        total = len(checks)
        
        return passed / total if total > 0 else 0.0
    
    def validate_transaction_list(self, transactions: List[Dict]) -> Dict:
        """
        Validate a list of transactions and return quality metrics
        
        Returns summary of validation results
        """
        total = len(transactions)
        valid_count = 0
        quality_scores = []
        failed_checks = {}
        
        for txn in transactions:
            is_valid, checks = self.validate_data_quality(txn)
            if is_valid:
                valid_count += 1
            
            quality_score = self.calculate_data_quality_score(checks)
            quality_scores.append(quality_score)
            
            # Track which checks fail most often
            for check_name, passed in checks.items():
                if not passed:
                    failed_checks[check_name] = failed_checks.get(check_name, 0) + 1
        
        avg_quality = sum(quality_scores) / len(quality_scores) if quality_scores else 0.0
        
        return {
            'total_transactions': total,
            'valid_transactions': valid_count,
            'validation_rate': valid_count / total if total > 0 else 0.0,
            'average_quality_score': avg_quality,
            'failed_checks_summary': failed_checks
        }

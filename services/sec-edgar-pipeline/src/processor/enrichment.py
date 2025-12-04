"""
Data Enrichment Module
Adds metadata, quality scores, and GAAP references to extracted transactions
"""
from typing import Dict, Optional
import re
import logging

logger = logging.getLogger(__name__)

class DataEnricher:
    """Enrich cash flow transaction data with metadata and quality metrics"""
    
    # GAAP ASC 230 Reference Mappings
    GAAP_REFERENCES = {
        'operating': 'ASC 230-10-45-28',
        'investing': 'ASC 230-10-45-12',
        'financing': 'ASC 230-10-45-14',
        'customer_collections': 'ASC 230-10-45-28(a)',
        'supplier_payments': 'ASC 230-10-45-28(b)',
        'capital_expenditure': 'ASC 230-10-45-13(a)',
        'business_acquisition': 'ASC 230-10-45-13(b)',
        'dividend_payment': 'ASC 230-10-45-15(a)',
        'stock_repurchase': 'ASC 230-10-45-15(b)',
        'debt_issuance': 'ASC 230-10-45-14(a)',
    }
    
    # Industry SIC Code Mappings (simplified)
    INDUSTRY_MAPPINGS = {
        '73': 'Technology',
        '60': 'Finance',
        '28': 'Healthcare',
        '35': 'Manufacturing',
        '49': 'Utilities',
        '50': 'Retail',
    }
    
    def __init__(self):
        self.default_confidence = {
            'xbrl': 0.95,
            'html_table': 0.85,
            'html_fuzzy': 0.70,
            'keyword': 0.60
        }
    
    def calculate_materiality(self, amount: float, revenue: float) -> str:
        """
        Calculate materiality level based on amount/revenue ratio
        
        Args:
            amount: Transaction amount
            revenue: Company annual revenue
            
        Returns:
            'high' | 'medium' | 'low'
        """
        if revenue == 0:
            return 'unknown'
        
        ratio = abs(amount) / revenue
        
        if ratio >= 0.10:  # 10% or more of revenue
            return 'high'
        elif ratio >= 0.02:  # 2-10% of revenue
            return 'medium'
        else:
            return 'low'
    
    def map_gaap_reference(self, classification: str, sub_category: Optional[str] = None) -> str:
        """
        Map transaction to GAAP ASC 230 reference
        
        Args:
            classification: operating/investing/financing
            sub_category: Optional specific sub-category
            
        Returns:
            GAAP reference code (e.g., 'ASC 230-10-45-28')
        """
        # Try sub-category first if provided
        if sub_category and sub_category in self.GAAP_REFERENCES:
            return self.GAAP_REFERENCES[sub_category]
        
        # Fall back to classification
        return self.GAAP_REFERENCES.get(classification, 'ASC 230')
    
    def extract_industry(self, filing_content: str) -> str:
        """
        Extract industry classification from SEC filing
        
        Args:
            filing_content: Raw filing HTML/text
            
        Returns:
            Industry name (e.g., 'Technology', 'Finance')
        """
        try:
            # Search for SIC code pattern
            sic_match = re.search(r'SIC[:\s]+(\d{2,4})', filing_content, re.IGNORECASE)
            if sic_match:
                sic_code = sic_match.group(1)[:2]  # Use first 2 digits
                industry = self.INDUSTRY_MAPPINGS.get(sic_code, 'Other')
                logger.info(f"Detected industry: {industry} (SIC: {sic_code})")
                return industry
            
            # Fallback: keyword-based detection
            content_lower = filing_content.lower()
            if any(term in content_lower for term in ['software', 'technology', 'internet']):
                return 'Technology'
            elif any(term in content_lower for term in ['bank', 'finance', 'insurance']):
                return 'Finance'
            elif any(term in content_lower for term in ['pharmaceutical', 'biotech', 'healthcare']):
                return 'Healthcare'
            
            return 'Other'
            
        except Exception as e:
            logger.warning(f"Industry extraction failed: {e}")
            return 'Unknown'
    
    def calculate_confidence(self, extraction_method: str, data_quality: Dict) -> float:
        """
        Calculate confidence score for extracted data
        
        Args:
            extraction_method: 'xbrl' | 'html_table' | 'html_fuzzy' | 'keyword'
            data_quality: Dict with quality indicators
                - has_amount: bool
                - has_description: bool
                - table_structured: bool
                
        Returns:
            Confidence score 0.0 to 1.0
        """
        # Start with base confidence from extraction method
        base_confidence = self.default_confidence.get(extraction_method, 0.50)
        
        # Adjust based on data quality
        quality_score = 1.0
        
        if not data_quality.get('has_amount', True):
            quality_score -= 0.3
        
        if not data_quality.get('has_description', True):
            quality_score -= 0.2
        
        if extraction_method == 'html_table' and not data_quality.get('table_structured', True):
            quality_score -= 0.15
        
        # Final confidence
        confidence = base_confidence * max(0.0, quality_score)
        
        return round(min(1.0, confidence), 2)
    
    def extract_company_name(self, filing_content: str) -> str:
        """Extract company name from SEC filing"""
        try:
            # Look for company name in standard SEC filing format
            name_match = re.search(r'COMPANY CONFORMED NAME:\s+(.+)', filing_content)
            if name_match:
                return name_match.group(1).strip()
            
            # Fallback: look for issuer tag
            issuer_match = re.search(r'<ISSUER>.*?<CONFORMED-NAME>(.+?)</CONFORMED-NAME>', 
                                    filing_content, re.DOTALL)
            if issuer_match:
                return issuer_match.group(1).strip()
            
            return 'Unknown Company'
            
        except Exception as e:
            logger.warning(f"Company name extraction failed: {e}")
            return 'Unknown Company'
    
    def extract_filing_year(self, filing_content: str) -> Optional[int]:
        """Extract filing year from SEC document"""
        try:
            # Look for fiscal year end date
            year_match = re.search(r'FISCAL YEAR END:\s+(\d{4})', filing_content)
            if year_match:
                return int(year_match.group(1))
            
            # Fallback: look for period of report
            period_match = re.search(r'CONFORMED PERIOD OF REPORT:\s+(\d{4})', filing_content)
            if period_match:
                return int(period_match.group(1))
            
            return None
            
        except Exception as e:
            logger.warning(f"Filing year extraction failed: {e}")
            return None

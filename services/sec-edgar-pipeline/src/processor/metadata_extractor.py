"""
Company Metadata Extractor
Extracts comprehensive company and filing metadata from SEC documents
"""
import re
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)

class MetadataExtractor:
    """Extract company and filing metadata from SEC filings"""
    
    def extract_company_metadata(self, filing_content: str, ticker: str) -> Dict:
        """
        Extract comprehensive company metadata
        
        Returns complete metadata structure for V21 output
        """
        return {
            'company_info': self._extract_company_info(filing_content, ticker),
            'filing_metadata': self._extract_filing_metadata(filing_content)
        }
    
    def _extract_company_info(self, content: str, ticker: str) -> Dict:
        """Extract company information"""
        return {
            'ticker': ticker,
            'legal_name': self._extract_legal_name(content),
            'cik_number': self._extract_cik(content),
            'industry': self._extract_industry(content),
            'sub_industry': self._extract_sub_industry(content),
            'fiscal_year_end': self._extract_fiscal_year_end(content),
            'reporting_currency': 'USD',
            'entity_type': 'Domestic Issuer'  # V21: US-only
        }
    
    def _extract_filing_metadata(self, content: str) -> Dict:
        """Extract filing-specific metadata"""
        return {
            'filing_date': self._extract_filing_date(content),
            'filing_period': self._extract_filing_period(content),
            'form_type': '10-K',
            'accession_number': self._extract_accession(content),
            'file_size': len(content),
            'has_xbrl': self._check_xbrl_availability(content),
            'has_html': '<html' in content.lower()
        }
    
    def _extract_legal_name(self, content: str) -> str:
        """Extract company legal name"""
        patterns = [
            r'COMPANY CONFORMED NAME:\s+(.+)',
            r'<CONFORMED-NAME>(.+?)</CONFORMED-NAME>',
            r'REGISTRANT NAME:\s+(.+)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        
        return 'Unknown Company'
    
    def _extract_cik(self, content: str) -> str:
        """Extract CIK number"""
        match = re.search(r'CENTRAL INDEX KEY:\s+(\d{10})', content)
        if match:
            return match.group(1)
        
        match = re.search(r'<CIK>(\d{10})</CIK>', content)
        if match:
            return match.group(1)
        
        return 'Unknown'
    
    def _extract_industry(self, content: str) -> str:
        """Extract industry classification"""
        # Try SIC code first
        sic_match = re.search(r'SIC[:\s]+(\d{2,4})', content, re.IGNORECASE)
        if sic_match:
            sic_code = sic_match.group(1)[:2]
            industry_map = {
                '73': 'Technology',
                '60': 'Finance',
                '28': 'Healthcare',
                '35': 'Manufacturing',
                '49': 'Utilities',
                '50': 'Retail',
                '65': 'Real Estate',
                '13': 'Energy',
                '20': 'Consumer Goods'
            }
            return industry_map.get(sic_code, 'Other')
        
        # Fallback to keyword detection
        content_lower = content.lower()
        if any(term in content_lower for term in ['software', 'technology', 'internet', 'cloud']):
            return 'Technology'
        elif any(term in content_lower for term in ['bank', 'finance', 'insurance', 'credit']):
            return 'Finance'
        elif any(term in content_lower for term in ['pharmaceutical', 'biotech', 'healthcare', 'medical']):
            return 'Healthcare'
        
        return 'Other'
    
    def _extract_sub_industry(self, content: str) -> str:
        """Extract sub-industry classification"""
        content_lower = content.lower()
        
        # Technology sub-industries
        if 'software' in content_lower or 'cloud' in content_lower:
            return 'Software & Services'
        elif 'semiconductor' in content_lower or 'chip' in content_lower:
            return 'Semiconductors'
        elif 'consumer electronics' in content_lower or 'hardware' in content_lower:
            return 'Consumer Electronics'
        
        # Finance sub-industries
        elif 'investment bank' in content_lower:
            return 'Investment Banking'
        elif 'commercial bank' in content_lower:
            return 'Commercial Banking'
        
        return 'General'
    
    def _extract_fiscal_year_end(self, content: str) -> str:
        """Extract fiscal year end month"""
        match = re.search(r'FISCAL YEAR END:\s+(\d{4})', content)
        if match:
            month_code = match.group(1)
            month_map = {
                '0331': 'March', '0630': 'June',
                '0930': 'September', '1231': 'December'
            }
            return month_map.get(month_code, 'Unknown')
        return 'Unknown'
    
    def _extract_filing_date(self, content: str) -> Optional[str]:
        """Extract filing date in YYYY-MM-DD format"""
        match = re.search(r'FILED AS OF DATE:\s+(\d{8})', content)
        if match:
            date_str = match.group(1)
            return f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:]}"
        return None
    
    def _extract_filing_period(self, content: str) -> Optional[str]:
        """Extract filing period (fiscal year)"""
        match = re.search(r'CONFORMED PERIOD OF REPORT:\s+(\d{8})', content)
        if match:
            date_str = match.group(1)
            return f"FY{date_str[:4]}"
        return None
    
    def _extract_accession(self, content: str) -> str:
        """Extract SEC accession number"""
        match = re.search(r'ACCESSION NUMBER:\s+([\d-]+)', content)
        if match:
            return match.group(1)
        
        match = re.search(r'<ACCESSION-NUMBER>([\d-]+)</ACCESSION-NUMBER>', content)
        if match:
            return match.group(1)
        
        return 'Unknown'
    
    def _check_xbrl_availability(self, content: str) -> bool:
        """Check if filing contains XBRL data"""
        xbrl_indicators = [
            '<xbrl',
            'xmlns:us-gaap',
            'xmlns:dei',
            '.xbrl'
        ]
        content_lower = content.lower()
        return any(indicator in content_lower for indicator in xbrl_indicators)
    
    def extract_actual_year(self, content: str) -> Optional[int]:
        """Extract the actual reporting year (not just fiscal year end code)"""
        # Try to find the period of report
        match = re.search(r'CONFORMED PERIOD OF REPORT:\s+(\d{4})', content)
        if match:
            return int(match.group(1))
        
        # Try filing date
        match = re.search(r'FILED AS OF DATE:\s+(\d{4})', content)
        if match:
            return int(match.group(1))
        
        return None

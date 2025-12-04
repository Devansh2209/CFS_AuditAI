import re
import pandas as pd
from bs4 import BeautifulSoup
from typing import List, Dict, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FinancialParser:
    def __init__(self):
        self.cash_flow_keywords = [
            "consolidated statements of cash flows",
            "statement of cash flows",
            "cash flows from operating activities",
            "cash flows from investing activities",
            "cash flows from financing activities"
        ]

    def parse_html(self, html_content: str) -> Optional[pd.DataFrame]:
        """
        Parse SEC HTML filing and extract the Cash Flow Statement.
        """
        soup = BeautifulSoup(html_content, 'lxml')
        
        # 1. Find the Cash Flow Table
        table = self._find_cash_flow_table(soup)
        if not table:
            logger.warning("❌ Cash Flow Statement table not found.")
            return None

        # 2. Extract Data
        data = self._extract_table_data(table)
        
        # 3. Create DataFrame
        df = pd.DataFrame(data, columns=["description", "amount_raw"])
        
        # 4. Clean Data
        df = self._clean_dataframe(df)
        
        return df

    def _find_cash_flow_table(self, soup: BeautifulSoup):
        """
        Heuristic search for the correct table.
        """
        tables = soup.find_all('table')
        
        for table in tables:
            # Check if table text contains enough keywords
            text = table.get_text().lower()
            matches = sum(1 for kw in self.cash_flow_keywords if kw in text)
            
            # If it has at least 3 keywords, it's likely the right table
            if matches >= 3:
                logger.info("✅ Found candidate Cash Flow table.")
                return table
        
        return None

    def _extract_table_data(self, table) -> List[Dict]:
        """
        Iterate over rows and extract text and values.
        """
        rows = []
        for tr in table.find_all('tr'):
            cells = tr.find_all(['td', 'th'])
            if not cells:
                continue
            
            # Simple extraction: First cell is text, Last cell is number
            # Real SEC parsing is much more complex (merged cells, multi-column),
            # but this is a solid baseline for the prototype.
            
            row_text = []
            for cell in cells:
                text = cell.get_text(strip=True)
                # Filter out empty cells or special chars
                if text and text not in ['$']:
                    row_text.append(text)
            
            if len(row_text) >= 2:
                # Assume last item is the current year amount
                # and everything before is description
                amount = row_text[-1]
                description = " ".join(row_text[:-1])
                
                rows.append({
                    "description": description,
                    "amount_raw": amount
                })
                
        return rows

    def _clean_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Normalize descriptions and convert amounts to float.
        """
        # Remove parentheses (negative numbers)
        df['amount'] = df['amount_raw'].astype(str).str.replace(r'[\(\)]', '-', regex=True)
        
        # Remove currency symbols and commas
        df['amount'] = df['amount'].str.replace(r'[$,]', '', regex=True)
        
        # Convert to numeric, coercing errors to NaN
        df['amount'] = pd.to_numeric(df['amount'], errors='coerce')
        
        # Drop rows with no valid amount
        df = df.dropna(subset=['amount'])
        
        # Clean description
        df['description'] = df['description'].str.lower().str.strip()
        
        return df[['description', 'amount']]

if __name__ == "__main__":
    # Test with a dummy HTML snippet
    dummy_html = """
    <html>
        <body>
            <table>
                <tr><td><strong>Consolidated Statements of Cash Flows</strong></td></tr>
                <tr><td>Cash flows from operating activities:</td><td></td></tr>
                <tr><td>Net income</td><td>$ 1,000</td></tr>
                <tr><td>Depreciation</td><td>500</td></tr>
                <tr><td>Cash flows from investing activities:</td><td></td></tr>
                <tr><td>Purchase of equipment</td><td>(200)</td></tr>
            </table>
        </body>
    </html>
    """
    
    parser = FinancialParser()
    df = parser.parse_html(dummy_html)
    
    if df is not None:
        print("Extracted Data:")
        print(df)

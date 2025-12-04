import requests
import json
import random
from collections import defaultdict

def generate_1500_tickers():
    print("🚀 Fetching all SEC tickers...")
    headers = {"User-Agent": "CashflowAI/TickerFetcher (dev@cashflow.ai)"}
    resp = requests.get("https://www.sec.gov/files/company_tickers.json", headers=headers)
    data = resp.json()
    
    # Convert to list of companies
    all_companies = list(data.values())
    print(f"✅ Found {len(all_companies)} total companies")
    
    # Filter out non-US companies (simple heuristic: exclude common foreign suffixes)
    foreign_suffixes = ['.TO', '.L', '.HK', '.AX', '.PA', '.DE', '.SW']
    us_companies = [
        c for c in all_companies 
        if not any(c['ticker'].endswith(suffix) for suffix in foreign_suffixes)
    ]
    print(f"   Filtered to {len(us_companies)} US companies")
    
    # Categorize by ticker characteristics (rough proxy for market cap)
    # Large cap: Well-known tickers (3-4 letters, no special chars)
    # Mid/Small cap: Longer tickers or with special chars
    
    large_cap_candidates = []
    mid_cap_candidates = []
    small_cap_candidates = []
    special_candidates = []
    
    for c in us_companies:
        ticker = c['ticker']
        title = c['title'].lower()
        
        # Special cases (REITs, Banks, Utilities)
        if any(keyword in title for keyword in ['reit', 'trust', 'properties', 'realty']):
            special_candidates.append(c)
        elif any(keyword in title for keyword in ['bank', 'financial', 'bancorp']):
            special_candidates.append(c)
        elif any(keyword in title for keyword in ['utility', 'utilities', 'energy', 'power', 'gas']):
            special_candidates.append(c)
        # Large cap heuristic: 1-4 letter tickers, no special chars
        elif len(ticker) <= 4 and ticker.isalpha() and ticker.isupper():
            large_cap_candidates.append(c)
        # Mid cap: 4-5 letters or has one special char
        elif len(ticker) <= 5 or ticker.count('-') == 1 or ticker.count('.') == 1:
            mid_cap_candidates.append(c)
        # Small cap: everything else
        else:
            small_cap_candidates.append(c)
    
    print(f"\n📊 Categorization:")
    print(f"   Large Cap candidates: {len(large_cap_candidates)}")
    print(f"   Mid Cap candidates: {len(mid_cap_candidates)}")
    print(f"   Small Cap candidates: {len(small_cap_candidates)}")
    print(f"   Special Cases: {len(special_candidates)}")
    
    # Sample with target distribution
    random.seed(42)  # Reproducible
    
    selected = []
    
    # Target: 500 large, 500 mid, 300 small, 200 special
    selected.extend(random.sample(large_cap_candidates, min(500, len(large_cap_candidates))))
    selected.extend(random.sample(mid_cap_candidates, min(500, len(mid_cap_candidates))))
    selected.extend(random.sample(small_cap_candidates, min(300, len(small_cap_candidates))))
    selected.extend(random.sample(special_candidates, min(200, len(special_candidates))))
    
    # If we don't have enough, fill from remaining
    if len(selected) < 1500:
        remaining = [c for c in us_companies if c not in selected]
        selected.extend(random.sample(remaining, 1500 - len(selected)))
    
    # Extract just tickers
    tickers = [c['ticker'] for c in selected[:1500]]
    
    output = {
        "tickers": tickers,
        "filing_type": "10-K",
        "limit": 1
    }
    
    with open("v28_1500_companies.json", "w") as f:
        json.dump(output, f, indent=2)
        
    print(f"\n💾 Saved 1,500 tickers to v28_1500_companies.json")
    print(f"   Sample: {tickers[:10]}")
    
    # Save metadata for analysis
    metadata = {
        "total_companies": 1500,
        "large_cap": len([c for c in selected if c in large_cap_candidates]),
        "mid_cap": len([c for c in selected if c in mid_cap_candidates]),
        "small_cap": len([c for c in selected if c in small_cap_candidates]),
        "special_cases": len([c for c in selected if c in special_candidates]),
    }
    
    with open("v28_metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)
    
    print(f"\n📈 Final Distribution:")
    for key, value in metadata.items():
        if key != "total_companies":
            print(f"   {key}: {value}")
    
    return tickers

if __name__ == "__main__":
    generate_1500_tickers()

import requests
import json
import random

def generate_500_tickers():
    print("🚀 Fetching all SEC tickers...")
    headers = {"User-Agent": "CashflowAI/TickerFetcher (dev@cashflow.ai)"}
    resp = requests.get("https://www.sec.gov/files/company_tickers.json", headers=headers)
    data = resp.json()
    
    # Data is a dict of dicts: "0": {"cik_str": 320193, "ticker": "AAPL", "title": "Apple Inc."}
    all_companies = list(data.values())
    print(f"✅ Found {len(all_companies)} total companies")
    
    # Filter? For now, let's just take a random sample to get diversity
    # We might want to exclude funds/trusts if possible, but simple random is a good start for "messy" data
    
    random.seed(42) # Reproducible
    sample = random.sample(all_companies, 500)
    
    tickers = [c['ticker'] for c in sample]
    
    output = {
        "tickers": tickers,
        "filing_type": "10-K",
        "limit": 1
    }
    
    with open("v26_500_companies.json", "w") as f:
        json.dump(output, f, indent=2)
        
    print(f"💾 Saved 500 tickers to v26_500_companies.json")
    print(f"Sample: {tickers[:10]}")

if __name__ == "__main__":
    generate_500_tickers()

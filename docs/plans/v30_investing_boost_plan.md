# V30 Investing Category Expansion Plan

## Objective
Reach **10,000 unique real-world Investing transactions** for the V30 dataset.
Current Status:
- Operating: 15,599 ✅
- Financing: 17,884 ✅
- Investing: 2,764 ⚠️ (Gap: ~7,236)

---

## Phase 1: Download & Verify Current Data
1. Download `v30_all_extracted.csv` from S3.
2. Verify exact counts and quality of Investing transactions.

## Phase 2: Targeted Ticker Selection
Identify 500-700 companies with high Investing activity (CapEx, Acquisitions, Investments):
- **Technology**: GOOGL, META, MSFT, AMZN, INTC, AMD, NVDA (High R&D/CapEx)
- **Manufacturing/Industrial**: CAT, DE, GE, BA, MMM, HON (Heavy equipment)
- **Real Estate (REITs)**: SPG, PLD, AMT, CCI, O (Property acquisitions)
- **Energy**: XOM, CVX, COP, SLB (Exploration/Production)
- **Telecommunications**: T, VZ, TMUS (Infrastructure)

## Phase 3: Targeted Extraction Script
Create `extract_investing_boost.py`:
1. Download 10-Ks for targeted tickers ONLY.
2. Extract **Investing** transactions specifically.
3. Append to V30 dataset.

## Phase 4: Execution on AWS
1. Upload targeted ticker list and script to S3.
2. Run extraction on EC2 (Stream Mode).
3. Monitor Investing count until 10,000 reached.

## Phase 5: Final Merge & Balance
1. Combine original V30 + Investing Boost data.
2. Downsample Operating/Financing to 10,000 (optional, or keep all).
3. Finalize `v30_master_real.csv`.

---

## Next Steps
1. Download current V30 data.
2. Generate `investing_tickers.csv`.
3. Create boost script.
4. Execute on AWS.

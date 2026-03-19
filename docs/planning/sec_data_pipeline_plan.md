# SEC Data Pipeline Plan

We will extract real "Operating Expenses" data from 10-K filings for the 100 companies requested by the user to build a robust training set.

## Goal
Automate the download and parsing of SEC 10-K filings to extract line items like "Rent," "Fuel," "Cloud Hosting," "Payroll," etc., which will serve as proxy transaction data for our blueprint classifier.

## Steps

### 1. Data Ingestion Script
Create `scripts/training/fetch_sec_data.py`.
- **Dependencies**: `sec-edgar-downloader`, `beautifulsoup4`.
- **Input**: List of CIKs (Central Index Keys) or Tickers for the 100 supported companies (MESA, MAR, AMZN, etc.).
- **Action**: Download the latest 10-K filing for each company.
- **Output**: Raw HTML/XBRL files stored in `data/sec_raw/`.

### 2. SEC Parser
Update `scripts/training/heuristic_preprocessor.py`.
- **Feature**: Add a `parse_sec_filing(html_content)` function.
- **Logic**: Use BeautifulSoup to locate the "Operating Expenses" table. Extract rows as "Description" and values as "Amount" (normalized).
- **Mapping**: Convert filing line items into our internal transaction format:
    - `Cost of Revenue` -> `amount: -1000, description: 'COGS', merchant: 'General Supplier'`
    - `Sales and Marketing` -> `amount: -500, description: 'Marketing', merchant: 'Ad Networks'`

### 3. Data Cleaning & Normalization (Crucial Layer)
Create `scripts/training/clean_sec_data.py`.
- **Structural Normalization**: Map custom XBRL tags (e.g., `NetTurnover`) to standard IDs (`core_revenue`). Enforce [-] for Outflows, [+] for Inflows.
- **Unit Scaling**: Detect `unitRef` (Millions vs Thousands) and normalize to base units.
- **Temporal Alignment**: Calendarize non-standard fiscal years (e.g., Apple's Sept year-end) to standard quarters.
- **Noise Filtering**: Exclude "Immaterial" footnotes and "One-Time" extraordinary items to prevent skewing future projections.

### 4. Training Data Generation
Run the pipeline to generate `data/training_data_sec.json`.
- This real-world financial structure (e.g., Amazon having huge "Technology and Content" costs vs. generic "Rent") will train the model to recognize Economic Blueprints based on expense distribution.

## Verification Plan

### Automated Test
Create `scripts/training/test_sec_parser.py`:
1. Mock a simple SEC HTML table snippet.
2. Run the parser.
3. Verify it correctly extracts "Rent Expense" as a fixed cost transaction.

### Manual Verification
1. Run the fetch script for 1 company (e.g., "MESA" - Mesa Airlines).
2. Check `data/sec_raw/` for the downloaded file.
3. Verify the parser output shows "Flight Operations" or "Fuel" as major expenses.

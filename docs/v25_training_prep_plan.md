# V25: From Raw SEC Data to AI Training Set

## Goal
Transform the raw XBRL cash flow data extracted in V24 (from 50+ companies) into a high-quality, enriched dataset ready for fine-tuning an LLM or training a classifier.

## The Gap
| Current State (V24 Raw) | Target State (Training Data) |
|-------------------------|------------------------------|
| Raw XBRL concepts (e.g., `NetCashProvidedByUsedInOperatingActivities`) | Human-readable labels & Categories |
| JSON per company | Unified Dataset (JSONL/CSV) |
| Just numbers & dates | Enriched features (Keywords, Context) |
| No validation labels | Verified "Ground Truth" labels |

## Implementation Plan

### 1. Data Normalization (The "V25 Processor")
Create a new processor script `src/processor/v25_processor.py` that consumes the V24 JSON files.

*   **Concept Mapping**: Map the ~200+ unique XBRL concepts found in V24 to our 3 core categories:
    *   `Operating`
    *   `Investing`
    *   `Financing`
*   **Standardization**: Ensure all amounts are signed correctly (e.g., outflows are negative).

### 2. Feature Engineering
Enrich each transaction with features useful for the model:
*   **`clean_description`**: Remove "Net Cash...", "Payments for..." to get the core term (e.g., "Depreciation", "Capital Expenditures").
*   **`keywords`**: Extract key terms (e.g., ["capex", "property", "equipment"]).
*   **`context`**: Add company metadata (Sector, Industry) to help the model learn patterns.

### 3. Dataset Generation
Generate three distinct outputs:

#### A. Pre-training / Fine-tuning Dataset (`training_data.jsonl`)
Format for LLM fine-tuning (e.g., OpenAI format):
```json
{"messages": [{"role": "user", "content": "Classify: Payments for equipment"}, {"role": "assistant", "content": "Investing"}]}
```

#### B. Tabular Dataset (`transactions.csv`)
For traditional classifiers (XGBoost/RandomForest) or analysis:
`Ticker, Year, Description, Amount, Label, Keywords, Sector`

#### C. Knowledge Graph (`relationships.json`)
Mapping of `Concept` -> `Standard Label` to build a taxonomy.

### 4. Validation & Splitting
*   **Auto-Validation**: Check `Operating + Investing + Financing = Net Change in Cash`.
*   **Splitting**: Randomly split into `Train` (80%), `Validation` (10%), `Test` (10%) sets, ensuring no data leakage (split by Company, not just Transaction).

## Execution Steps
1.  [ ] Create `v25_processor.py`
2.  [ ] Define XBRL-to-Category mapping rules
3.  [ ] Run processing on the 50-company V24 dataset
4.  [ ] Generate `training_data.jsonl` and `transactions.csv`
5.  [ ] Upload datasets to S3 for training

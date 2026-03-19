# Strategic Financial Engine: Phase 1 (Enrichment) Walkthrough

## Overview
We have successfully launched **Phase 1** of the Strategic Financial Engine. The system now transforms raw transaction data into a **"Digital Twin"** by automatically attaching strategic metadata to every entry.

### Key Capabilities
1.  **Department Tagging**: Automatically assigns transactions to *Sales*, *Marketing*, *R&D*, or *G&A* based on vendor/description.
2.  **Cost Nature Analysis**: Classifies costs as *Fixed* vs. *Variable* and *Recurring* vs. *One-off*.
3.  **Driver Linking**: Connects specific costs (e.g., "Google Ads") to financial drivers (e.g., "CAC").

## Architecture Updates

### 1. Enrichment Engine (`enrichmentEngine.js`)
A new logic module in the AI Service that applies heuristics and rule lookups.
-   **Input**: Transaction Description + Classification
-   **Output**:
    ```json
    "enrichment": {
        "department": "Marketing",
        "cost_type": "Variable",
        "is_recurring": true,
        "linked_driver_id": "driver_cac_01",
        "unit_basis": "Per Lead"
    }
    ```

### 2. Gateway Integration
-   **POST /classify**: Enriches single transactions in real-time.
-   **Data Store**: Updated `transactions` schema to persist enrichment data.
-   **GET /transactions**: Returns full "Digital Twin" objects.

### 3. Frontend Dashboard
-   **Recent Activity**: Now displays "Department" and "Cost Type" tags alongside standard transaction details.

## Verification

### API Test
```bash
curl -X POST http://localhost:3000/api/v1/classify \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Payment to Google Ads",
    "amount": 5000.00
  }'
```
**Response:**
```json
{
    "category": "Operating",
    "enrichment": {
        "department": "Marketing",
        "cost_type": "Variable",
        "linked_driver_id": "driver_cac_01"
    }
}
```

## Next Steps (Phase 2)
With the data now enriched ("The Digital Twin"), we are ready to build the **Driver Engine**:
-   Calculate **CAC** (Marketing Spend / New Customers).
-   Calculate **Burn Multipliers**.
-   Detect **Seasonality**.

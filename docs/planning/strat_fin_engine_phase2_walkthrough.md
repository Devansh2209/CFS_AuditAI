# Strategic Financial Engine: Phase 2 (Driver Engine) Walkthrough

## Overview
We have successfully implemented **Phase 2** of the Strategic Financial Engine: **The Driver Engine**. 

While Phase 1 focused on categorizing individual transactions ("The Digital Twin"), Phase 2 focuses on aggregating that data to calculate live Business KPIs.

### Key Capabilities
1.  **Business Driver Database**: A centralized definition of KPIs like *CAC*, *Burn Multiplier*, *Magic Number*, with their specific calculation logic.
2.  **Dynamic Recalculation**: An engine that iterates over enriched transactions to compute current metric values in real-time.
3.  **Visualization Integration**: A new "Strategic Drivers" widget on the Dashboard showing live KPI status, trends, and sensitivity.

## Architecture Updates

### 1. Driver Database (`services/gateway/src/data/drivers.js`)
-   **Seed Data**: Definitions for 5 key metrics.
-   **Structure**: 
    ```javascript
    {
        id: 'driver_cac_01',
        name: 'CAC',
        logic: 'sum(marketing_spend) / count(new_customers)',
        current_value: 450.00,
        sensitivity: 'High'
    }
    ```
-   **Logic Engine**: `recalculateDrivers(transactions)` function that aggregates spend by Department (e.g., Marketing) and updates the values.

### 2. API Endpoints (`services/gateway/src/routes/drivers.js`)
-   `GET /api/v1/drivers`: Returns the list of defined drivers and their current values.
-   `POST /api/v1/drivers/recalculate`: Triggers the calculation engine to update values based on total transaction history.

### 3. Frontend Dashboard
-   **Strategic Drivers Widget**: Displays cards for each driver with:
    -   Current Value
    -   Trend Indicator
    -   Sensitivity Tag (High/Medium/Low)
    -   Impact Tags (e.g., "Net Cash Flow")

## Verification

### API Test
Triggering a recalculation based on current data:
```bash
curl -X POST http://localhost:3000/api/v1/drivers/recalculate
```
**Response:**
```json
{
    "message": "Drivers recalculated successfully",
    "drivers": [
        {
            "id": "driver_cac_01",
            "current_value": 450, // Updated based on data
            ...
        }
    ]
}
```

## Next Steps (Phase 3)
With the Driver Engine live, we can now move to **Phase 3: The Projection Sandbox**.
-   Build the "What-If" Scenario Engine.
-   Link Drivers to Financial Statements.
-   Create the "Slider" UI for CFO scenario planning.

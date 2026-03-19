# Strategic Financial Engine: Phase 3 (Projection Sandbox) Walkthrough

## Overview
We have successfully implemented **Phase 3** of the Strategic Financial Engine: **The Projection Sandbox**.

This module transforms the system from a retrospective tool (what *happened*) into a forward-looking strategic engine (what *will happen*).

### Key Capabilities
1.  **"What-If" Scenario Engine**: A backend logic core that accepts "Levers" (e.g., "Decrease CAC by 20%") and projects future financials.
2.  **Interactive Sandbox UI**: A new dashboard component where the CFO can drag sliders to adjust key drivers in real-time.
3.  **Dynamic Forecasting**: Immediate visualization of how strategic decisions impact Cash Flow, Revenue, and Burn Rate over the next 12 months.

## Architecture Updates

### 1. Scenario Database (`services/gateway/src/data/scenarios.js`)
-   **Schema**:
    ```javascript
    {
        id: 'scen_growth_01', 
        levers: [{ driver_id: 'driver_cac', adjustment_pct: -0.10 }] 
    }
    ```
-   **Projection Engine**: Linear modeling logic that extrapolates current driver values + adjustments into a 12-month P&L forecast.

### 2. Simulation API (`services/gateway/src/routes/scenarios.js`)
-   `POST /simulate`: Accepts a list of custom levers (from the frontend sliders) and returns the projected data points.

### 3. Frontend UI (`ScenarioHelper.jsx`)
-   **Levers**: Sliders for Marketing Efficiency (CAC), Burn Multiplier, and Headcount.
-   **Visualization**: Area Chart comparing the **Base Case** (gray, dashed) vs. the **Active Scenario** (blue, solid).
-   **Real-time Feedback**: Debounced API calls update the chart instantly as sliders move.

## Verification

### API Test
Running a custom simulation via cURL:
```bash
curl -X POST http://localhost:3000/api/v1/scenarios/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "customLevers": [
        { "driver_id": "driver_cac_01", "adjustment_pct": -0.20 }
    ]
  }'
```
**Response:**
```json
{
    "scenario_id": "scen_custom_...",
    "summary": { "ending_cash": 1850000, "runway_months": "12+" },
    "forecast": [
        { "month": 1, "revenue": 85000, "cash_balance": 1500000 },
        ...
    ]
}
```

## Next Steps (Phase 4)
With the Simulation Engine live, we are ready for **Phase 4: Resource Optimization (ROIC)**.
-   Calculate Return on Invested Capital.
-   Recommendation Engine (e.g., "Shift $50k from Sales to Marketing").

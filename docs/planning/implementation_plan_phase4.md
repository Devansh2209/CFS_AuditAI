# implementation_plan_phase4.md

# Goal Description
Build the **Resource Optimization Engine** (Phase 4 of the Strategic Financial Engine).
The goal is to provide the CFO with actionable insights on where to allocate capital for maximum return (ROIC).
This involves:
1.  Calculating **ROIC** (Return on Invested Capital) per Department.
2.  Generating **AI Recommendations** (e.g., "Reduce Fixed Costs in G&A").
3.  Visualizing these insights on the Dashboard.

## User Review Required
> [!IMPORTANT]
> This engine relies on *enriched* transaction data. Ensure Phase 1 (Enrichment) is correctly tagging "Department" and "Cost Type".

## Proposed Changes

### Backend (Gateway)
#### [NEW] `services/gateway/src/data/recommendations.js`
-   **Schema**:
    ```javascript
    {
        id: 'rec_01',
        type: 'reallocation', // or 'efficiency'
        department: 'Marketing',
        message: 'Shift $50k from Generic Search to LinkedIn Ads',
        potential_impact: '+$10k ARR',
        confidence: 'High'
    }
    ```
-   **Logic**: `generateRecommendations(transactions)`
    -   Calculate "Marketing Efficiency Ratio" (New ARR / Marketing Spend).
    -   If Ratio < 1.0 -> Suggest "Audit Marketing Spend".
    -   If G&A > 20% of Revenue -> Suggest "Reduce Fixed Overheads".

#### [NEW] `services/gateway/src/routes/recommendations.js`
-   `GET /api/v1/recommendations`: Returns the generated recommendations based on current data.

#### [MODIFY] `services/gateway/src/server.js`
-   Register the new rules route.

### Frontend
#### [REFITOR] `services/frontend/src/components/Dashboard.jsx` & `ScenarioHelper.jsx`
-   **Lift State Up**: Move `levers` and `setLevers` from `ScenarioHelper` to `Dashboard`.
-   **Purpose**: To allow the new `OptimizationWidget` to modify the levers (Apply AI Recommendations) while keeping `ScenarioHelper` in sync.

#### [NEW] `services/frontend/src/components/OptimizationWidget.jsx`
-   **Props**: `onApplyRecommendation(levers)`
-   **UI**: 
    -   Cards with "Apply" button.
    -   When clicked, constructs the lever object (e.g., `{ driver_cac_01: -10 }`) and calls `onApplyRecommendation`.

#### [MODIFY] `services/frontend/src/components/Dashboard.jsx`
-   Integrate `OptimizationWidget` into the layout.
-   Pass state handlers to both widgets.

## Verification Plan

### Automated Tests
-   **Calculations**: Verify `generateRecommendations` returns expected output for known transaction patterns.
-   **API**: `curl GET /api/v1/recommendations` to ensure valid JSON response.

### Manual Verification
1.  Open Dashboard.
2.  Verify "Resource Optimization" widget appears.
3.  Check that recommendations make sense based on the mock data (e.g. if we have high burn, it should suggest efficiency).

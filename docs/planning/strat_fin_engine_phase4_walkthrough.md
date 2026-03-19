# Strategic Financial Engine - Phase 4: Resource Optimization Walkthrough

## Goal
To implement an **Interactive AI Recommendation Engine** that analyzes financial performance and suggests capital reallocation strategies. Crucially, these recommendations are not static text but **active controls** that directly manipulate the Projection Sandbox, allowing the user to leverage AI insights while maintaining full manual control.

## 1. Architecture: The "Interactive Pilot" Model

Unlike traditional dashboards that show static alerts, our system uses a **Shared Control** model.

*   **AI (Pilot)**: Suggestions optimization strategies (e.g., "Reduce Markerting Spend by 10%").
*   **User (Captain)**: Reviews the suggestion, clicks "Apply" to execute it broadly, and then fine-tunes the result.

### Technical Implementation: State Lifting
To achieve this, we refactored the Frontend architecture:
*   **Before**: `ScenarioHelper` managed its own `levers` state.
*   **After**: `Dashboard` manages the `levers` state and passes it down to both `ScenarioHelper` and the new `OptimizationWidget`.

```javascript
// Dashboard.jsx (Parent)
const [levers, setLevers] = useState({ driver_cac_01: 0, ... });

// OptimizationWidget (Child 1)
// Calls setLevers to apply AI suggestions
<OptimizationWidget onApplyRecommendation={changes => setLevers({...levers, ...changes})} />

// ScenarioHelper (Child 2)
// Displays current state and allows manual fine-tuning
<ScenarioHelper levers={levers} setLevers={setLevers} />
```

## 2. Backend: Recommendation Engine
We implemented a rule-based engine in `services/gateway/src/data/recommendations.js` that analyzes the real-time values of Business Drivers.

### Rules Configured:
1.  **High CAC Alert (Efficiency)**:
    *   **Trigger**: CAC > $400
    *   **Suggestion**: Reduce CAC Driver by 10%
    *   **Impact**: +$15k Monthly Free Cash Flow
2.  **Burn Multiplier Risk (Runway)**:
    *   **Trigger**: Burn Multiplier > 2.0x
    *   **Suggestion**: Reduce Burn Multiplier by 15% AND Freeze Hiring
3.  **Cloud Cost Optimization (Margin)**:
    *   **Trigger**: Cloud COGS > 5.0% of Rev
    *   **Suggestion**: Reduce Cloud COGS by 20%

## 3. Frontend: Optimization Widget
The new `OptimizationWidget.jsx` fetches these insights and renders them as actionable cards.

### Key Features:
*   **Confidence Scores**: Indicates how certain the AI is about the result.
*   **Type Badging**: Categorizes insights into Efficiency, Growth, or Risk.
*   **Apply Button**: The core interactive element. Clicking it instantly updates the `levers` state.

## 4. User Workflow
1.  **Analysis**: User sees a "High Burn Warning" card in the Optimization Widget.
2.  **Action**: User clicks **[Apply ->]**.
3.  **Simulation**:
    *   The **Projection Sandbox** sliders automatically jump to the suggested values (e.g., Burn Multiplier -15%).
    *   The **Forecasting Chart** instantly re-renders to show the new runway.
4.  **Refinement**: The user thinks -15% is too aggressive, so they manually drag the slider back to -10%. The chart updates again.

## 5. Verification
*   **API**: Verified `GET /api/v1/recommendations` returns correct JSON structure.
*   **Interactivity**: Verified that clicking "Apply" in the widget correctly updates the sliders in the sibling component.
*   **Simulation**: Verified that the updated sliders trigger a new simulation request to the backend.

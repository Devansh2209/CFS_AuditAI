# Universal Financial Intelligence Platform - Implementation Plan

## Vision
Transform the Strategic Financial Engine into a **Universal Platform** that serves businesses from local garages to airport CFOs through progressive complexity and industry-specific intelligence.

---

## Phase 1: Industry Blueprint System

### Backend: Template Engine
#### [NEW] `services/gateway/src/data/industryBlueprints.js`
```javascript
{
  "automotive_garage": {
    "variables": [
      { "id": "bay_utilization", "name": "Bay Utilization Rate", "formula": "hours_billed / total_bay_hours" },
      { "id": "parts_markup", "name": "Parts Markup %", "formula": "(parts_revenue - parts_cost) / parts_cost" },
      { "id": "avg_job_value", "name": "Average Job Value", "formula": "total_revenue / job_count" }
    ],
    "enrichment_rules": [
      { "pattern": "AutoZone|O'Reilly", "tag": "COGS", "cost_type": "Variable" },
      { "pattern": "Labor|Mechanic", "tag": "Labor", "cost_type": "Variable" }
    ]
  },
  "aviation": {
    "variables": [
      { "id": "revenue_per_pax", "name": "Revenue per Passenger", "formula": "total_revenue / passenger_count" },
      { "id": "load_factor", "name": "Load Factor %", "formula": "passengers / available_seats" },
      { "id": "fuel_cost_per_flight", "name": "Fuel Cost per Flight", "formula": "fuel_cost / flight_count" }
    ]
  },
  "restaurant": {
    "variables": [
      { "id": "table_turnover", "name": "Table Turnover Rate", "formula": "covers / table_count / hours_open" },
      { "id": "food_cost_pct", "name": "Food Cost %", "formula": "cogs / food_revenue" },
      { "id": "avg_check_size", "name": "Average Check Size", "formula": "revenue / covers" }
    ]
  }
}
```

#### [NEW] `services/gateway/src/engine/variableGenerator.js`
**Purpose**: Analyzes transaction patterns and auto-generates industry-specific KPIs.

**Core Logic**:
```javascript
class VariableGenerator {
  async analyzeAndGenerate(transactions, industryType) {
    // 1. Load industry blueprint
    const blueprint = industryBlueprints[industryType];
    
    // 2. Detect data patterns
    const patterns = this.detectPatterns(transactions);
    
    // 3. Generate variables
    const variables = blueprint.variables.map(v => ({
      ...v,
      current_value: this.calculateValue(v.formula, transactions),
      auto_generated: true,
      confidence: this.calculateConfidence(patterns, v)
    }));
    
    return variables;
  }
}
```

---

## Phase 2: Dynamic Mapping Engine

### Backend: Smart Data Ingestion
#### [MODIFY] `services/gateway/src/routes/upload.js`
Add **Industry-Aware Classification**:
```javascript
// After CSV upload, ask: "What industry?"
const industryType = req.body.industry || 'general';

// Use industry blueprint for smarter tagging
const enrichmentRules = industryBlueprints[industryType].enrichment_rules;
const enrichedTransaction = applyIndustryRules(transaction, enrichmentRules);
```

#### [NEW] `services/gateway/src/engine/ocr-ledger-parser.js`
**Purpose**: Parse photos of handwritten ledgers for small businesses.
- Use Tesseract.js for OCR
- Regex to extract Date, Description, Amount
- Map to transaction schema

---

## Phase 3: Progressive UI (Standard vs Expert Mode)

### Frontend: Mode Selector
#### [MODIFY] `services/frontend/src/components/Dashboard.jsx`
Add a **View Toggle**:
```jsx
const [viewMode, setViewMode] = useState('standard'); // or 'expert'

// Standard View: Shows 3-4 core widgets
// Expert View: Shows all 10+ widgets including Monte Carlo, Sensitivity Analysis
```

#### [NEW] `services/frontend/src/components/IndustrySelector.jsx`
**Purpose**: Onboarding component that asks "What is your industry?"
- Loads appropriate blueprint
- Hides irrelevant metrics (e.g., CAC for a restaurant)

---

## Phase 4: Universal Financial Schema

### Backend: Graph-Based Dependency Engine
#### [NEW] `services/gateway/src/engine/dependencyGraph.js`
**Purpose**: Model relationships between variables using a graph structure.

**Example**:
```javascript
// For a Garage:
graph.addNode('parts_cost');
graph.addNode('parts_markup');
graph.addNode('parts_revenue');
graph.addEdge('parts_cost', 'parts_revenue', (cost, markup) => cost * (1 + markup));

// For an Airport:
graph.addNode('fuel_price');
graph.addNode('flight_cost');
graph.addEdge('fuel_price', 'flight_cost', (price, gallons) => price * gallons);
```

When user changes "Parts Markup" from 30% → 35%, the graph propagates:
1. `parts_revenue` recalculates
2. `gross_profit` recalculates
3. `net_income` recalculates
4. Projection updates

---

## Phase 5: Auto-Generated Insights

### Backend: Pattern Recognition Engine
#### [NEW] `services/gateway/src/engine/patternDetector.js`
**Purpose**: Scan transaction history and suggest new variables.

**Logic**:
```javascript
// If transaction descriptions frequently mention "Delivery", suggest:
{
  "variable": "delivery_cost_per_order",
  "reasoning": "We detected 45 delivery-related transactions. Track this separately?",
  "auto_generate": true
}
```

---

## Implementation Roadmap

### Milestone 1: Industry Blueprints (2 weeks)
- [ ] Create `industryBlueprints.js` with 5 templates (Garage, Restaurant, SaaS, Manufacturing, Retail)
- [ ] Build `variableGenerator.js` engine
- [ ] Modify upload flow to ask for industry type

### Milestone 2: Progressive UI (1 week)
- [ ] Add Standard/Expert toggle to Dashboard
- [ ] Create `IndustrySelector.jsx` onboarding flow
- [ ] Hide/show widgets based on mode

### Milestone 3: Dynamic Variable System (2 weeks)
- [ ] Build `dependencyGraph.js` engine
- [ ] Allow users to define custom formulas in UI
- [ ] Auto-generate recommendations based on patterns

### Milestone 4: Enterprise Features (3 weeks)
- [ ] API integrations (QuickBooks, SAP, Oracle)
- [ ] Multi-entity support (consolidation across subsidiaries)
- [ ] Advanced analytics (Monte Carlo, Sensitivity Analysis)

---

## Key Architecture Changes

### Current State: Hardcoded SaaS Metrics
```javascript
// drivers.js
const drivers = [
  { id: 'driver_cac_01', name: 'CAC', ... },  // Only relevant for SaaS
  { id: 'driver_burn_mult_01', ... }
];
```

### Future State: Dynamic Industry Templates
```javascript
// On user signup:
const userIndustry = 'automotive_garage';
const blueprint = industryBlueprints[userIndustry];
const drivers = variableGenerator.generate(transactions, blueprint);
// Returns: [{ "Bay Utilization" }, { "Parts Markup" }, ...]
```

---

## Why This is a Moat

1. **Blank Page Solution**: Small businesses don't know what to track. We tell them.
2. **Instant ROI**: Upload CSV → Get insights in 60 seconds.
3. **Scales Up**: Same engine works for $1M and $1B revenue businesses.
4. **Network Effect**: Each industry template improves as more users in that vertical join.

---

## Next Steps

**Should I:**
1. Start with **Milestone 1** (Industry Blueprints)?
2. Focus on **Progressive UI** first to improve UX?
3. Build the **Dependency Graph Engine** as the foundation?

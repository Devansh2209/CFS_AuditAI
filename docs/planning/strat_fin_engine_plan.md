# Strategic Financial Engine Implementation Plan

## Vision
Transform the existing transaction classification tool into a comprehensive "Digital Twin" for Financial Planning & Analysis (FP&A). The system will not only categorize transactions but also extract business drivers, enable scenario modeling, and optimize capital allocation.

## Roadmap

### Phase 1: Data Ingestion & Intelligent Enrichment (The Foundation)
**Goal:** Enriched "Digital Twin" of every transaction.
- [ ] **Schema Update**: Implement `EnrichedTransaction` schema.
- [ ] **Deep Tagging Logic**:
    - [ ] **Department**: Map vendors/descriptions to departments (Sales, Eng, Marketing).
    - [ ] **Cost Nature**: Classify as `Fixed` vs. `Variable` and `Recurring` vs. `One-off`.
    - [ ] **Unit Basis**: Link costs to drivers (e.g., AWS -> COGS/User).
- [ ] **Anomaly Detection**: Flag "fat-finger" errors or duplicate billings.

### Phase 2: Extraction of Business Variables (The Driver Engine)
**Goal:** Derive KPIs from categorizations.
- [ ] **Driver Definition**: Implement `BusinessDriver` schema.
- [ ] **KPI Extraction Logic**:
    - [ ] **CAC**: Sum(Marketing + Sales) / New Customers (from Revenue tags).
    - [ ] **Burn Multiplier**: Net Burn / Net New ARR.
    - [ ] **Seasonality**: Extract monthly variance factors.

### Phase 3: The Projection & "What-If" Sandbox
**Goal:** Dynamic Three-Statement Modeling.
- [ ] **Scenario Engine**: Implement `ScenarioSandbox` schema.
- [ ] **Logic Framework**:
    - [ ] Link "Levers" (Headcount, Mktg Spend) to Financial Statements.
    - [ ] Real-time recalculation of Cash Flow, Income Statement, Balance Sheet.
- [ ] **UI/UX**: "Slider" interface for manipulating variables.

### Phase 4: Resource Optimization & ROIC
**Goal:** AI-driven capital allocation advice.
- [ ] **ROIC Calculation**: Segment-based return analysis.
- [ ] **Allocation Simulator**: Compare Debt Paydown vs. R&D vs. Marketing.

### Phase 5: Technical & Security
**Goal:** Enterprise-grade trust.
- [ ] **Audit Trail**: Link every projection back to source transactions.
- [ ] **Security**: Data encryption and SOC2 readiness steps.

---

## Technical Specifications

### 1. Enriched Transaction Schema
```json
{
  "transaction_id": "tx_98765",
  "raw_data": {
    "date": "2025-10-15",
    "vendor": "Google Ads",
    "amount": -2500.00,
    "description": "Adwords-Search-Campaign-Q4"
  },
  "classification": {
    "primary": "Operating",
    "sub_category": "Marketing - Performance",
    "confidence_score": 0.98
  },
  "enrichment": {
    "department": "Sales & Marketing",
    "cost_type": "Variable", 
    "is_recurring": true,
    "linked_driver_id": "driver_cac_01"
  }
}
```

### 2. Business Driver Schema
```json
{
  "business_drivers": [
    {
      "driver_id": "driver_cac_01",
      "name": "Customer Acquisition Cost (CAC)",
      "logic": "sum(marketing_spend) / count(new_customers)",
      "current_value": 450.00,
      "unit": "USD",
      "sensitivity": "High",
      "impacts": ["net_cash_flow", "revenue_growth_lagged"]
    }
  ]
}
```

### 3. Scenario Sandbox Schema
```json
{
  "scenario_id": "scen_growth_agg_2026",
  "levers": [
    {
      "driver_id": "driver_cac_01",
      "adjustment": -0.10, 
      "note": "Optimizing ad spend for 10% better efficiency"
    }
  ],
  "projections": {
    "projected_burn_rate": -150000,
    "projected_runway_months": 14,
    "expected_roic": 0.22
  }
}
```

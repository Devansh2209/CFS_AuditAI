# Universal Economic DNA Walkthrough (5 Core Blueprints)

I have implemented the "Universal Economic DNA" architecture, upgrading the engine from simple industry templates to a dynamic "Blueprint Detection" system.

## 🧬 The 5 Core Blueprints

The engine now analyzes the "Shape" and "Vocabulary" of transaction data to classify any business into one of five fundamental economic models.

### 1. Yield & Utilization (Asset Heavy)
*   **Target Industries**: Airports, Hotels, Coworking, Hospitals.
*   **Triggers**: High fixed costs (>40% of total), Maintenance spikes, Utility intensity.
*   **Auto-Generated KPIs**:
    *   **Revenue Yield per Fixed Cost $**: Efficiency of the physical asset.
    *   **Fixed Cost Coverage**: Survival metric for debt-heavy models.

### 2. Throughput & Efficiency (Manufacturing/Production)
*   **Target Industries**: factories, Commercial Kitchens, Construction.
*   **Triggers**: Wholesale vendors (Industrial/Raw Materials), Freight/Logistics spend, High Labor mix.
*   **Auto-Generated KPIs**:
    *   **Material Yield Efficiency**: Revenue per dollar of raw input (Waste reduction).
    *   **Throughput per Labor Hour**: Speed of turning labor into finished goods.

### 3. Inventory & Velocity (Retail/Trading)
*   **Target Industries**: E-commerce, Convenience Stores, Wholesalers.
*   **Triggers**: High transaction volume, Diverse vendor list (>20 unique), "Shipping/Packaging" scaling with revenue.
*   **Auto-Generated KPIs**:
    *   **Inventory Turnover Proxy**: Speed of moving cash through goods.
    *   **GMROI Estimate**: Gross Margin Return on Inventory Investment.

### 4. Recurring & Retention (SaaS/Subscription)
*   **Target Industries**: Software, Gyms, Insurance.
*   **Triggers**: Cloud Hosting (AWS/Azure), Marketing dominance, Recurring revenue patterns.
*   **Auto-Generated KPIs**:
    *   **LTV/CAC Proxy**: The "Golden Ratio" of unit economics.
    *   **SaaS Magic Number**: Sales efficiency metric.

### 5. Billable Expertise (Services)
*   **Target Industries**: Law Firms, Consulting, Agencies.
*   **Triggers**: Payroll is the "Black Hole" (>60% of expense), Low vendor diversity.
*   **Auto-Generated KPIs**:
    *   **Revenue per Headcount**: The primary efficiency lever for people businesses.
    *   **Realization Rate Proxy**: Capture of potential billable value.

---

## ✅ Verification & Testing

I created a comprehensive test suite `services/gateway/test_universal_blueprints.js` that feeds the engine characteristic transaction sets for each blueprint.

**Test Results:**

1.  **Yield Test (Property Mgmt)**
    *   **Detected**: `yield_utilization`
    *   **Variables**: `Revenue Yield per Fixed Cost $`, `Fixed Cost Coverage`

2.  **Throughput Test (Factory)**
    *   **Detected**: `throughput_efficiency`
    *   **Variables**: `Material Yield Efficiency`, `Throughput per Labor Hour`

3.  **Inventory Test (Retail)**
    *   **Detected**: `inventory_velocity`
    *   **Variables**: `Inventory Turnover Proxy`, `GMROI Estimate`

4.  **Recurring Test (SaaS)**
    *   **Detected**: `recurring_retention`
    *   **Variables**: `LTV/CAC Proxy`, `SaaS Magic Number`

5.  **Expertise Test (Consulting)**
    *   **Detected**: `billable_expertise`
    *   **Variables**: `Revenue per Headcount`, `Realization Rate Proxy`

## 🧠 ML Training Readiness

I have also created `scripts/training/heuristic_preprocessor.py`. This script is designed to:
1.  Ingest raw transaction data (e.g., from SEC filings or data partnerships).
2.  Apply these exact heuristic rules to "Silver Label" the data.
3.  Generate a labeled training set (X: Transaction Features, Y: Blueprint Label) for the final ML model.

The system is now fully "Universal" and ready for any business type.

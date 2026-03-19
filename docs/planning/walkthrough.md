# Universal Financial Intelligence Walkthrough

I have successfully implemented all four components of the **AI-Powered Template Generator (Universal Business Intelligence)** infrastructure.

## 🚀 Key Features Built

### 1. Progressive UI (Standard vs. Expert Mode)
We now support "Progressive Complexity." The platform adapts to the user's expertise level, making it suitable for both a small garage owner and a professional CFO.

````carousel
![Standard Mode Dashboard](file:///Users/devanshsoni/.gemini/antigravity/brain/52e09266-3abf-42c2-a6e6-ba05bdc48a23/standard_mode_dashboard_1768867939370.png)
<!-- slide -->
![Expert Mode Dashboard](file:///Users/devanshsoni/.gemini/antigravity/brain/52e09266-3abf-42c2-a6e6-ba05bdc48a23/expert_mode_dashboard_1768867956448.png)
````

- **Standard Mode**: Simplified dashboard focusing on total volume, transaction counts, and historical data.
- **Expert Mode**: Unlocks the **Projection Sandbox** (sliders for CAC and Burn), **Optimization Widgets** (scenario recommendations), and **Strategic Drivers** with sensitivity analysis.

### 2. Auto-Variable Generation (Pattern Detection)
The system no longer relies on hardcoded templates. Instead, it extracts intelligence from raw transaction data.

- **Transaction Analyzer**: Segments vendors (e.g., NAPA/AutoZone → Automotive), detects expense patterns (Labor, COGS), and identifies special business characteristics (Delivery, Subscriptions).
- **Variable Generator**: Automatically suggests and calculates KPIs based on those patterns. 
    - *Example*: Detects "NAPA" and "Brake Pads" → Auto-generates **"Parts Cost %"**.
    - *Example*: Detects "UPS" and "Shipping" → Auto-generates **"Delivery Cost per Order"**.

### 3. Graph-Based Dependency Engine
Under the hood, we've replaced flat logic with a **Directed Acyclic Graph (DAG)** to model variable relationships.
- Changes in one driver (e.g., *Labor Expense*) propagate automatically through dependencies (e.g., *Gross Margin* or *Projected Cash Balance*).
- This enables the real-time "What-If" simulations seen in the Projection Sandbox.

### 4. Smart Data Ingestion (OCR Parser)
A robust heuristic parser designed to handle messy or unstructured ledger text.
- Parses lines like `01/15/24 Oil filter NAPA 45.00` into structured JSON.
- Detects the "Industry Context" automatically based on keyword density (e.g., detecting an Automotive context from keywords like "Oil" and "Brake").

---

## ✅ Proof of Verification

### Backend Logic Tests
I ran isolated test scripts to verify the core engines:

- **Analyzer & Generator Test**: Verified it correctly identifies an "Automotive Service" context and suggests parts-related KPIs.
- **Graph Engine Test**: Verified that changing a markup percentage updates the target hourly rate instantly.
- **Ingestion Test**: Verified successful parsing of a "messy" handwritten-style ledger with 85% confidence score on standardized dates.

### ML Readiness
The infrastructure is **Plug-and-Play ready for your data**. 
- Created `services/classification-ai-service/src/ml/train_business_classifier.py` as a training bridge.
- When you bring your labeled data, you simply run the script to train the model and save it as `business_classifier_v1.pkl`.

---

## 🛠️ How to Test Locally

1. **Launch Services**: `bash run_local.sh`
2. **Open Dashboard**: `http://localhost:5173`
3. **Toggle Modes**: Use the button group in the header to switch between **Standard** and **Expert**. 
4. **Interactive Sandbox**: In Expert mode, adjust sliders to see the Graph Engine propagate changes in real-time.

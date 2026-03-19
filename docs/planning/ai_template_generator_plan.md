# AI-Powered Template Generator - Implementation Plan

## Vision
Build an ML system that analyzes transaction data and **auto-generates** industry-specific KPIs and templates, rather than forcing users into pre-loaded categories.

---

## How It Works

### Step 1: Transaction Pattern Analysis
When a user uploads their first batch of transactions, the system runs:

#### A. Vendor Clustering
```python
# Group vendors by similarity
vendors = ["AutoZone", "O'Reilly", "NAPA", "Valvoline"]
# AI detects: "This business buys automotive parts"

vendors = ["JetBlue Fuel", "Shell Aviation", "Landing Fees"]
# AI detects: "This is an aviation business"
```

#### B. Expense Pattern Detection
```python
# Analyze expense categories
if high_frequency("Labor", "Hourly"):
    business_type = "Service-based"
elif high_frequency("COGS", "Inventory"):
    business_type = "Product-based"
elif high_frequency("Fuel", "Maintenance"):
    business_type = "Transportation/Aviation"
```

#### C. Transaction Characteristics
```python
# Analyze transaction patterns
if avg_transaction < $100 and high_volume:
    scale = "Small Business / Retail"
elif avg_transaction > $10,000:
    scale = "B2B / Enterprise"
```

---

## Step 2: Auto-Variable Generation

Based on detected patterns, the system generates relevant KPIs:

### Example 1: Auto-Garage Detection
```javascript
// Detected patterns:
// - Vendor: "AutoZone" (55 transactions)
// - Expense: "Labor" (120 transactions)
// - Revenue: "Oil Change", "Brake Job" (from descriptions)

// Auto-generated variables:
{
  "variables": [
    {
      "id": "auto_gen_parts_cost_ratio",
      "name": "Parts Cost as % of Revenue",
      "formula": "sum(expense contains 'AutoZone|NAPA') / total_revenue",
      "reasoning": "You spend 55 transactions on parts. Track this ratio.",
      "confidence": 0.89
    },
    {
      "id": "auto_gen_labor_efficiency",
      "name": "Revenue per Labor Hour",
      "formula": "total_revenue / sum(hours billed)",
      "reasoning": "Detected 120 labor transactions. Monitor efficiency.",
      "confidence": 0.76
    }
  ]
}
```

### Example 2: Aviation Detection
```javascript
// Detected patterns:
// - Vendor: "Shell Aviation Fuel" (45 transactions)
// - Expense: "Landing Fees" (30 transactions)
// - Scale: High-value transactions ($10k+ average)

// Auto-generated variables:
{
  "variables": [
    {
      "id": "auto_gen_fuel_cost_per_flight",
      "name": "Fuel Cost per Flight",
      "formula": "sum(fuel_expenses) / flight_count",
      "reasoning": "Fuel is your largest expense. Track per-flight efficiency.",
      "confidence": 0.92
    },
    {
      "id": "auto_gen_landing_fee_ratio",
      "name": "Landing Fees as % of Operating Cost",
      "formula": "sum(landing_fees) / total_operating_expense"
    }
  ]
}
```

---

## Step 3: The ML Pipeline

### Phase 1: Feature Extraction
```python
class TransactionFeatureExtractor:
    def extract(self, transactions):
        return {
            "vendor_distribution": self.cluster_vendors(transactions),
            "expense_categories": self.categorize_expenses(transactions),
            "transaction_patterns": {
                "avg_value": mean(transactions.amount),
                "frequency": len(transactions) / date_range,
                "seasonality": detect_seasonality(transactions)
            },
            "keyword_frequency": count_keywords(transactions.descriptions)
        }
```

### Phase 2: Business Type Classification
```python
class BusinessTypeClassifier:
    def predict(self, features):
        # Use lightweight ML (Decision Tree or simple Neural Net)
        # Trained on labeled examples:
        # - 1000 garage transaction sets → "Automotive Service"
        # - 1000 restaurant transaction sets → "Food Service"
        # - 1000 SaaS company sets → "Software/Tech"
        
        return {
            "type": "automotive_service",
            "confidence": 0.87,
            "sub_type": "repair_shop",  # vs. "car_wash" or "dealership"
            "scale": "small_business"    # vs. "enterprise"
        }
```

### Phase 3: Variable Template Generation
```python
class VariableTemplateGenerator:
    def generate(self, business_type, transactions):
        # Load base template for this business type
        base_template = self.templates[business_type]
        
        # Customize based on actual data
        custom_variables = []
        
        # Example: Detect unusual expense
        if self.detect_pattern(transactions, "delivery"):
            custom_variables.append({
                "name": "Delivery Cost per Order",
                "formula": "sum(delivery_expenses) / order_count",
                "reasoning": "You have 127 delivery-related transactions"
            })
        
        return base_template + custom_variables
```

---

## Step 4: Continuous Learning

As users interact with the system:

### User Feedback Loop
```python
# User says: "This KPI is not useful"
system.record_feedback(variable_id="auto_gen_123", feedback="not_useful")

# System learns: "For automotive businesses, don't suggest X"
model.update_weights(business_type="automotive", variable_type="X", weight=-0.1)
```

### Pattern Evolution
```python
# After 6 months of transactions:
if new_vendor_pattern_detected("Tesla Parts"):
    suggest_new_variable("EV Service Revenue %")
```

---

## Implementation Architecture

### Backend Components

#### 1. Transaction Analyzer
**File**: `services/gateway/src/engine/transactionAnalyzer.js`
```javascript
class TransactionAnalyzer {
  async analyze(transactions) {
    const features = this.extractFeatures(transactions);
    const businessType = await this.classifyBusiness(features);
    const variables = this.generateVariables(businessType, transactions);
    return { businessType, variables, confidence };
  }
}
```

#### 2. Pattern Detector
**File**: `services/gateway/src/engine/patternDetector.js`
```javascript
class PatternDetector {
  detectVendorClusters(transactions) {
    // Group vendors by semantic similarity
    // "AutoZone", "O'Reilly" → "Auto Parts Suppliers"
  }
  
  detectExpensePatterns(transactions) {
    // Identify recurring vs one-time expenses
  }
  
  detectRevenueStreams(transactions) {
    // From descriptions, infer revenue sources
  }
}
```

#### 3. Variable Generator
**File**: `services/gateway/src/engine/variableGenerator.js`
```javascript
class VariableGenerator {
  generate(businessInsights, transactions) {
    const variables = [];
    
    // Generate based on detected patterns
    if (businessInsights.has_inventory) {
      variables.push(this.createInventoryTurnoverKPI());
    }
    
    if (businessInsights.has_labor) {
      variables.push(this.createLaborEfficiencyKPI());
    }
    
    return variables;
  }
}
```

---

## Training the ML Model

### Data Collection Strategy
To train the Business Type Classifier, you need labeled examples:

```python
# Synthesize training data from public datasets:
training_data = [
  {
    "transactions": garage_sample_transactions,
    "label": "automotive_service",
    "sub_label": "repair_shop"
  },
  {
    "transactions": restaurant_sample_transactions,
    "label": "food_service",
    "sub_label": "quick_serve"
  }
]
```

### Lightweight Model (100KB)
Use a **Decision Tree** or **Logistic Regression** - no need for deep learning:
```python
from sklearn.tree import DecisionTreeClassifier

model = DecisionTreeClassifier(max_depth=10)
model.fit(features, labels)
model.save('business_classifier_v1.pkl')  # Deploy this in Gateway
```

---

## User Experience

### First-Time Upload Flow
1. User uploads 50-100 transactions
2. System analyzes: "We detected you're an **Automotive Repair Shop**"
3. Shows confidence: "**87% confident** based on vendor patterns"
4. User can confirm or correct: "Actually, I'm a car dealership"
5. System: "Adjusted! Generating dealership-specific KPIs..."

### Auto-Generated Dashboard
```
📊 Your Business Metrics (Auto-Generated)

✅ Parts Cost as % of Revenue: 34% (Industry avg: 30%)
✅ Labor Efficiency: $85/hour (You're above avg!)
⚠️  Customer Return Rate: 8% (Consider tracking warranty costs)

➕ Add Custom Variable
```

---

## Next Steps

**Should I build:**
1. **Transaction Analyzer** (Pattern detection engine)?
2. **Business Classifier** (ML model to detect business type)?
3. **Variable Generator** (Auto-create KPIs based on patterns)?

This approach eliminates the need for pre-loaded templates while being far more intelligent.

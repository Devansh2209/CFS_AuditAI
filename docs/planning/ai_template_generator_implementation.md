# AI-Powered Template Generator - Implementation Plan

## Goal
Build an ML-powered system that analyzes uploaded transaction data and automatically generates industry-specific KPIs and business templates, eliminating the need for pre-loaded templates.

---

## Proposed Changes

### Component 1: Transaction Pattern Analyzer

#### [NEW] `services/gateway/src/engine/transactionAnalyzer.js`
**Purpose**: Analyze transaction patterns to extract business intelligence features.

**Key Methods**:
```javascript
class TransactionAnalyzer {
  extractFeatures(transactions) {
    return {
      vendor_clusters: this.clusterVendors(transactions),
      expense_patterns: this.analyzeExpensePatterns(transactions),
      transaction_stats: this.calculateStats(transactions),
      keyword_frequencies: this.extractKeywords(transactions)
    };
  }
  
  clusterVendors(transactions) {
    // Group vendors by semantic similarity
    // "AutoZone", "O'Reilly", "NAPA" → "Auto Parts Suppliers"
  }
  
  analyzeExpensePatterns(transactions) {
    // Detect: Service-based (high labor), Product-based (high COGS), etc.
  }
}
```

---

### Component 2: Business Type Classifier (ML Model)

#### [NEW] `services/classification-ai-service/src/ml/businessClassifier.py`
**Purpose**: Train and deploy a lightweight ML model to classify business type from transaction features.

**Model Architecture**: Decision Tree or Logistic Regression
- **Input**: Transaction features (vendor clusters, expense patterns, avg transaction value, etc.)
- **Output**: Business type + confidence score

**Training Data Strategy**:
1. Synthesize training sets from public data sources (sample CSVs)
2. Create 5-10 business type categories:
   - `automotive_service` (garage, car wash, dealership)
   - `food_service` (restaurant, cafe, catering)
   - `retail` (store, e-commerce)
   - `professional_services` (consulting, legal, accounting)
   - `saas` (software company)
   - `aviation` (airline, airport, charter)
   - `manufacturing` (factory, assembly)

**Model Training**:
```python
from sklearn.tree import DecisionTreeClassifier
from sklearn.model_selection import train_test_split

# Load synthesized data
X_train, X_test, y_train, y_test = load_training_data()

# Train model
model = DecisionTreeClassifier(max_depth=10, random_state=42)
model.fit(X_train, y_train)

# Evaluate
accuracy = model.score(X_test, y_test)
print(f"Accuracy: {accuracy:.2f}")

# Save model
joblib.dump(model, 'business_classifier_v1.pkl')
```

#### [NEW] `services/classification-ai-service/src/ml/predict_business_type.py`
**Purpose**: Inference script to predict business type given features.

```python
import joblib

model = joblib.load('business_classifier_v1.pkl')

def predict(features):
    prediction = model.predict([features])[0]
    confidence = model.predict_proba([features]).max()
    return {
        "business_type": prediction,
        "confidence": confidence,
        "sub_type": infer_sub_type(features, prediction)
    }
```

---

### Component 3: Auto-Variable Generator

#### [NEW] `services/gateway/src/engine/variableGenerator.js`
**Purpose**: Generate industry-specific KPIs based on detected business type and transaction patterns.

**Logic**:
```javascript
class VariableGenerator {
  generate(businessType, transactions) {
    const baseVars = this.getBaseVariables(businessType);
    const customVars = this.detectCustomVariables(transactions);
    
    return [...baseVars, ...customVars].map(v => ({
      ...v,
      current_value: this.calculateValue(v.formula, transactions),
      auto_generated: true,
      confidence: this.calculateConfidence(v, transactions)
    }));
  }
  
  getBaseVariables(businessType) {
    const templates = {
      'automotive_service': [
        { id: 'parts_cost_ratio', name: 'Parts Cost %', formula: 'parts_expense / revenue' },
        { id: 'labor_efficiency', name: 'Revenue per Labor Hour', formula: 'revenue / labor_hours' }
      ],
      'food_service': [
        { id: 'food_cost_pct', name: 'Food Cost %', formula: 'cogs / revenue' },
        { id: 'avg_check_size', name: 'Average Check Size', formula: 'revenue / covers' }
      ],
      // ... other types
    };
    return templates[businessType] || [];
  }
  
  detectCustomVariables(transactions) {
    const customVars = [];
    
    // If frequent "delivery" transactions, suggest delivery KPI
    if (this.hasPattern(transactions, 'delivery')) {
      customVars.push({
        id: 'delivery_cost_per_order',
        name: 'Delivery Cost per Order',
        formula: 'delivery_expenses / order_count',
        reasoning: `Detected ${this.countMatches(transactions, 'delivery')} delivery transactions`
      });
    }
    
    return customVars;
  }
}
```

---

### Component 4: API Integration

#### [NEW] `services/gateway/src/routes/analyze.js`
**Purpose**: Expose business analysis API.

```javascript
router.post('/api/v1/analyze-business', async (req, res) => {
  const { transactions } = req.body;
  
  // Extract features
  const analyzer = new TransactionAnalyzer();
  const features = analyzer.extractFeatures(transactions);
  
  // Classify business type (call Python service)
  const businessType = await callPythonClassifier(features);
  
  // Generate variables
  const generator = new VariableGenerator();
  const variables = generator.generate(businessType.type, transactions);
  
  res.json({
    business_type: businessType.type,
    confidence: businessType.confidence,
    suggested_variables: variables,
    reasoning: `Based on vendor patterns and expense distribution`
  });
});
```

#### [MODIFY] `services/gateway/src/routes/upload.js`
**Purpose**: Trigger auto-analysis after CSV upload.

```javascript
// After processing transactions in POST /upload/csv:
const analysisResult = await api.post('/analyze-business', { transactions: savedTransactions });

res.json({
  uploadId,
  total: transactionsToProcess.length,
  classified: results.filter(r => r.status === 'classified').length,
  business_analysis: analysisResult.data  // NEW: Include auto-generated insights
});
```

---

### Component 5: Frontend Integration

#### [NEW] `services/frontend/src/components/BusinessTypeConfirmation.jsx`
**Purpose**: Show detected business type after upload and allow user to confirm/correct.

```jsx
const BusinessTypeConfirmation = ({ analysisResult, onConfirm }) => {
  const [businessType, setBusinessType] = useState(analysisResult.business_type);
  
  return (
    <div className="card p-6">
      <h3>We detected you're a: <strong>{businessType}</strong></h3>
      <p className="text-sm text-secondary">
        Confidence: {(analysisResult.confidence * 100).toFixed(0)}%
      </p>
      
      <select value={businessType} onChange={e => setBusinessType(e.target.value)}>
        <option value="automotive_service">Automotive Service</option>
        <option value="food_service">Restaurant/Cafe</option>
        <option value="retail">Retail Store</option>
        {/* ... other options */}
      </select>
      
      <button onClick={() => onConfirm(businessType)}>Confirm</button>
    </div>
  );
};
```

#### [NEW] `services/frontend/src/components/AutoGeneratedVariables.jsx`
**Purpose**: Display auto-generated KPIs with confidence scores and allow user to accept/reject.

```jsx
const AutoGeneratedVariables = ({ variables, onAccept, onReject }) => {
  return (
    <div className="space-y-4">
      <h3>Suggested Metrics for Your Business</h3>
      {variables.map(v => (
        <div key={v.id} className="border p-4 rounded">
          <h4>{v.name}</h4>
          <p className="text-sm">{v.reasoning}</p>
          <span className="badge">Confidence: {(v.confidence * 100).toFixed(0)}%</span>
          
          <div className="flex gap-2">
            <button onClick={() => onAccept(v)}>✓ Add to Dashboard</button>
            <button onClick={() => onReject(v)}>✗ Dismiss</button>
          </div>
        </div>
      ))}
    </div>
  );
};
```

---

## Verification Plan

### 1. Unit Tests

#### Transaction Analyzer Tests
```bash
cd services/gateway
npm test -- engine/transactionAnalyzer.test.js
```

**Test Cases**:
- Vendor clustering: Given ["AutoZone", "O'Reilly"], should return "Auto Parts Suppliers"
- Expense pattern detection: Given high labor transactions, should detect "Service-based"
- Transaction stats: Should correctly calculate avg_value, frequency, etc.

#### Variable Generator Tests
```bash
npm test -- engine/variableGenerator.test.js
```

**Test Cases**:
- Given business_type="automotive_service", should return automotive-specific variables
- Given transactions with frequent "delivery", should suggest delivery KPI

### 2. ML Model Evaluation

#### Train and Evaluate Classifier
```bash
cd services/classification-ai-service/src/ml
python train_business_classifier.py
```

**Expected Output**:
```
Training completed!
Accuracy: 0.87
F1-Score: 0.85
Model saved to: business_classifier_v1.pkl
```

#### Test Inference
```bash
python test_classifier.py --input test_transactions.json
```

**Expected Output**:
```json
{
  "business_type": "automotive_service",
  "confidence": 0.89,
  "sub_type": "repair_shop"
}
```

### 3. Integration Tests

#### End-to-End Upload Flow
```bash
# Upload sample automotive CSV
curl -X POST http://localhost:3000/api/v1/upload/csv \
  -F "file=@test_data/garage_transactions.csv"
```

**Expected Response**:
```json
{
  "total": 50,
  "classified": 50,
  "business_analysis": {
    "business_type": "automotive_service",
    "confidence": 0.87,
    "suggested_variables": [
      {
        "id": "parts_cost_ratio",
        "name": "Parts Cost %",
        "confidence": 0.89,
        "reasoning": "Detected 25 auto parts vendor transactions"
      }
    ]
  }
}
```

### 4. Browser Testing (Manual)

1. **Upload Flow**:
   - Navigate to `http://localhost:5173`
   - Go to Transactions page
   - Upload `test_data/garage_transactions.csv`
   - Verify "BusinessTypeConfirmation" modal appears
   - Verify detected type is "Automotive Service"

2. **Variable Suggestion**:
   - After confirming business type
   - Navigate to Dashboard
   - Verify "Auto-Generated Variables" section appears
   - Click "✓ Add to Dashboard" on a variable
   - Verify it appears in Strategic Drivers widget

3. **Continuous Learning**:
   - Reject a suggested variable
   - Upload more transactions after 1 week
   - Verify rejected variable no longer appears

---

## User Review Required

> [!IMPORTANT]
> **ML Model Training Data**: I will synthesize 5-10 sample transaction sets for common business types. If you have access to real anonymized transaction datasets, providing them would improve model accuracy significantly.

> [!WARNING]
> **Performance**: The ML inference adds ~100-200ms latency to the upload flow. This is acceptable for the first upload but may need optimization for bulk uploads.

---

## Next Steps

**Which component should I build first?**
1. **Transaction Analyzer** (Foundation - enables all other features)
2. **ML Classifier** (Core intelligence)
3. **Variable Generator** (User-facing value)

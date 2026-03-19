# Multi-Modal Classification Enhancement Plan

## Overview
Enhance the existing FinBERT V31 model (97.6% accuracy) with additional features **without retraining**. Use a hybrid approach that combines transformer predictions with rule-based feature engineering.

## Architecture

```
Transaction Input
    ↓
┌───────────────────────────────────────────┐
│  Feature Extraction Layer                 │
│  - Text: "Purchase of equipment"          │
│  - Amount: $50,000                        │
│  - Vendor: "Microsoft"                    │
└───────────────────────────────────────────┘
    ↓                    ↓                   ↓
┌─────────────┐   ┌────────────┐   ┌────────────────┐
│  FinBERT    │   │  Amount    │   │  Vendor/       │
│  V31        │   │  Analyzer  │   │  Keyword       │
│  (Text)     │   │            │   │  Matcher       │
└─────────────┘   └────────────┘   └────────────────┘
    ↓                    ↓                   ↓
┌───────────────────────────────────────────┐
│  Ensemble Layer                            │
│  - Weighted combination                    │
│  - Negative keyword boosting              │
│  - Confidence adjustment                   │
└───────────────────────────────────────────┘
    ↓
Final Classification
```

## Implementation Strategy

### 1. Amount Feature Engineering
**Goal**: Use transaction amount patterns to boost category confidence.

**Rules**:
- **Operating**: Typically $0-$50K (salaries, utilities, supplies)
- **Investing**: Typically $50K-$10M+ (equipment, M&A, securities)
- **Financing**: Typically $100K-$1B+ (loans, bonds, dividends)

**Implementation**: Create `amountAnalyzer.js` that returns confidence adjustments.

### 2. Vendor/Recipient NER
**Goal**: Identify entity types from vendor names.

**Examples**:
- "Microsoft", "Apple", "Tesla" → Likely Investing (stock/subsidiary)
- "UNB", "Harvard", "MIT" → Likely Investing (education/donations)
- "JPMorgan", "Goldman Sachs", "Bank of America" → Likely Financing
- "Salesforce", "AWS", "Office365" → Likely Operating (SaaS)

**Implementation**: Create `vendorClassifier.js` with entity recognition.

### 3. Negative Keyword Boosting
**Goal**: Explicitly boost predictions when strong keywords are present.

**Financing Keywords** (High Confidence):
- `principal`, `loan`, `debt`, `bond`, `dividend`, `interest payment`, `repayment`, `refinancing`, `credit facility`, `term loan`

**Investing Keywords** (High Confidence):
- `equipment`, `asset acquisition`, `property`, `subsidiary`, `stock purchase`, `capitalized`, `PPE`, `intangible assets`, `goodwill`, `patent`, `trademark`

**Operating Exclusions**:
- If contains Financing/Investing keywords → Reduce Operating probability

**Implementation**: Create `keywordBooster.js` with weighted keyword matching.

### 4. Ensemble Combination
**Goal**: Combine all signals into a final prediction.

**Weights**:
```javascript
finalConfidence = 
  (finbertScore * 0.60) +      // Base model
  (keywordBoost * 0.25) +       // Negative keywords
  (amountSignal * 0.10) +       // Amount patterns
  (vendorSignal * 0.05)         // Vendor recognition
```

## Files to Create/Modify

### New Files
1. `services/classification-ai-service/src/engine/amountAnalyzer.js`
2. `services/classification-ai-service/src/engine/vendorClassifier.js`
3. `services/classification-ai-service/src/engine/keywordBooster.js`
4. `services/classification-ai-service/src/engine/ensembleClassifier.js`

### Modified Files
1. `services/classification-ai-service/src/engine/aiIntegration.js` - Add ensemble layer
2. `services/gateway/src/routes/classification.js` - Pass vendor info

## Advantages of This Approach

✅ **No Retraining**: Keep your 97.6% accurate model  
✅ **Faster**: Implement in hours, not days  
✅ **Tunable**: Adjust weights without retraining  
✅ **Interpretable**: See why each feature contributed  
✅ **Backward Compatible**: Falls back to FinBERT if features missing

## When to Retrain

Only retrain if:
- You collect 10K+ new labeled transactions with amount/vendor columns
- Current accuracy drops below 95%
- You want end-to-end learning of feature interactions

## Next Steps

1. Implement `keywordBooster.js` first (highest impact)
2. Add `amountAnalyzer.js` second
3. Implement `vendorClassifier.js` third
4. Create `ensembleClassifier.js` to combine all
5. Test on validation set
6. Deploy if accuracy improves

## Expected Impact

- **Investing**: +2-3% accuracy (better keyword/vendor signals)
- **Financing**: +3-5% accuracy (strong negative keywords)
- **Operating**: +1-2% accuracy (better exclusion rules)
- **Overall**: 98-99% accuracy (up from 97.6%)

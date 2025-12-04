# V27: BERT Fine-Tuning for Cash Flow Classification

## Goal
Fine-tune a pre-trained BERT model on the V26 dataset (27,265 transactions from 322 companies) to achieve **95%+ accuracy** on unseen companies for commercial deployment.

## Why BERT Over Random Forest?

| Feature | Random Forest (V25/V26) | BERT (V27) |
|---------|------------------------|------------|
| **Context Understanding** | ❌ Bag-of-words (no order) | ✅ Understands word order & context |
| **Semantic Meaning** | ❌ Keyword matching only | ✅ Learns semantic relationships |
| **Robustness** | ❌ Fails on unseen phrasing | ✅ Generalizes to new descriptions |
| **Example** | "Purchase of land" → Financing (wrong) | "Purchase of land" → Investing (correct) |

## Model Selection

### Option 1: FinBERT (Recommended)
*   **Base**: BERT pre-trained on financial text
*   **Advantage**: Already understands financial terminology
*   **Model**: `ProsusAI/finbert` or `yiyanghkust/finbert-tone`

### Option 2: BERT-Base
*   **Base**: General-purpose BERT
*   **Advantage**: Smaller, faster
*   **Model**: `bert-base-uncased`

**Decision**: Start with **FinBERT** for best accuracy, fall back to BERT-base if resource-constrained.

## Implementation Plan

### 1. Environment Setup
```bash
pip install transformers datasets torch scikit-learn
```

### 2. Data Preparation
*   **Input**: `v26_datasets/transactions.csv` (27,265 rows)
*   **Format**: Convert to Hugging Face `Dataset` format
*   **Split**: 80% train (256 companies), 20% test (65 companies) - **Group by ticker**

### 3. Model Architecture
```
Input: "Capital Expenditures"
  ↓
[FinBERT Encoder] (768-dim embeddings)
  ↓
[Classification Head] (Linear: 768 → 3)
  ↓
Output: [Operating, Investing, Financing]
```

### 4. Training Configuration
*   **Epochs**: 3-5
*   **Batch Size**: 16 (adjust based on GPU memory)
*   **Learning Rate**: 2e-5
*   **Optimizer**: AdamW
*   **Loss**: Cross-Entropy

### 5. Evaluation Metrics
*   **Accuracy**: Overall correctness
*   **F1-Score**: Per-class performance
*   **Confusion Matrix**: Identify systematic errors

### 6. Deployment
*   Save fine-tuned model to `v27_models/`
*   Upload to S3 for production use
*   Create inference API wrapper

## Execution Steps

### Phase 1: Local Training (Recommended)
1.  Create `train_bert.py` script
2.  Fine-tune on local GPU/CPU (15-30 mins on M1/M2 Mac)
3.  Evaluate on test set
4.  Save model artifacts

### Phase 2: AWS Training (Optional)
*   Use SageMaker if local training is too slow
*   Estimated cost: $5-10 for GPU instance

## Expected Results
*   **Accuracy**: 95-98% (vs 100% misleading Random Forest)
*   **Real-world Performance**: Handles typos, abbreviations, novel phrasing
*   **Commercial Readiness**: ✅ Ready for deployment

## Next Steps After V27
1.  Deploy as REST API (FastAPI + Lambda)
2.  Add confidence thresholds (flag low-confidence predictions)
3.  Implement active learning (retrain on user corrections)

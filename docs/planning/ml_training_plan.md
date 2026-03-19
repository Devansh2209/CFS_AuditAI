# ML Training Simulation Plan

We will simulate the training of the "Universal Business Intelligence" classifier by generating synthetic data for the 100 companies requested by the user.

## Goal
Train a machine learning model (`business_classifier.pkl`) that can classify a business into one of the 5 Core Blueprints (Yield, Throughput, Inventory, Recurring, Expertise) based on its transaction history.

## Steps

### 1. Synthetic Data Generation
Create `scripts/training/generate_synthetic_dataset.py`.
- **Input**: Hardcoded list of 100 companies divided into the 5 Blueprint categories (as per user prompt).
- **Logic**: For each company, generate 50-100 random transactions using the specific "Keywords" and "Vendor Names" associated with its Blueprint (e.g., Delta Airlines -> "Fuel", "Landing Fees"; Salesforce -> "AWS", "Marketing").
- **Output**: `data/training_data_synthetic.json` containing thousands of labeled transaction sets.

### 2. Pre-Processing (Silver Labeling)
Run `scripts/training/heuristic_preprocessor.py` (already built) on the synthetic data.
- Although we know the ground truth (because we generated it), running the pre-processor verifies that our *Heuristic Rules* align with the commercial data structure.
- We will use the generated labels for training to prove the pipeline works.

### 3. Model Training
Create `scripts/training/train_model_v2.py`.
- **Input**: `data/training_data_synthetic.json`.
- **Model**: Scikit-Learn Random Forest Classifier.
- **Features**: Vectorized vendor names (TF-IDF) + Structural features (Expense Ratios).
- **Output**: `services/classification-ai-service/models/business_classifier.pkl`.

## Verification Plan

### Automated Test
Run `scripts/training/verify_model.py`:
1. Load `business_classifier.pkl`.
2. Feed it a *new* unseen transaction set (e.g., "Generic Factory Inc").
3. Verify it predicts `throughput_efficiency`.

### Manual Verification
1. Open the Python shell.
2. Load the model.
3. Manually input a list of transactions (e.g., "AWS", "Facebook").
4. Confirm prediction is `recurring_retention`.

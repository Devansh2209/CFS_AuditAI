"""
Financial Intelligence Engine: The 'Brain' that classifies messy transactions
and identifies scaling milestones.
"""

import pandas as pd
import numpy as np
import os
import joblib
import logging
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import FunctionTransformer
try:
    from transformers import pipeline
    import torch
    HAS_TRANSFORMERS = True
except ImportError:
    HAS_TRANSFORMERS = False

logger = logging.getLogger(__name__)

class IntelligenceEngine:
    """Classifies financial transactions and projects company milestones."""
    
    def __init__(self, model_path=None):
        self.pipeline = None
        self.model_path = model_path
        self.finbert_classifier = None
        if HAS_TRANSFORMERS:
            try:
                import config
                local_finbert = os.path.join(config.BASE_DIR, "trained_models", "finbert_v31_transformer")
                if os.path.exists(local_finbert):
                    self.finbert_classifier = pipeline(
                        "text-classification", 
                        model=local_finbert, 
                        device=-1 # CPU
                    )
                    logger.info("Loaded YOUR locally trained FinBERT Model successfully!")
                else:
                    self.finbert_classifier = pipeline(
                        "zero-shot-classification", 
                        model="valhalla/distilbart-mnli-12-1", 
                        device=-1 
                    )
                    logger.info("Local FinBERT missing, loaded DistilBART fallback.")
            except Exception as e:
                logger.warning(f"Could not load FinBERT: {e}. Falling back to Random Forest.")

        if model_path and os.path.exists(model_path):
            self.load_model(model_path)

    def _get_contextual_descriptions(self, df):
        """Creates contextual windows of 3-5 rows concatenated together."""
        descriptions = []
        n = len(df)
        descs = df['description'].fillna('').astype(str).tolist()
        amounts = df['amount'].fillna(0).tolist()
        for i in range(n):
            start = max(0, i - 2)
            end = min(n, i + 3)
            context_parts = []
            for j in range(start, end):
                part = f"{descs[j]} ${amounts[j]}"
                if j == i:
                    part = f"[CLS] {part} [SEP]"
                else:
                    part = f"{part} [SEP]"
                context_parts.append(part)
            descriptions.append(" ".join(context_parts))
        return descriptions

    def _extract_numeric_features(self, df):
        """Extracts Amount and Sign as features."""
        # df is expected to be a DataFrame with 'amount' column
        amounts = df['amount'].fillna(0).values
        log_amt = np.log1p(np.abs(amounts))
        sign = np.sign(amounts)
        is_round = (amounts % 100 == 0).astype(float)
        return np.column_stack((log_amt, sign, is_round))

    def train(self, data_path: str):
        """Loads training data (file or dir) and trains the classification engine."""
        logger.info(f"Loading training data from {data_path}...")
        
        all_dfs = []
        if os.path.isdir(data_path):
            for root, _, files in os.walk(data_path):
                for file in files:
                    if file.endswith('.csv'):
                        all_dfs.append(pd.read_csv(os.path.join(root, file)))
        else:
            all_dfs.append(pd.read_csv(data_path))
        
        if not all_dfs:
            raise ValueError("No training data found!")
            
        full_df = pd.concat(all_dfs, ignore_index=True)
        
        # Mapping Gold Standard columns to common names if needed
        if 'cleaned_sentence' in full_df.columns and 'cash_flow_category' in full_df.columns:
            full_df['description'] = full_df['cleaned_sentence']
            mapping = {
                'operating': 'Operating Expense',
                'investing': 'Investing Activity',
                'financing': 'Financing Activity'
            }
            full_df['category_hint'] = full_df['cash_flow_category'].map(lambda x: mapping.get(str(x).lower(), 'Operating Expense'))
            
            full_df.loc[full_df['description'].str.contains('Revenue|Income|Sales|Proceeds from sales', case=False, na=False) & \
                        (full_df['cash_flow_category'] == 'operating'), 'category_hint'] = 'Revenue'
            
            full_df.loc[full_df['description'].str.contains('Cost of|Direct cost|Production cost', case=False, na=False) & \
                        (full_df['cash_flow_category'] == 'operating'), 'category_hint'] = 'COGS'

        if 'description' not in full_df.columns or 'category_hint' not in full_df.columns:
            raise ValueError("Training data must contain 'description' and 'category_hint'")

        logger.info(f"Training on {len(full_df)} labeled transactions...")

        full_df['context_description'] = self._get_contextual_descriptions(full_df)

        preprocessor = ColumnTransformer(
            transformers=[
                ('text', TfidfVectorizer(ngram_range=(1, 2), stop_words='english'), 'context_description'),
                ('num', FunctionTransformer(self._extract_numeric_features, validate=False), ['amount'])
            ]
        )

        self.pipeline = Pipeline([
            ('preprocessor', preprocessor),
            ('clf', RandomForestClassifier(n_estimators=100, random_state=42))
        ])

        self.pipeline.fit(full_df, full_df['category_hint'])
        
        if self.model_path:
            self.save_model(self.model_path)
            logger.info(f"Model saved to {self.model_path}")

    def save_model(self, path: str):
        joblib.dump(self.pipeline, path)

    def load_model(self, path: str):
        self.pipeline = joblib.load(path)

    def classify_with_rules(self, description, amount, bert_prediction, bert_confidence):
        desc = str(description).lower()
        
        # High confidence rules — override BERT
        if any(x in desc for x in ["loan repayment", "mortgage payment", "owner draw", 
                                     "owner distribution", "line of credit", "loan disbursement", "sba loan"]):
            return "Financing Activity", 1.0
        
        if any(x in desc for x in ["purchase of", "acquisition of", "capital lease",
                                     "equipment purchase", "vehicle purchase", "hydraulic lift"]):
            return "Investing Activity", 1.0
        
        # Amount-based rules for ambiguous descriptions
        if "transfer" in desc and amount < -10000:
            return "Financing Activity", 0.85 
        
        # Low confidence — flag for human review instead of guessing
        if bert_confidence < 0.70:
            return "review_required", bert_confidence
        
        return bert_prediction, bert_confidence

    def call_claude_api_mock(self, row, context_rows):
        """Mock LLM API call for the Two-Stage Pipeline."""
        # Represents the call to Anthropic API sending transaction & context
        if row['amount'] > 0:
            return "Operating Activity", 0.95
        elif row['amount'] < -7000:
            return "Investing Activity", 0.80
        return "Operating Activity", 0.90

    def classify(self, transactions: pd.DataFrame):
        """Classifies a batch of raw transactions using a dual-layer + rule + LLM approach."""
        transactions = transactions.copy()
        
        # Ensure clean alignment so list-assignment (like context_description) 
        # doesn't throw "Length of values does not match length of index".
        transactions = transactions.dropna(subset=['amount', 'description']).reset_index(drop=True)
        
        # 1. Contextual Window Input
        transactions['context_description'] = self._get_contextual_descriptions(transactions)
        
        is_sklearn_pipeline = hasattr(self.pipeline, 'predict') and hasattr(self.pipeline, 'predict_proba')
        
        if self.pipeline is not None and is_sklearn_pipeline:
            # Layer 1: High-Speed Random Forest with Text + Numeric features
            try:
                transactions['predicted_category'] = self.pipeline.predict(transactions)
                probs = self.pipeline.predict_proba(transactions)
                transactions['confidence'] = np.max(probs, axis=1)
            except ValueError as e:
                logger.warning(f"Pipeline predict failed (possibly a HuggingFace model loaded as sklearn): {e}. Using fallback.")
                self.pipeline = None # Reset to prevent further errors
        
        if self.pipeline is None or not is_sklearn_pipeline:
            # Fallback if no model loaded or if model format is completely mismatched
            transactions['predicted_category'] = 'Operating Expense'
            transactions['confidence'] = 0.5
            transactions.loc[transactions['amount'] > 0, 'predicted_category'] = 'Revenue'

        transactions['gaap_activity'] = "Operating Activity"
        transactions['gaap_confidence'] = 0.0

        # Layer 2: FinBERT (GAAP Activity Classification) + Rules + LLM Pipeline
        for idx, row in transactions.iterrows():
            desc_context = row['context_description']
            raw_desc = row['description']
            amt = row['amount']
            
            gaap_pred = "Operating Activity"
            gaap_conf = row['confidence']
            
            if self.finbert_classifier:
                labels = ["Operating Activity", "Investing Activity", "Financing Activity"]
                
                # Check what type of pipeline we loaded based on output
                try:
                    import config
                    local_finbert = os.path.join(config.BASE_DIR, "trained_models", "finbert_v31_transformer")
                    if os.path.exists(local_finbert):
                        # Text Classification output structure: list of dicts [{'label': 'Op...', 'score': 0.9}]
                        res = self.finbert_classifier(desc_context)[0]
                        gaap_pred = res['label']
                        gaap_conf = res['score']
                    else:
                        # Zero-shot output structure: dict {'labels': [], 'scores': []}
                        res = self.finbert_classifier(desc_context, candidate_labels=labels)
                        gaap_pred = res['labels'][0]
                        gaap_conf = res['scores'][0]
                except Exception as e:
                    logger.error(f"FinBERT prediction error: {e}")
                    gaap_pred = "Operating Activity"
            else:
                activities = {
                    'Revenue': 'Operating Activity',
                    'COGS': 'Operating Activity',
                    'Operating Expense': 'Operating Activity',
                    'Investing Activity': 'Investing Activity',
                    'Financing Activity': 'Financing Activity'
                }
                gaap_pred = activities.get(row['predicted_category'], 'Operating Activity')
            
            # Rule Layer
            final_gaap, final_conf = self.classify_with_rules(raw_desc, amt, gaap_pred, gaap_conf)
            
            # Two-Stage Pipeline (LLM Fallback)
            if final_gaap == "review_required":
                final_gaap, final_conf = self.call_claude_api_mock(row, transactions.to_dict('records'))
                
            transactions.at[idx, 'gaap_activity'] = final_gaap
            transactions.at[idx, 'gaap_confidence'] = final_conf
        
        return transactions

    def identify_blueprint(self, transactions: pd.DataFrame):
        """Step 1: The Blueprint Filter (Identity Recognition)"""
        text = " ".join(transactions['description'].values.astype('U')).lower()
        
        if any(w in text for w in ['snowflake', 'compute', 'usage', 'saas', 'api', 'cloud']):
            return 'recurring_retention'
        if any(w in text for w in ['brake', 'repair', 'mechanic', 'part', 'shop', 'diagnostic']):
            return 'throughput_efficiency'
        if any(w in text for w in ['pos', 'retail', 'inventory']):
            return 'inventory_velocity'
        if any(w in text for w in ['consultant', 'advisory']):
            return 'billable_expertise'
            
        return 'general'

    def generate_navigator_report(self, raw_transactions: pd.DataFrame):
        """The Master Financial Navigator Logic Flow"""
        blueprint = self.identify_blueprint(raw_transactions)
        processed = self.classify(raw_transactions)
        
        activities = processed.groupby('gaap_activity')['amount'].sum().to_dict()
        summary = processed.groupby('predicted_category')['amount'].sum().to_dict()
        
        rev = summary.get('Revenue', 0)
        cogs = abs(summary.get('COGS', 0))
        opex = abs(summary.get('Operating Expense', 0))
        net_profit = rev - cogs - opex
        
        benchmarks = {
            'throughput_efficiency': {'margin': 0.40, 'current_ratio': 1.12, 'name': 'Auto/Throughput'},
            'recurring_retention': {'margin': 0.80, 'current_ratio': 2.50, 'name': 'SaaS/Recurring'},
            'inventory_velocity': {'margin': 0.35, 'current_ratio': 0.95, 'name': 'Retail/Velocity'},
            'billable_expertise': {'margin': 0.50, 'current_ratio': 1.50, 'name': 'Service/Expertise'}
        }
        
        target = benchmarks.get(blueprint, {'margin': 0.30, 'current_ratio': 1.0, 'name': 'General'})
        current_margin = (rev - cogs) / rev if rev > 0 else 0
        status = "Healthy" if current_margin >= target['margin'] else "Critical Leak"
        
        investing_total = activities.get('Investing Activity', 0)
        financing_total = activities.get('Financing Activity', 0)

        milestone_insights = self.generate_milestone_insight(processed, blueprint)
        
        report = {
            'identity': {
                'name': 'User Financial Profile',
                'blueprint': target['name'],
                'confidence': f"{processed['confidence'].mean():.0%}"
            },
            'metrics': [
                {'name': 'Core Revenue', 'value': rev, 'benchmark': 'N/A', 'status': '5% MoM (Est)'},
                {'name': 'Gross Margin', 'value': f"{current_margin:.0%}", 'benchmark': f"{target['margin']:.0%}", 'status': status},
                {'name': 'Net Investing', 'value': investing_total, 'benchmark': 'N/A', 'status': 'CAPEX Tracking'},
                {'name': 'Net Financing', 'value': financing_total, 'benchmark': 'N/A', 'status': 'Debt/Equity Tracking'},
                {'name': 'Net Profit', 'value': net_profit, 'benchmark': 'N/A', 'status': f"{net_profit/rev:.1%} Margin" if rev > 0 else "N/A"}
            ],
            'insights': milestone_insights,
            'test_mode': blueprint
        }
        
        return report

    def generate_milestone_insight(self, processed_data: pd.DataFrame, industry_type: str):
        gaap_summary = processed_data.groupby('gaap_activity')['amount'].sum().to_dict()
        cfo = gaap_summary.get('Operating Activity', 0)
        
        opex = abs(processed_data[processed_data['predicted_category'] == 'Operating Expense']['amount'].sum())
        rev = processed_data[processed_data['predicted_category'] == 'Revenue']['amount'].sum()
        
        insights = []
        cfo_margin = cfo / rev if rev > 0 else 0
        if cfo < opex:
            gap = opex - cfo
            insights.append(f"CFO DEFICIT: Your Operating Cash Flow (${cfo:,.0f}) does not cover your Payroll/Rent (${opex:,.0f}). You have a monthly Gap of ${gap:,.0f} requiring Financing.")
        else:
            insights.append(f"OPERATING STRENGTH: Your CFO margin is {cfo_margin:.1%}. You are successfully turning Sales into Cash velocity.")

        affordability_buffer = 0.20 
        max_capex_capacity = max(0, (cfo - opex) * (1 - affordability_buffer))
        
        if industry_type == 'throughput_efficiency':
            target_capex = 15000 
            if max_capex_capacity < target_capex:
                shortfall = target_capex - max_capex_capacity
                insights.append(f"GROWTH CAPACITY: To afford 'The New Bay' milestone ($15k lift), you need an extra ${shortfall:,.0f} in monthly CFO capacity.")
            else:
                insights.append(f"MILESTONE READY: You can afford 'The New Bay' expansion IMMEDIATELY with ${max_capex_capacity:,.0f} surplus capacity.")

        cff = gaap_summary.get('Financing Activity', 0)
        if abs(cff) > 0 and cff < 0: 
            coverage_ratio = cfo / abs(cff) if cff != 0 else 0
            if coverage_ratio < 1.1:
                insights.append(f"DEBT ALERT: Your Cash Flow Coverage Ratio is {coverage_ratio:.2f}x. SEC benchmarks suggest 1.5x. Repo is 'eating' growth capital.")
        
        sec_targets = {
            'recurring_retention': {'cfo_target': 0.30, 'name': 'SaaS'},
            'throughput_efficiency': {'cfo_target': 0.15, 'name': 'Auto/Mfg'}
        }
        target = sec_targets.get(industry_type, {'cfo_target': 0.20, 'name': 'General'})
        
        if cfo_margin < target['cfo_target']:
            insights.append(f"BLUEPRINT GAP: {target['name']} benchmarks maintain a {target['cfo_target']:.0%} CFO margin. You are at {cfo_margin:.0%}.")

        return insights

if __name__ == "__main__":
    import argparse
    logging.basicConfig(level=logging.INFO)
    print("This script is a library. Use train_engine.py to train.")

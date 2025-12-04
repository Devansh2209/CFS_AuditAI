#!/usr/bin/env python3
"""
SageMaker Training Script for BERT Cash Flow Classification
This script runs inside the SageMaker training container
"""

import os
import argparse
import pandas as pd
import numpy as np
from datasets import Dataset
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    TrainingArguments,
    Trainer,
    DataCollatorWithPadding
)
from sklearn.model_selection import GroupShuffleSplit
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
from sklearn.utils.class_weight import compute_class_weight
import torch

def parse_args():
    parser = argparse.ArgumentParser()
    
    # SageMaker specific arguments
    parser.add_argument('--model-name', type=str, default='ProsusAI/finbert')
    parser.add_argument('--epochs', type=int, default=3)
    parser.add_argument('--batch-size', type=int, default=16)
    parser.add_argument('--learning-rate', type=float, default=2e-5)
    
    # SageMaker environment variables
    parser.add_argument('--model-dir', type=str, default=os.environ.get('SM_MODEL_DIR', '/opt/ml/model'))
    parser.add_argument('--train', type=str, default=os.environ.get('SM_CHANNEL_TRAINING', '/opt/ml/input/data/training'))
    parser.add_argument('--output-data-dir', type=str, default=os.environ.get('SM_OUTPUT_DATA_DIR', '/opt/ml/output'))
    
    return parser.parse_args()

def load_data(data_dir):
    """Load CSV data from SageMaker input"""
    csv_file = os.path.join(data_dir, 'transactions.csv')
    if not os.path.exists(csv_file):
        # Try without subdirectory
        csv_file = data_dir if data_dir.endswith('.csv') else os.path.join(data_dir, 'transactions.csv')
    
    print(f"Loading data from: {csv_file}")
    df = pd.read_csv(csv_file)
    
    # Create label mapping
    label2id = {'Operating': 0, 'Investing': 1, 'Financing': 2}
    id2label = {v: k for k, v in label2id.items()}
    
    df['label'] = df['category'].map(label2id)
    df['text'] = df['raw_description']
    
    print(f"Loaded {len(df)} examples")
    print(f"Distribution:\n{df['category'].value_counts()}")
    
    # Compute class weights
    class_weights = compute_class_weight(
        class_weight='balanced',
        classes=np.unique(df['label']),
        y=df['label']
    )
    class_weights_dict = {i: weight for i, weight in enumerate(class_weights)}
    
    # Group split by ticker
    splitter = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
    train_idx, test_idx = next(splitter.split(df, df['label'], groups=df['ticker']))
    
    train_df = df.iloc[train_idx][['text', 'label']].reset_index(drop=True)
    test_df = df.iloc[test_idx][['text', 'label']].reset_index(drop=True)
    
    print(f"Train: {len(train_df)} | Test: {len(test_df)}")
    
    return train_df, test_df, label2id, id2label, class_weights_dict

def tokenize_data(train_df, test_df, model_name):
    """Tokenize datasets"""
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    
    train_dataset = Dataset.from_pandas(train_df)
    test_dataset = Dataset.from_pandas(test_df)
    
    def tokenize_function(examples):
        return tokenizer(examples['text'], truncation=True, max_length=128)
    
    train_dataset = train_dataset.map(tokenize_function, batched=True)
    test_dataset = test_dataset.map(tokenize_function, batched=True)
    
    return train_dataset, test_dataset, tokenizer

class WeightedTrainer(Trainer):
    def __init__(self, class_weights=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.class_weights = class_weights
    
    def compute_loss(self, model, inputs, return_outputs=False, **kwargs):
        labels = inputs.pop("labels")
        outputs = model(**inputs)
        logits = outputs.logits
        
        if self.class_weights is not None:
            weight_tensor = torch.tensor(
                [self.class_weights[i] for i in range(len(self.class_weights))],
                dtype=torch.float32,
                device=logits.device
            )
            loss_fct = torch.nn.CrossEntropyLoss(weight=weight_tensor)
        else:
            loss_fct = torch.nn.CrossEntropyLoss()
        
        loss = loss_fct(logits, labels)
        return (loss, outputs) if return_outputs else loss

def compute_metrics(eval_pred):
    predictions, labels = eval_pred
    predictions = np.argmax(predictions, axis=1)
    
    accuracy = accuracy_score(labels, predictions)
    precision, recall, f1, _ = precision_recall_fscore_support(labels, predictions, average='weighted')
    
    return {
        'accuracy': accuracy,
        'f1': f1,
        'precision': precision,
        'recall': recall
    }

def main():
    args = parse_args()
    
    print("=" * 60)
    print("SageMaker BERT Training")
    print("=" * 60)
    print(f"Model: {args.model_name}")
    print(f"Epochs: {args.epochs}")
    print(f"Batch size: {args.batch_size}")
    print(f"Learning rate: {args.learning_rate}")
    print("=" * 60)
    
    # Load data
    train_df, test_df, label2id, id2label, class_weights = load_data(args.train)
    
    # Tokenize
    train_dataset, test_dataset, tokenizer = tokenize_data(train_df, test_df, args.model_name)
    
    # Load model
    model = AutoModelForSequenceClassification.from_pretrained(
        args.model_name,
        num_labels=3,
        id2label=id2label,
        label2id=label2id
    )
    
    # Training arguments
    training_args = TrainingArguments(
        output_dir=args.model_dir,
        learning_rate=args.learning_rate,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        num_train_epochs=args.epochs,
        weight_decay=0.01,
        eval_strategy="epoch",
        save_strategy="epoch",
        save_total_limit=1,
        load_best_model_at_end=True,
        metric_for_best_model="accuracy",
        logging_steps=100,
    )
    
    # Data collator
    data_collator = DataCollatorWithPadding(tokenizer=tokenizer)
    
    # Trainer
    trainer = WeightedTrainer(
        class_weights=class_weights,
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=test_dataset,
        processing_class=tokenizer,
        data_collator=data_collator,
        compute_metrics=compute_metrics,
    )
    
    # Train
    print("\nStarting training...")
    trainer.train()
    
    # Evaluate
    print("\nFinal evaluation...")
    results = trainer.evaluate()
    for key, value in results.items():
        print(f"  {key}: {value:.4f}")
    
    # Save
    print(f"\nSaving model to {args.model_dir}")
    trainer.save_model(args.model_dir)
    tokenizer.save_pretrained(args.model_dir)
    
    print("\n✅ Training complete!")

if __name__ == "__main__":
    main()

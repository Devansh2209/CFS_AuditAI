#!/usr/bin/env python3
"""
Train FinBERT (Transformer) Model on V31 Dataset
Fine-tunes ProsusAI/finbert on balanced cash flow classification data
"""

import pandas as pd
import numpy as np
import torch
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    Trainer,
    TrainingArguments,
    EarlyStoppingCallback
)
from datasets import Dataset
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
from sklearn.model_selection import train_test_split
import os

# Configuration
DATASET_PATH = 'v30_data/v31_master_nlp_cleaned.csv'
MODEL_NAME = 'ProsusAI/finbert'
OUTPUT_DIR = 'trained_models/finbert_v31_transformer'
MAX_LENGTH = 128
BATCH_SIZE = 16
EPOCHS = 3
LEARNING_RATE = 2e-5

# Label mapping
LABEL2ID = {'operating': 0, 'investing': 1, 'financing': 2}
ID2LABEL = {0: 'Operating', 1: 'Investing', 2: 'Financing'}

def load_and_prepare_data():
    """Load V31 dataset and prepare for training"""
    print("Loading V31 dataset...")
    df = pd.read_csv(DATASET_PATH)
    
    # Use cleaned sentence if available
    if 'cleaned_sentence' in df.columns:
        texts = df['cleaned_sentence'].fillna('').tolist()
    else:
        texts = df['sentence'].fillna('').tolist()
    
    # Convert labels to numeric
    labels = [LABEL2ID[label.lower()] for label in df['cash_flow_category']]
    
    # Split data
    train_texts, val_texts, train_labels, val_labels = train_test_split(
        texts, labels,
test_size=0.2,
        random_state=42,
        stratify=labels
    )
    
    print(f"Training samples: {len(train_texts)}")
    print(f"Validation samples: {len(val_texts)}")
    
    return train_texts, val_texts, train_labels, val_labels

def create_datasets(train_texts, val_texts, train_labels, val_labels, tokenizer):
    """Create HuggingFace datasets"""
    
    def tokenize_function(examples):
        return tokenizer(
            examples['text'],
            padding='max_length',
            truncation=True,
            max_length=MAX_LENGTH
        )
    
    # Create datasets
    train_dataset = Dataset.from_dict({
        'text': train_texts,
        'label': train_labels
    })
    
    val_dataset = Dataset.from_dict({
        'text': val_texts,
        'label': val_labels
    })
    
    # Tokenize
    train_dataset = train_dataset.map(tokenize_function, batched=True)
    val_dataset = val_dataset.map(tokenize_function, batched=True)
    
    return train_dataset, val_dataset

def compute_metrics(eval_pred):
    """Compute evaluation metrics"""
    predictions, labels = eval_pred
    predictions = np.argmax(predictions, axis=1)
    
    accuracy = accuracy_score(labels, predictions)
    precision, recall, f1, _ = precision_recall_fscore_support(
        labels, predictions, average='weighted'
    )
    
    return {
        'accuracy': accuracy,
        'f1': f1,
        'precision': precision,
        'recall': recall
    }

def train_finbert():
    """Main training function"""
    print("="*60)
    print("Training FinBERT Transformer Model (V31)")
    print("="*60)
    
    # Check for GPU
    device = "cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu"
    print(f"Using device: {device}")
    
    # Load data
    train_texts, val_texts, train_labels, val_labels = load_and_prepare_data()
    
    # Load tokenizer and model
    print(f"\nLoading tokenizer and model from {MODEL_NAME}...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    model = AutoModelForSequenceClassification.from_pretrained(
        MODEL_NAME,
        num_labels=3,
        id2label=ID2LABEL,
        label2id=LABEL2ID
    )
    
    # Create datasets
    print("\nTokenizing datasets...")
    train_dataset, val_dataset = create_datasets(
        train_texts, val_texts, train_labels, val_labels, tokenizer
    )
    
    # Training arguments
    training_args = TrainingArguments(
        output_dir=OUTPUT_DIR,
        eval_strategy='epoch',
        save_strategy='epoch',
        learning_rate=LEARNING_RATE,
        per_device_train_batch_size=BATCH_SIZE,
        per_device_eval_batch_size=BATCH_SIZE,
        num_train_epochs=EPOCHS,
        weight_decay=0.01,
        load_best_model_at_end=True,
        metric_for_best_model='accuracy',
        logging_dir=f'{OUTPUT_DIR}/logs',
        logging_steps=50,
        save_total_limit=2,
        fp16=device == 'cuda',  # Use mixed precision on GPU
        report_to='none'  # Disable wandb/tensorboard
    )
    
    # Create trainer
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        compute_metrics=compute_metrics,
        callbacks=[EarlyStoppingCallback(early_stopping_patience=2)]
    )
    
    # Train
    print("\nStarting training...")
    print(f"Total training examples: {len(train_dataset)}")
    print(f"Batch size: {BATCH_SIZE}")
    print(f"Epochs: {EPOCHS}")
    print(f"Steps per epoch: ~{len(train_dataset) // BATCH_SIZE}")
    print()
    
    trainer.train()
    
    # Final evaluation
    print("\nEvaluating final model...")
    results = trainer.evaluate()
    
    print("\n" + "="*60)
    print("TRAINING COMPLETE")
    print("="*60)
    print(f"Final Accuracy: {results['eval_accuracy']:.4f}")
    print(f"F1 Score: {results['eval_f1']:.4f}")
    print(f"Precision: {results['eval_precision']:.4f}")
    print(f"Recall: {results['eval_recall']:.4f}")
    
    # Save model and tokenizer
    print(f"\nSaving model to {OUTPUT_DIR}...")
    model.save_pretrained(OUTPUT_DIR)
    tokenizer.save_pretrained(OUTPUT_DIR)
    
    print("="*60)
    print("SUCCESS! FinBERT V31 model saved.")
    print(f"Model path: {OUTPUT_DIR}")
    print("="*60)

if __name__ == '__main__':
    train_finbert()

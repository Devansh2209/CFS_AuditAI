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
import torch

def prepare_data(csv_path='v26_datasets/transactions.csv'):
    """Load and prepare data for BERT fine-tuning"""
    print("📊 Loading data...")
    df = pd.read_csv(csv_path)
    
    # Create label mapping
    label2id = {'Operating': 0, 'Investing': 1, 'Financing': 2}
    id2label = {v: k for k, v in label2id.items()}
    
    df['label'] = df['category'].map(label2id)
    
    # Use raw_description (not cleaned) - BERT handles this better
    df['text'] = df['raw_description']
    
    print(f"   Total examples: {len(df)}")
    print(f"   Distribution:\n{df['category'].value_counts()}")
    
    # Group Split by Ticker
    splitter = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
    train_idx, test_idx = next(splitter.split(df, df['label'], groups=df['ticker']))
    
    train_df = df.iloc[train_idx][['text', 'label']].reset_index(drop=True)
    test_df = df.iloc[test_idx][['text', 'label']].reset_index(drop=True)
    
    print(f"   Train: {len(train_df)} examples ({len(df.iloc[train_idx]['ticker'].unique())} companies)")
    print(f"   Test:  {len(test_df)} examples ({len(df.iloc[test_idx]['ticker'].unique())} companies)")
    
    return train_df, test_df, label2id, id2label

def tokenize_data(train_df, test_df, model_name='ProsusAI/finbert'):
    """Tokenize data using BERT tokenizer"""
    print(f"\n🔤 Loading tokenizer: {model_name}")
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    
    train_dataset = Dataset.from_pandas(train_df)
    test_dataset = Dataset.from_pandas(test_df)
    
    def tokenize_function(examples):
        return tokenizer(examples['text'], truncation=True, max_length=128)
    
    print("   Tokenizing train set...")
    train_dataset = train_dataset.map(tokenize_function, batched=True)
    print("   Tokenizing test set...")
    test_dataset = test_dataset.map(tokenize_function, batched=True)
    
    return train_dataset, test_dataset, tokenizer

def compute_metrics(eval_pred):
    """Compute metrics for evaluation"""
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

def train_bert(model_name='ProsusAI/finbert', output_dir='v27_bert_model'):
    """Fine-tune BERT on cash flow data"""
    
    # 1. Prepare Data
    train_df, test_df, label2id, id2label = prepare_data()
    
    # 2. Tokenize
    train_dataset, test_dataset, tokenizer = tokenize_data(train_df, test_df, model_name)
    
    # 3. Load Model
    print(f"\n🤖 Loading model: {model_name}")
    model = AutoModelForSequenceClassification.from_pretrained(
        model_name,
        num_labels=3,
        id2label=id2label,
        label2id=label2id
    )
    
    # 4. Training Arguments (Minimal checkpointing to save disk space)
    training_args = TrainingArguments(
        output_dir=output_dir,
        learning_rate=2e-5,
        per_device_train_batch_size=16,
        per_device_eval_batch_size=16,
        num_train_epochs=3,
        weight_decay=0.01,
        eval_strategy="epoch",
        save_strategy="no",  # Don't save intermediate checkpoints
        load_best_model_at_end=False,  # Disable to save space
        push_to_hub=False,
        logging_steps=100,
    )
    
    # 5. Data Collator
    data_collator = DataCollatorWithPadding(tokenizer=tokenizer)
    
    # 6. Trainer
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=test_dataset,
        tokenizer=tokenizer,
        data_collator=data_collator,
        compute_metrics=compute_metrics,
    )
    
    # 7. Train
    print("\n🚀 Starting training...")
    trainer.train()
    
    # 8. Evaluate
    print("\n📈 Final Evaluation:")
    results = trainer.evaluate()
    for key, value in results.items():
        print(f"   {key}: {value:.4f}")
    
    # 9. Save
    print(f"\n💾 Saving model to {output_dir}/")
    trainer.save_model(output_dir)
    tokenizer.save_pretrained(output_dir)
    
    return trainer, results

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Fine-tune BERT for cash flow classification")
    parser.add_argument("--model", default="ProsusAI/finbert", help="Base model to fine-tune")
    parser.add_argument("--output", default="v27_bert_model", help="Output directory")
    args = parser.parse_args()
    
    trainer, results = train_bert(model_name=args.model, output_dir=args.output)
    print("\n✅ Training complete!")

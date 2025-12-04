#!/usr/bin/env python3
"""
AWS SageMaker Training Script for V28 Production BERT Model

This script:
1. Downloads training data from S3
2. Trains a weighted BERT model
3. Saves the model back to S3
4. Shuts down automatically (no runaway costs!)

Cost: ~$2 for 2.5 hours on ml.g4dn.xlarge
"""

import boto3
import sagemaker
from sagemaker.pytorch import PyTorch
from sagemaker import get_execution_role
import json

def create_sagemaker_training_job():
    """
    Create and launch a SageMaker training job for BERT fine-tuning
    """
    
    # 1. Setup
    print("🚀 Setting up SageMaker training job...")
    
    session = sagemaker.Session()
    bucket = 'sec-edgar-raw-filings-028061991824'
    role = get_execution_role()  # Or specify your IAM role ARN
    
    # 2. Data locations
    s3_input_data = f's3://{bucket}/v28-training/transactions.csv'
    s3_output_path = f's3://{bucket}/v28-models/'
    
    print(f"   Input data: {s3_input_data}")
    print(f"   Output path: {s3_output_path}")
    
    # 3. Hyperparameters
    hyperparameters = {
        'model-name': 'ProsusAI/finbert',
        'epochs': 3,
        'batch-size': 16,
        'learning-rate': 2e-5,
        'max-length': 128,
    }
    
    # 4. Create PyTorch Estimator
    estimator = PyTorch(
        entry_point='train_bert_weighted.py',  # Your training script
        source_dir='.',  # Current directory
        role=role,
        instance_type='ml.g4dn.xlarge',  # GPU instance ($0.736/hour)
        instance_count=1,
        framework_version='2.0',
        py_version='py310',
        hyperparameters=hyperparameters,
        output_path=s3_output_path,
        base_job_name='cashflow-bert-v28',
        max_run=3 * 60 * 60,  # 3 hours max (safety limit)
        disable_profiler=True,  # Save costs
        debugger_hook_config=False,  # Save costs
    )
    
    # 5. Launch training
    print("\n🏋️ Launching SageMaker training job...")
    print(f"   Instance: ml.g4dn.xlarge (1x NVIDIA T4 GPU)")
    print(f"   Estimated cost: $2-3")
    print(f"   Estimated time: 2-3 hours")
    
    estimator.fit({'training': s3_input_data}, wait=False)
    
    print(f"\n✅ Training job started: {estimator.latest_training_job.name}")
    print(f"   Monitor at: https://console.aws.amazon.com/sagemaker/home?region=ca-central-1#/jobs/{estimator.latest_training_job.name}")
    
    return estimator

def monitor_training_job(estimator):
    """
    Monitor the training job progress
    """
    print("\n📊 Monitoring training job...")
    
    # This will block until training completes
    estimator.logs()
    
    # Get final metrics
    job_name = estimator.latest_training_job.name
    sm_client = boto3.client('sagemaker', region_name='ca-central-1')
    
    response = sm_client.describe_training_job(TrainingJobName=job_name)
    
    print("\n✅ Training Complete!")
    print(f"   Status: {response['TrainingJobStatus']}")
    print(f"   Model artifacts: {response['ModelArtifacts']['S3ModelArtifacts']}")
    print(f"   Billable time: {response['BillableTimeInSeconds']} seconds")
    print(f"   Cost: ${response['BillableTimeInSeconds'] / 3600 * 0.736:.2f}")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Launch SageMaker training for V28")
    parser.add_argument("--monitor", action="store_true", help="Monitor training job (blocks until complete)")
    args = parser.parse_args()
    
    estimator = create_sagemaker_training_job()
    
    if args.monitor:
        monitor_training_job(estimator)
    else:
        print("\n💡 To monitor training, run:")
        print(f"   python3 sagemaker_train_v28.py --monitor")

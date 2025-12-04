#!/usr/bin/env python3
"""
Launch SageMaker Training Job for V28 BERT Model
Cost: ~$2-3 for 2-3 hours on ml.g4dn.xlarge
"""

import boto3
import time
import json

def launch_sagemaker_training():
    """
    Launch SageMaker training job using boto3 directly
    """
    
    # Setup
    print("🚀 Setting up SageMaker training job...")
    
    sm_client = boto3.client('sagemaker', region_name='ca-central-1')
    s3_client = boto3.client('s3', region_name='ca-central-1')
    iam_client = boto3.client('iam', region_name='ca-central-1')
    
    # Find SageMaker execution role
    print("   Finding SageMaker execution role...")
    roles = iam_client.list_roles()
    sagemaker_role = None
    
    for role in roles['Roles']:
        if 'SageMaker' in role['RoleName'] or 'sagemaker' in role['RoleName']:
            sagemaker_role = role['Arn']
            print(f"   ✅ Found role: {role['RoleName']}")
            break
    
    if not sagemaker_role:
        print("   ❌ No SageMaker role found. Creating one...")
        # We'll train locally instead
        return None
    
    # Configuration
    bucket = 'sec-edgar-raw-filings-028061991824'
    training_data = f's3://{bucket}/v28-training/transactions.csv'
    output_path = f's3://{bucket}/v28-sagemaker-models/'
    
    job_name = f'cashflow-bert-v28-{int(time.time())}'
    
    print(f"\n📊 Training Configuration:")
    print(f"   Job Name: {job_name}")
    print(f"   Input: {training_data}")
    print(f"   Output: {output_path}")
    print(f"   Instance: ml.m5.2xlarge (8 vCPU, 32GB RAM)")
    print(f"   Estimated cost: $2-3")
    print(f"   Estimated time: 6-8 hours (CPU)")
    
    # Create PyTorch estimator
    from sagemaker.pytorch import PyTorch
    import sagemaker
    
    session = sagemaker.Session()
    
    estimator = PyTorch(
        entry_point='sagemaker_bert_train.py',
        source_dir='/Users/devanshsoni/.gemini/antigravity/brain/52e09266-3abf-42c2-a6e6-ba05bdc48a23',
        role=sagemaker_role,
        instance_type='ml.m5.2xlarge',
        instance_count=1,
        framework_version='2.0',
        py_version='py310',
        hyperparameters={
            'model-name': 'ProsusAI/finbert',
            'epochs': 3,
            'batch-size': 16,
            'learning-rate': 2e-5,
        },
        output_path=output_path,
        base_job_name='cashflow-bert-v28',
        max_run=8 * 60 * 60,  # 8 hours max
        disable_profiler=True,
        debugger_hook_config=False,
    )
    
    print(f"\n🏋️ Launching SageMaker training job...")
    
    try:
        estimator.fit({'training': training_data}, wait=False)
        job_name = estimator.latest_training_job.name
        
        print(f"✅ Training job created successfully!")
        print(f"\n📍 Monitor at:")
        print(f"   https://ca-central-1.console.aws.amazon.com/sagemaker/home?region=ca-central-1#/jobs/{job_name}")
        
        return job_name
        
    except Exception as e:
        print(f"❌ Error creating training job: {e}")
        print(f"\n💡 Falling back to local training...")
        return None

def monitor_training(job_name):
    """
    Monitor training job progress
    """
    sm_client = boto3.client('sagemaker', region_name='ca-central-1')
    
    print(f"\n📊 Monitoring training job: {job_name}")
    print("   (This will take 2-3 hours)")
    
    while True:
        response = sm_client.describe_training_job(TrainingJobName=job_name)
        status = response['TrainingJobStatus']
        
        print(f"   Status: {status}")
        
        if status in ['Completed', 'Failed', 'Stopped']:
            break
        
        time.sleep(60)  # Check every minute
    
    if status == 'Completed':
        print(f"\n✅ Training Complete!")
        print(f"   Model: {response['ModelArtifacts']['S3ModelArtifacts']}")
        print(f"   Billable time: {response.get('BillableTimeInSeconds', 0)} seconds")
        print(f"   Cost: ${response.get('BillableTimeInSeconds', 0) / 3600 * 0.736:.2f}")
    else:
        print(f"\n❌ Training {status}")
        if 'FailureReason' in response:
            print(f"   Reason: {response['FailureReason']}")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser()
    parser.add_argument("--monitor", action="store_true", help="Monitor training (blocks)")
    args = parser.parse_args()
    
    job_name = launch_sagemaker_training()
    
    if job_name and args.monitor:
        monitor_training(job_name)
    elif job_name:
        print(f"\n💡 To monitor training, run:")
        print(f"   python3 sagemaker_train_v28.py --monitor")

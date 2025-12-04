#!/usr/bin/env python3
"""
Create SageMaker Execution Role with necessary permissions
"""

import boto3
import json
import time

def create_sagemaker_role():
    """
    Create an IAM role for SageMaker with S3 access
    """
    
    iam_client = boto3.client('iam', region_name='ca-central-1')
    
    role_name = 'SageMakerExecutionRole-CashflowAI'
    
    print(f"🔐 Creating SageMaker execution role: {role_name}")
    
    # Trust policy - allows SageMaker to assume this role
    trust_policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "Service": "sagemaker.amazonaws.com"
                },
                "Action": "sts:AssumeRole"
            }
        ]
    }
    
    # Create the role
    try:
        response = iam_client.create_role(
            RoleName=role_name,
            AssumeRolePolicyDocument=json.dumps(trust_policy),
            Description='Execution role for SageMaker training jobs - CashflowAI project',
        )
        
        role_arn = response['Role']['Arn']
        print(f"✅ Role created: {role_arn}")
        
    except iam_client.exceptions.EntityAlreadyExistsException:
        print(f"   Role already exists, fetching ARN...")
        response = iam_client.get_role(RoleName=role_name)
        role_arn = response['Role']['Arn']
        print(f"✅ Using existing role: {role_arn}")
    
    # Attach AWS managed policy for SageMaker full access
    print("\n📋 Attaching policies...")
    
    policies = [
        'arn:aws:iam::aws:policy/AmazonSageMakerFullAccess',
        'arn:aws:iam::aws:policy/AmazonS3FullAccess',  # For reading/writing to S3
    ]
    
    for policy_arn in policies:
        try:
            iam_client.attach_role_policy(
                RoleName=role_name,
                PolicyArn=policy_arn
            )
            policy_name = policy_arn.split('/')[-1]
            print(f"   ✅ Attached: {policy_name}")
        except Exception as e:
            print(f"   ⚠️  {policy_arn}: {e}")
    
    # Wait for role to propagate
    print("\n⏳ Waiting for role to propagate (10 seconds)...")
    time.sleep(10)
    
    print(f"\n✅ SageMaker role ready!")
    print(f"   Role ARN: {role_arn}")
    print(f"   Role Name: {role_name}")
    
    return role_arn

if __name__ == "__main__":
    try:
        role_arn = create_sagemaker_role()
        
        print("\n🎯 Next Steps:")
        print("   1. Run: python3 launch_sagemaker_v28.py")
        print("   2. Monitor training in SageMaker console")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\n💡 Alternative: Create role manually in AWS Console:")
        print("   1. Go to: https://console.aws.amazon.com/iam/home#/roles")
        print("   2. Click 'Create role'")
        print("   3. Select 'AWS service' → 'SageMaker'")
        print("   4. Attach policies: AmazonSageMakerFullAccess, AmazonS3FullAccess")
        print("   5. Name it: SageMakerExecutionRole-CashflowAI")

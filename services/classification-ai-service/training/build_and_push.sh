#!/bin/bash
set -e

# Configuration
REGION="${AWS_REGION:-us-east-1}"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REPO_NAME="cfs-auditai-training"
IMAGE_TAG="latest"

echo "Region: $REGION"
echo "Account ID: $ACCOUNT_ID"

# 1. Create ECR repository if it doesn't exist
echo "Checking ECR repository..."
aws ecr describe-repositories --repository-names "$REPO_NAME" --region "$REGION" > /dev/null 2>&1 || \
    aws ecr create-repository --repository-name "$REPO_NAME" --region "$REGION"

# 2. Login to ECR
echo "Logging in to ECR..."
aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"

# 3. Build Docker image
echo "Building Docker image..."
docker build -t "$REPO_NAME:$IMAGE_TAG" .

# 4. Tag image
echo "Tagging image..."
FULL_IMAGE_URI="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$REPO_NAME:$IMAGE_TAG"
docker tag "$REPO_NAME:$IMAGE_TAG" "$FULL_IMAGE_URI"

# 5. Push image
echo "Pushing image to ECR..."
docker push "$FULL_IMAGE_URI"

echo "Success! Training image pushed to: $FULL_IMAGE_URI"
echo "You can now use this image URI in your SageMaker training jobs."

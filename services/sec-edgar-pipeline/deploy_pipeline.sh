#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${GREEN}🚀 Starting SEC EDGAR Pipeline Deployment...${NC}"

# 1. Infrastructure Deployment
echo -e "${GREEN}📦 Deploying Infrastructure with Terraform...${NC}"
cd infrastructure
terraform init
terraform apply -auto-approve
cd ..

# 2. Get Account ID and Region
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=$(aws configure get region)
REGION=${REGION:-us-east-1}

echo -e "${GREEN}🔑 Logging into ECR ($REGION)...${NC}"
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

# 3. Build and Push Docker Images

# Function to build and push
build_and_push() {
    SERVICE_NAME=$1
    FOLDER=$2
    REPO_NAME="sec-$SERVICE_NAME"
    
    echo -e "${GREEN}🐳 Building $SERVICE_NAME...${NC}"
    docker build --provenance=false -t $REPO_NAME $FOLDER
    
    echo -e "${GREEN}⬆️ Pushing $SERVICE_NAME to ECR...${NC}"
    docker tag $REPO_NAME:latest $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$REPO_NAME:latest
    docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$REPO_NAME:latest
}

build_and_push "downloader-lambda" "src/downloader"
build_and_push "data-processor-lambda" "src/processor"
build_and_push "bert-training" "src/trainer"

echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo -e "${GREEN}👉 Go to the AWS Step Functions Console to start the 'SEC-Pipeline-Orchestrator'.${NC}"

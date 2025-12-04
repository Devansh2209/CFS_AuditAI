# AWS Deployment Plan - CFS AuditAI Platform

## Overview

This plan covers deploying the complete CFS AuditAI Platform to AWS, consisting of:
1. **SEC Edgar Pipeline** (Lambda-based, existing Terraform)
2. **Main Microservices Platform** (11 services + frontend + gateway, new ECS infrastructure)

**AWS Account**: 028061991824  
**Region**: ca-central-1  
**Deployment Strategy**: Infrastructure as Code (Terraform) + Docker containers

---

## User Review Required

> [!IMPORTANT]
> **Deployment Approach Decision**
> 
> I'm proposing to deploy the platform using **AWS ECS Fargate** for the microservices. This approach offers:
> - **Pros**: Serverless container management, auto-scaling, cost-effective for steady workloads, easier debugging
> - **Cons**: Slightly higher cost than EC2 for very high utilization
> 
> **Alternative**: Deploy on ECS with EC2 instances for more control and potentially lower costs at scale.
> 
> Please confirm if ECS Fargate is acceptable, or if you prefer EC2-based ECS.

> [!IMPORTANT]
> **Database Strategy Decision**
> 
> Currently using 11 separate PostgreSQL databases (one per service). For AWS, I recommend:
> - **Option A**: Single RDS PostgreSQL instance with multiple databases (simpler, lower cost ~$50-100/month)
> - **Option B**: Amazon Aurora PostgreSQL Serverless v2 (auto-scaling, higher availability, ~$100-200/month)
> - **Option C**: Keep 11 separate RDS instances (highest isolation, highest cost ~$500+/month)
> 
> **Recommendation**: Option A for development/staging, Option B for production.
> 
> Which database strategy do you prefer?

> [!WARNING]
> **Environment Variables & Secrets**
> 
> The `.env` file contains sensitive credentials. These will be migrated to **AWS Secrets Manager** during deployment. Please ensure you have:
> - Production-ready JWT secrets
> - Production database passwords
> - Any API keys needed for services
> 
> I'll create a secrets migration script, but you'll need to review and update values before production use.

---

## Proposed Changes

### Infrastructure Setup

#### [NEW] [main.tf](file:///Users/devanshsoni/Desktop/Cashflow/services/infrastructure/main.tf)

Complete Terraform configuration for the main platform including:
- **VPC & Networking**: VPC with public/private subnets across 2 AZs, NAT Gateway, Internet Gateway
- **ECS Cluster**: Fargate cluster for running containerized services
- **Application Load Balancer**: ALB with path-based routing to services
- **RDS PostgreSQL**: Database instance(s) based on chosen strategy
- **ECR Repositories**: 13 repositories (11 services + frontend + gateway)
- **CloudWatch**: Log groups for all services
- **Secrets Manager**: Secure storage for credentials
- **Security Groups**: Properly configured ingress/egress rules
- **IAM Roles**: ECS task execution and task roles with least-privilege permissions

#### [NEW] [variables.tf](file:///Users/devanshsoni/Desktop/Cashflow/services/infrastructure/variables.tf)

Terraform variables for:
- Environment (dev/staging/prod)
- Region configuration
- Instance sizing
- Database configuration
- Domain/DNS settings (if applicable)

#### [NEW] [outputs.tf](file:///Users/devanshsoni/Desktop/Cashflow/services/infrastructure/outputs.tf)

Terraform outputs including:
- ALB DNS name
- ECR repository URLs
- RDS endpoint
- VPC/subnet IDs

---

### Deployment Scripts

#### [NEW] [deploy-to-aws.sh](file:///Users/devanshsoni/Desktop/Cashflow/services/deploy-to-aws.sh)

Master deployment script that:
1. Validates AWS credentials
2. Deploys Terraform infrastructure
3. Builds and pushes all Docker images to ECR
4. Creates ECS task definitions
5. Deploys ECS services
6. Runs database migrations
7. Outputs access URLs and health check results

#### [NEW] [build-and-push.sh](file:///Users/devanshsoni/Desktop/Cashflow/services/build-and-push.sh)

Helper script to build and push Docker images to ECR for all services.

#### [NEW] [setup-secrets.sh](file:///Users/devanshsoni/Desktop/Cashflow/services/setup-secrets.sh)

Script to migrate environment variables from `.env` to AWS Secrets Manager.

---

### ECS Configuration

#### [NEW] [ecs-task-definitions/](file:///Users/devanshsoni/Desktop/Cashflow/services/ecs-task-definitions/)

Directory containing ECS task definition JSON files for each service:
- `accounting-standards-service.json`
- `business-logic-service.json`
- `data-ingestion-service.json`
- `fluctuation-analysis-service.json`
- `classification-ai-service.json`
- `nlp-processing-service.json`
- `reclassification-service.json`
- `workflow-orchestration-service.json`
- `audit-compliance-service.json`
- `security-auth-service.json`
- `client-configuration-service.json`
- `frontend.json`
- `gateway.json`

Each task definition will specify:
- Container image from ECR
- CPU/memory allocation (0.25 vCPU, 512 MB for services; 0.5 vCPU, 1 GB for frontend)
- Environment variables and secrets references
- Port mappings
- Health checks
- CloudWatch logging configuration

---

### SEC Edgar Pipeline Updates

#### [MODIFY] [sec-edgar-pipeline/infrastructure/main.tf](file:///Users/devanshsoni/Desktop/Cashflow/services/sec-edgar-pipeline/infrastructure/main.tf)

Updates to existing SEC pipeline infrastructure:
- Add Lambda function resources (currently only has ECR repos)
- Add Step Functions state machine
- Add EventBridge rules for scheduling
- Add necessary IAM policies for Lambda execution

#### [MODIFY] [sec-edgar-pipeline/deploy_pipeline.sh](file:///Users/devanshsoni/Desktop/Cashflow/services/sec-edgar-pipeline/deploy_pipeline.sh)

Update deployment script to:
- Use correct region (ca-central-1)
- Deploy Lambda functions after pushing images
- Configure Step Functions

---

### Database Migration

#### [MODIFY] [migrate.sh](file:///Users/devanshsoni/Desktop/Cashflow/services/migrate.sh)

Update migration script to:
- Support RDS endpoints (not just local Docker containers)
- Read database credentials from AWS Secrets Manager
- Handle multiple databases based on chosen strategy

---

### Documentation

#### [NEW] [DEPLOYMENT.md](file:///Users/devanshsoni/Desktop/Cashflow/services/DEPLOYMENT.md)

Comprehensive deployment documentation including:
- Prerequisites and AWS setup
- Step-by-step deployment instructions
- Troubleshooting guide
- Rollback procedures
- Cost estimates
- Monitoring and logging setup

---

## Verification Plan

### Automated Infrastructure Validation

**Test 1: Terraform Plan Validation**
```bash
cd /Users/devanshsoni/Desktop/Cashflow/services/infrastructure
terraform init
terraform plan
```
Expected: Plan completes without errors, shows resources to be created.

**Test 2: Terraform Apply (Dry Run)**
```bash
terraform apply -auto-approve
```
Expected: All infrastructure resources created successfully.

### Docker Image Build Verification

**Test 3: Build All Service Images**
```bash
cd /Users/devanshsoni/Desktop/Cashflow/services
./build-and-push.sh --build-only
```
Expected: All 13 Docker images build successfully without errors.

**Test 4: Push to ECR**
```bash
./build-and-push.sh
```
Expected: All images pushed to ECR, visible in AWS console.

### Service Deployment Verification

**Test 5: ECS Services Running**
```bash
aws ecs list-services --cluster cfs-auditai-cluster --region ca-central-1
aws ecs describe-services --cluster cfs-auditai-cluster --services <service-names> --region ca-central-1
```
Expected: All services show RUNNING status with desired count = running count.

**Test 6: Health Check Endpoints**
```bash
# Get ALB DNS from Terraform output
ALB_DNS=$(terraform output -raw alb_dns_name)

# Test each service health endpoint
curl http://$ALB_DNS/api/accounting-standards/health
curl http://$ALB_DNS/api/business-logic/health
curl http://$ALB_DNS/api/data-ingestion/health
# ... (all 11 services)
curl http://$ALB_DNS/  # Frontend
```
Expected: All endpoints return 200 OK with health status.

### Database Verification

**Test 7: Database Connectivity**
```bash
# Connect to RDS instance
RDS_ENDPOINT=$(terraform output -raw rds_endpoint)
psql -h $RDS_ENDPOINT -U admin -d cfs_auditai -c "SELECT version();"
```
Expected: Successfully connects and returns PostgreSQL version.

**Test 8: Database Migrations**
```bash
./migrate.sh
```
Expected: All migrations run successfully, tables created.

### SEC Pipeline Verification

**Test 9: SEC Pipeline Deployment**
```bash
cd sec-edgar-pipeline
./deploy_pipeline.sh
```
Expected: Lambda functions deployed, Step Functions state machine created.

**Test 10: SEC Pipeline Execution**
```bash
# Trigger Step Functions execution
aws stepfunctions start-execution \
  --state-machine-arn <state-machine-arn> \
  --region ca-central-1
```
Expected: Execution starts and completes successfully.

### Integration Testing

**Test 11: End-to-End Transaction Flow**

Manual test via frontend:
1. Navigate to ALB DNS in browser
2. Log in to the platform
3. Upload a sample CSV with transactions
4. Verify transactions are ingested and classified
5. Check that services communicate correctly

Expected: Complete workflow executes without errors.

### Manual Verification

**Test 12: AWS Console Verification**

Manual checks in AWS Console:
1. **ECS**: Verify all services are running in Fargate
2. **RDS**: Check database is accessible and healthy
3. **CloudWatch**: Verify logs are being collected
4. **ECR**: Confirm all images are present
5. **ALB**: Check target groups are healthy
6. **Secrets Manager**: Verify secrets are stored

Expected: All resources visible and healthy in AWS console.

---

## Cost Estimate

**Monthly AWS Costs (Development Environment)**:
- ECS Fargate (13 tasks, 0.25-0.5 vCPU): ~$50-80
- RDS PostgreSQL (db.t3.micro): ~$15-30
- Application Load Balancer: ~$20
- NAT Gateway: ~$35
- CloudWatch Logs: ~$5-10
- ECR Storage: ~$5
- **Total**: ~$130-180/month

**Production Environment** (with higher specs and Aurora): ~$300-500/month

---

## Rollback Plan

If deployment fails:
1. **Infrastructure**: `terraform destroy` to remove all resources
2. **Services**: Stop ECS services via AWS console
3. **Database**: RDS snapshots taken automatically, can restore
4. **Images**: ECR images retained, can redeploy previous versions

---

## Next Steps

After approval:
1. Create Terraform infrastructure files
2. Create deployment scripts
3. Deploy infrastructure
4. Build and push Docker images
5. Deploy ECS services
6. Run database migrations
7. Verify all services are operational
8. Create walkthrough documentation

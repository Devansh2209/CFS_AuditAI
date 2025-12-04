# Processor Architecture Redesign

## Problem Statement

**Current Issue**: Processor Lambda times out after 15 minutes (AWS max), even with just 3 tickers.

**Root Cause**: Processing SEC HTML filings is slow:
- Each filing: 2-5 minutes to parse
- 50 filings: ~100-250 minutes needed
- Lambda max: 15 minutes ❌

**Impact**: Pipeline cannot scale beyond 3-4 tickers

---

## Proposed Solution

### Move Processor from Lambda to ECS Fargate

**Why ECS Fargate?**
- ✅ No time limit (can run for hours)
- ✅ Already using for training
- ✅ Same container infrastructure
- ✅ Better for long-running tasks
- ✅ More memory available (up to 30GB)

---

## Implementation Plan

### 1. Create Processor Container

**New File**: `src/processor/Dockerfile`

```dockerfile
FROM python:3.9-slim

WORKDIR /opt/processor

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy processor code
COPY financial_parser.py .
COPY data_processor.py .
COPY processor_entrypoint.py .

# Set entrypoint
CMD ["python", "processor_entrypoint.py"]
```

**New File**: `src/processor/processor_entrypoint.py`

```python
"""
ECS Fargate entrypoint for data processor
"""
import os
import argparse
from data_processor import DataProcessor

def main():
    print("🚀 Starting Data Processor on ECS...")
    
    raw_bucket = os.getenv('RAW_BUCKET_NAME')
    processed_bucket = os.getenv('PROCESSED_BUCKET_NAME')
    
    if not raw_bucket or not processed_bucket:
        raise ValueError("Missing bucket environment variables")
    
    processor = DataProcessor(raw_bucket, processed_bucket)
    processor.process_filings()
    
    print("✅ Processing complete!")

if __name__ == "__main__":
    main()
```

---

### 2. Update Infrastructure

**Changes to `main.tf`**:

```hcl
# Add ECR repository for processor
resource "aws_ecr_repository" "processor_ecs_repo" {
  name                 = "sec-processor-ecs"
  image_tag_mutability = "MUTABLE"
  
  image_scanning_configuration {
    scan_on_push = true
  }
}

# ECS Task Definition for Processor
resource "aws_ecs_task_definition" "processor_task" {
  family                   = "sec-processor-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "2048"    # 2 vCPU
  memory                   = "8192"    # 8 GB
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn
  
  container_definitions = jsonencode([{
    name      = "processor"
    image     = "${aws_ecr_repository.processor_ecs_repo.repository_url}:latest"
    essential = true
    
    environment = [
      {
        name  = "RAW_BUCKET_NAME"
        value = aws_s3_bucket.raw_filings.bucket
      },
      {
        name  = "PROCESSED_BUCKET_NAME"
        value = aws_s3_bucket.processed_data.bucket
      }
    ]
    
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.processor_logs.name
        "awslogs-region"        = "ca-central-1"
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "processor_logs" {
  name              = "/ecs/sec-processor"
  retention_in_days = 7
}
```

---

### 3. Update Step Functions

**Change ProcessData step** from Lambda to ECS:

```json
{
  "ProcessData": {
    "Type": "Task",
    "Resource": "arn:aws:states:::ecs:runTask.sync",
    "Parameters": {
      "LaunchType": "FARGATE",
      "Cluster": "${aws_ecs_cluster.main_cluster.arn}",
      "TaskDefinition": "${aws_ecs_task_definition.processor_task.arn}",
      "NetworkConfiguration": {
        "AwsvpcConfiguration": {
          "Subnets": ["subnet-0ee7edc27dee533a2", ...],
          "SecurityGroups": ["sg-0b693ac6f25ebdfb6"],
          "AssignPublicIp": "ENABLED"
        }
      }
    },
    "Next": "TrainModel",
    "Retry": [{
      "ErrorEquals": ["States.TaskFailed"],
      "IntervalSeconds": 30,
      "MaxAttempts": 2,
      "BackoffRate": 2.0
    }]
  }
}
```

---

### 4. Remove Lambda Processor

- Delete `aws_lambda_function.processor` resource
- Keep processor ECR repo for potential future use
- Remove Lambda-specific code

---

## Benefits

| Aspect | Lambda | ECS Fargate |
|--------|--------|-------------|
| **Max Runtime** | 15 minutes ❌ | Unlimited ✅ |
| **Memory** | 10 GB | 30 GB ✅ |
| **Cost (50 tickers)** | N/A (times out) | ~$0.10-0.20 ✅ |
| **Scalability** | Limited | High ✅ |
| **Complexity** | Lower | Slightly Higher |

---

## Testing Strategy

### Phase 1: Build & Deploy
1. Create Dockerfile
2. Build container locally
3. Push to ECR
4. Update Terraform
5. Apply infrastructure

### Phase 2: Test with 3 Tickers
1. Run Step Functions with 3 tickers
2. Verify ECS task starts
3. Monitor CloudWatch logs
4. Confirm CSV creation in S3
5. Validate processing time

### Phase 3: Scale to 10 Tickers
1. Run with 10 tickers if 3-ticker test passes
2. Monitor total processing time
3. Verify all files processed

---

## Timeline

- **Infrastructure Changes**: 30 minutes
- **Testing (3 tickers)**: 20 minutes
- **Validation**: 10 minutes
- **Total**: ~1 hour

---

## Rollback Plan

If ECS processor fails:
1. Revert Step Functions to use Lambda
2. Reduce ticker count to 2-3 maximum
3. Accept limitation and optimize parsing logic

---

## Success Criteria

✅ Processor runs for 50+ tickers without timeout  
✅ Processing completes in <30 minutes for 10 tickers  
✅ CSV files created in S3  
✅ Training receives valid data  
✅ End-to-end pipeline succeeds

---

## Next Steps

**Immediate**:
1. Get user approval for architectural change
2. Create processor container
3. Update Terraform
4. Test with 3 tickers

**Future Optimization** (if needed):
- Parallel processing of files
- Optimize HTML parsing
- Cache parsed data

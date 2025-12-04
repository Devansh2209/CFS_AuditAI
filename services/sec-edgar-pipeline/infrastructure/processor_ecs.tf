# ECS Task Definition for Processor
resource "aws_ecs_task_definition" "processor_task" {
  family                   = "sec-processor-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "2048"    # 2 vCPU
  memory                   = "8192"    # 8 GB
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn
  
  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }
  
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

# ECR Repository for Processor ECS
resource "aws_ecr_repository" "processor_ecs_repo" {
  name                 = "sec-processor-ecs"
  image_tag_mutability = "MUTABLE"
  
  image_scanning_configuration {
    scan_on_push = true
  }
}

# CloudWatch Log Group for Processor
resource "aws_cloudwatch_log_group" "processor_logs" {
  name              = "/ecs/sec-processor"
  retention_in_days = 7
}

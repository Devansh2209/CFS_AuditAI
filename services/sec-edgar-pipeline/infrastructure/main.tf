provider "aws" {
  region = "ca-central-1"
}

# --- S3 Buckets ---

resource "aws_s3_bucket" "raw_filings" {
  bucket = "sec-edgar-raw-filings-028061991824"
  force_destroy = true
}

resource "aws_s3_bucket_versioning" "raw_ver" {
  bucket = aws_s3_bucket.raw_filings.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket" "processed_data" {
  bucket = "sec-edgar-processed-data-028061991824"
  force_destroy = true
}

# --- ECR Repository ---

resource "aws_ecr_repository" "downloader_repo" {
  name                 = "sec-downloader-lambda"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_repository" "processor_repo" {
  name                 = "sec-data-processor-lambda"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_repository" "training_repo" {
  name                 = "sec-bert-training"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_repository" "inference_repo" {
  name                 = "sec-bert-inference"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

# --- IAM Role for Lambda ---

resource "aws_iam_role" "lambda_role" {
  name = "sec_downloader_lambda_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "s3_access" {
  name = "s3_access_policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket"
      ]
      Resource = [
        aws_s3_bucket.raw_filings.arn,
        "${aws_s3_bucket.raw_filings.arn}/*"
      ]
    }]
  })
}

# --- Lambda Functions ---

resource "aws_lambda_function" "downloader" {
  function_name = "sec-downloader"
  role          = aws_iam_role.lambda_role.arn
  package_type  = "Image"
  image_uri     = "${aws_ecr_repository.downloader_repo.repository_url}:latest"
  architectures = ["arm64"]
  timeout       = 300
  memory_size   = 3008

  environment {
    variables = {
      S3_BUCKET_NAME = aws_s3_bucket.raw_filings.bucket
    }
  }
}



# --- ECS Task Definition for Training ---

resource "aws_ecs_task_definition" "training_task" {
  family                   = "sec-bert-training-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "2048"
  memory                   = "8192"
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  container_definitions = jsonencode([
    {
      name      = "bert-training"
      image     = "${aws_ecr_repository.training_repo.repository_url}:latest"
      essential = true
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/sec-bert-training"
          "awslogs-region"        = "ca-central-1"
          "awslogs-stream-prefix" = "ecs"
          "awslogs-create-group"  = "true"
        }
      }
      environment = [
        { name = "PROCESSED_BUCKET_NAME", value = aws_s3_bucket.processed_data.bucket }
      ]
    }
  ])
}

# --- IAM Roles for ECS ---

resource "aws_iam_role" "ecs_execution_role" {
  name = "sec_ecs_execution_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution_basic" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "ecs_task_role" {
  name = "sec_ecs_task_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "ecs_s3_access" {
  name = "ecs_s3_access_policy"
  role = aws_iam_role.ecs_task_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:GetObject",
        "s3:ListBucket",
        "s3:PutObject"
      ]
      Resource = [
        aws_s3_bucket.processed_data.arn,
        "${aws_s3_bucket.processed_data.arn}/*",
        aws_s3_bucket.raw_filings.arn,
        "${aws_s3_bucket.raw_filings.arn}/*"
      ]
    }]
  })
}

# --- ECS Cluster ---

resource "aws_ecs_cluster" "main_cluster" {
  name = "cfs-auditai-cluster"
}

# --- CloudWatch Log Group ---

resource "aws_cloudwatch_log_group" "ecs_logs" {
  name              = "/ecs/sec-bert-training"
  retention_in_days = 7
}

# --- Step Functions ---

resource "aws_sfn_state_machine" "pipeline_orchestrator" {
  name     = "SEC-Pipeline-Orchestrator"
  role_arn = aws_iam_role.step_functions_role.arn

  definition = jsonencode({
    Comment = "Orchestrates SEC EDGAR Data Pipeline"
    StartAt = "DownloadFilings"
    States = {
      DownloadFilings = {
        Type     = "Task"
        Resource = aws_lambda_function.downloader.arn
        Next     = "ProcessData"
        Retry    = [{ ErrorEquals = ["States.TaskFailed"], IntervalSeconds = 30, MaxAttempts = 2, BackoffRate = 2.0 }]
      }
      ProcessData = {
        Type     = "Task"
        Resource = "arn:aws:states:::ecs:runTask.sync"
        Parameters = {
          LaunchType     = "FARGATE"
          Cluster        = aws_ecs_cluster.main_cluster.arn
          TaskDefinition = aws_ecs_task_definition.processor_task.arn
          NetworkConfiguration = {
            AwsvpcConfiguration = {
              Subnets        = ["subnet-0ee7edc27dee533a2", "subnet-02b6dfb8f9d168d80", "subnet-0e9851f76f9d746fe"]
              SecurityGroups = ["sg-0b693ac6f25ebdfb6"]
              AssignPublicIp = "ENABLED"
            }
          }
        }
        End = true
        Retry = [{ ErrorEquals = ["States.TaskFailed"], IntervalSeconds = 30, MaxAttempts = 2, BackoffRate = 2.0 }]
      }

    }
  })
}

# --- IAM Role for Step Functions ---

resource "aws_iam_role" "step_functions_role" {
  name = "sec_step_functions_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "states.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "step_functions_policy" {
  name = "step_functions_policy"
  role = aws_iam_role.step_functions_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = "lambda:InvokeFunction"
        Resource = [
          aws_lambda_function.downloader.arn
        ]
      },
      {
        Effect = "Allow"
        Action = ["ecs:RunTask", "ecs:StopTask", "ecs:DescribeTasks"]
        Resource = [
          aws_ecs_task_definition.training_task.arn,
          aws_ecs_task_definition.processor_task.arn
        ]
      },
      {
        Effect = "Allow"
        Action = ["iam:PassRole"]
        Resource = [aws_iam_role.ecs_execution_role.arn, aws_iam_role.ecs_task_role.arn]
      },
      {
        Effect = "Allow"
        Action = ["events:PutTargets", "events:PutRule", "events:DescribeRule"]
        Resource = "*"
      }
    ]
  })
}

# --- Variables ---

variable "environment" {
  default = "dev"
}

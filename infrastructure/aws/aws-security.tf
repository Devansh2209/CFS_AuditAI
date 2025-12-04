# AWS Security Hardening Configuration (Budget Dev Version)
# Version: 1.0.0-dev
# COST OPTIMIZED: No NAT Gateway (~$33/mo savings)

provider "aws" {
  region = "us-east-1"
}

# ==========================================
# 1. VPC & NETWORK SECURITY
# ==========================================

# VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "cashflow-ai-vpc-dev"
    Environment = "development"
  }
}

# Public Subnet (Hosting everything for dev to save NAT costs)
resource "aws_subnet" "public" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "us-east-1a"
  map_public_ip_on_launch = true

  tags = {
    Name = "cashflow-ai-public-dev"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.main.id
}

# Route Table for Public Access
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.gw.id
  }

  tags = {
    Name = "cashflow-ai-public-rt"
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# REMOVED: NAT Gateway and Private Subnets to save costs

# ==========================================
# 2. SECURITY GROUPS (Strict Firewall Rules)
# ==========================================

# Load Balancer SG
resource "aws_security_group" "lb" {
  name        = "cashflow-ai-lb-sg"
  description = "Allow HTTPS from internet"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Application SG
resource "aws_security_group" "app" {
  name        = "cashflow-ai-app-sg"
  description = "Allow traffic only from Load Balancer"
  vpc_id      = aws_vpc.main.id

  # Only allow traffic from the Load Balancer
  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.lb.id]
  }

  # Allow SSH only from your specific IP (Replace with your actual IP)
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # WARNING: Restrict this to your IP in production!
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Database SG
resource "aws_security_group" "db" {
  name        = "cashflow-ai-db-sg"
  description = "Allow traffic only from Application"
  vpc_id      = aws_vpc.main.id

  # Only allow traffic from the App Security Group
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }
}

# Redis SG
resource "aws_security_group" "redis" {
  name        = "cashflow-ai-redis-sg"
  description = "Allow traffic only from Application"
  vpc_id      = aws_vpc.main.id

  # Only allow traffic from the App Security Group
  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }
}

# ==========================================
# 3. THREAT DETECTION (GuardDuty)
# ==========================================
# Kept enabled as it has a 30-day free trial and is cheap for low traffic

resource "aws_guardduty_detector" "main" {
  enable = true
}

# ==========================================
# 4. AUDIT LOGGING (CloudTrail)
# ==========================================
# Kept enabled as it is very cheap (pennies) and critical for security

resource "aws_s3_bucket" "cloudtrail" {
  bucket = "cashflow-ai-cloudtrail-logs-dev"
  force_destroy = true
}

resource "aws_s3_bucket_policy" "cloudtrail" {
  bucket = aws_s3_bucket.cloudtrail.id
  policy = <<POLICY
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AWSCloudTrailAclCheck",
            "Effect": "Allow",
            "Principal": {
              "Service": "cloudtrail.amazonaws.com"
            },
            "Action": "s3:GetBucketAcl",
            "Resource": "${aws_s3_bucket.cloudtrail.arn}"
        },
        {
            "Sid": "AWSCloudTrailWrite",
            "Effect": "Allow",
            "Principal": {
              "Service": "cloudtrail.amazonaws.com"
            },
            "Action": "s3:PutObject",
            "Resource": "${aws_s3_bucket.cloudtrail.arn}/prefix/AWSLogs/*",
            "Condition": {
                "StringEquals": {
                    "s3:x-amz-acl": "bucket-owner-full-control"
                }
            }
        }
    ]
}
POLICY
}

resource "aws_cloudtrail" "main" {
  name                          = "cashflow-ai-audit-trail-dev"
  s3_bucket_name                = aws_s3_bucket.cloudtrail.id
  s3_key_prefix                 = "prefix"
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_logging                = true
}

# ==========================================
# 5. SECRETS MANAGEMENT
# ==========================================

resource "aws_secretsmanager_secret" "db_credentials" {
  name = "cashflow-ai-dev/db-credentials"
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name = "cashflow-ai-dev/jwt-secret"
}

resource "aws_secretsmanager_secret" "encryption_key" {
  name = "cashflow-ai-dev/encryption-key"
}

# ==========================================
# 6. WAF (Web Application Firewall)
# ==========================================
# Kept enabled for protection, but cost is ~$6/mo. 
# Comment out this block to save another $6/mo if needed.

resource "aws_wafv2_web_acl" "main" {
  name        = "cashflow-ai-waf-dev"
  description = "WAF for API Gateway"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "cashflow-ai-waf-dev"
    sampled_requests_enabled   = true
  }

  rule {
    name     = "RateLimit"
    priority = 1
    action {
      block {}
    }
    statement {
      rate_based_statement {
        limit = 2000
        aggregate_key_type = "IP"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimit"
      sampled_requests_enabled   = true
    }
  }
}

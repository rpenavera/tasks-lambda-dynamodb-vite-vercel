variable "aws_region" {
  description = "AWS region. The organization SCP restricts resources to us-east-2."
  type        = string
  default     = "us-east-2"
}

variable "project_name" {
  description = "Project name used as prefix for resource names and tags. Must be Lambda-safe."
  type        = string
  default     = "tasks-1-5-50"
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)."
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be one of: dev, staging, prod."
  }
}

variable "lambda_runtime" {
  description = "Lambda runtime identifier."
  type        = string
  default     = "nodejs20.x"
}

variable "lambda_memory_mb" {
  description = "Memory assigned to the Lambda function in MB."
  type        = number
  default     = 256
}

variable "lambda_timeout_seconds" {
  description = "Lambda timeout in seconds."
  type        = number
  default     = 10
}

variable "cors_allow_origins" {
  description = "Allowed CORS origins. Use [\"*\"] for demos, or explicit origins in production."
  type        = list(string)
  default     = ["*"]
}

variable "log_retention_days" {
  description = "CloudWatch Logs retention in days."
  type        = number
  default     = 7
}

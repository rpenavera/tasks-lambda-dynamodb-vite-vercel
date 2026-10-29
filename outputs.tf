output "api_url" {
  description = "Public base URL of the task API."
  value       = aws_lambda_function_url.api.function_url
}

output "function_url" {
  description = "Public Lambda Function URL."
  value       = aws_lambda_function_url.api.function_url
}

output "function_name" {
  description = "Lambda function name."
  value       = aws_lambda_function.api.function_name
}

output "table_name" {
  description = "DynamoDB table name."
  value       = aws_dynamodb_table.tasks.name
}

output "aws_region" {
  description = "AWS region where the stack is deployed."
  value       = var.aws_region
}

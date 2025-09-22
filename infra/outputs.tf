# Output values for the infrastructure

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = aws_subnet.private[*].id
}

output "ec2_instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.main.id
}

output "ec2_public_ip" {
  description = "EC2 instance public IP"
  value       = aws_eip.main.public_ip
}

output "ec2_private_ip" {
  description = "EC2 instance private IP"
  value       = aws_instance.main.private_ip
}

output "load_balancer_dns" {
  description = "Load balancer DNS name"
  value       = aws_lb.main.dns_name
}

output "load_balancer_zone_id" {
  description = "Load balancer hosted zone ID"
  value       = aws_lb.main.zone_id
}

output "application_url" {
  description = "Main application URL"
  value       = "http://${aws_lb.main.dns_name}"
}

output "backend_api_url" {
  description = "Backend API URL"
  value       = "http://${aws_lb.main.dns_name}/api"
}

output "grafana_url" {
  description = "Grafana monitoring URL"
  value       = "http://${aws_lb.main.dns_name}/grafana"
}

output "prometheus_url" {
  description = "Prometheus metrics URL"
  value       = "http://${aws_lb.main.dns_name}/prometheus"
}

output "database_endpoint" {
  description = "RDS database endpoint"
  value       = aws_db_instance.main.endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "Redis cache endpoint"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
  sensitive   = true
}

output "security_group_ids" {
  description = "Security group IDs"
  value = {
    alb      = aws_security_group.alb.id
    ec2      = aws_security_group.ec2.id
    database = aws_security_group.database.id
  }
}

output "ssh_command" {
  description = "SSH command to connect to the instance"
  value       = "ssh -i ~/.ssh/id_rsa ec2-user@${aws_eip.main.public_ip}"
}

# Environment-specific outputs
output "environment_info" {
  description = "Environment configuration summary"
  value = {
    project_name = var.project_name
    environment  = var.environment
    aws_region   = var.aws_region
    instance_type = var.instance_type
    db_instance_class = var.db_instance_class
  }
}

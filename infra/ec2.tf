# EC2 Instance Configuration for CI/CD Dashboard

# Key Pair for EC2 Access
resource "aws_key_pair" "main" {
  key_name   = var.key_pair_name
  public_key = file("${path.module}/keys/id_rsa.pub")

  tags = {
    Name = "${var.project_name}-key-pair"
  }
}

# User Data Script for Docker Installation and App Deployment
locals {
  user_data = base64encode(templatefile("${path.module}/scripts/user_data.sh", {
    db_host     = aws_db_instance.main.endpoint
    db_username = var.db_username
    db_password = var.db_password
    redis_host  = aws_elasticache_replication_group.main.primary_endpoint_address
  }))
}

# EC2 Instance
resource "aws_instance" "main" {
  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.main.key_name
  vpc_security_group_ids = [aws_security_group.ec2.id]
  subnet_id              = aws_subnet.public[0].id

  user_data                   = local.user_data
  user_data_replace_on_change = true

  # Enhanced monitoring
  monitoring = var.enable_monitoring

  # Root volume configuration
  root_block_device {
    volume_type = "gp3"
    volume_size = 30
    encrypted   = true

    tags = {
      Name = "${var.project_name}-root-volume"
    }
  }

  # Instance metadata options (security best practice)
  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
    http_put_response_hop_limit = 1
  }

  tags = {
    Name = "${var.project_name}-app-server"
    Type = "Application Server"
  }

  # Ensure database is ready before instance creation
  depends_on = [
    aws_db_instance.main,
    aws_elasticache_replication_group.main
  ]
}

# Elastic IP for consistent public access
resource "aws_eip" "main" {
  instance = aws_instance.main.id
  domain   = "vpc"

  tags = {
    Name = "${var.project_name}-app-eip"
  }

  depends_on = [aws_internet_gateway.main]
}

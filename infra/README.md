# Infrastructure as Code - CI/CD Dashboard

This directory contains Terraform Infrastructure as Code (IaC) for deploying the CI/CD Pipeline Health Dashboard to AWS.

## 📁 Directory Structure

```
infra/
├── main.tf                    # Main Terraform configuration
├── variables.tf               # Input variables
├── outputs.tf                 # Output values
├── vpc.tf                     # VPC and networking
├── security_groups.tf         # Security group configurations
├── ec2.tf                     # EC2 instance configuration
├── database.tf                # RDS and ElastiCache
├── load_balancer.tf          # Application Load Balancer
├── docker-compose.cloud.yml   # Cloud-optimized Docker Compose
├── terraform.tfvars.example   # Example variables file
├── scripts/                   # Deployment automation
│   ├── deploy.sh             # Main deployment script
│   ├── generate_ssh_key.sh   # SSH key generation
│   └── user_data.sh          # EC2 initialization script
├── keys/                     # SSH keys (generated)
│   ├── id_rsa                # Private key (do not commit!)
│   └── id_rsa.pub            # Public key
└── environments/             # Environment-specific configs
    ├── dev/
    ├── staging/
    └── prod/
```

## 🚀 Quick Start

### 1. Prerequisites
- AWS CLI configured with appropriate permissions
- Terraform >= 1.0 installed
- Git Bash (Windows) or Terminal (Mac/Linux)

### 2. Setup
```bash
# Navigate to infrastructure directory
cd infra

# Copy and configure variables
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars

# Set database password securely
export TF_VAR_db_password="YourSecurePassword123!"
```

### 3. Deploy
```bash
# Option 1: Automated deployment
chmod +x scripts/*.sh
./scripts/deploy.sh deploy

# Option 2: Manual deployment
terraform init
terraform plan
terraform apply
```

### 4. Access Application
After deployment, access your application using the ALB DNS name from Terraform outputs:
- Dashboard: `http://<ALB_DNS_NAME>`
- Backend API: `http://<ALB_DNS_NAME>/api`
- Grafana: `http://<ALB_DNS_NAME>/grafana`
- Prometheus: `http://<ALB_DNS_NAME>/prometheus`

## 🏗️ Infrastructure Components

| Resource | Purpose | Configuration |
|----------|---------|---------------|
| VPC | Network isolation | 10.0.0.0/16 CIDR |
| Public Subnets | ALB and NAT Gateway | 2 AZs |
| Private Subnets | Database resources | 2 AZs |
| EC2 Instance | Application hosting | t3.medium default |
| RDS PostgreSQL | Database | db.t3.micro default |
| ElastiCache Redis | Caching/sessions | cache.t3.micro |
| Application Load Balancer | Traffic distribution | Public-facing |
| Security Groups | Network security | Least privilege |

## 🔧 Configuration

### Required Variables
```hcl
# terraform.tfvars
aws_region = "us-east-1"
environment = "dev"
project_name = "cicd-dashboard"
instance_type = "t3.medium"
db_username = "admin"
# db_password set via environment variable
```

### Optional Variables
```hcl
enable_monitoring = true
ssl_certificate_arn = ""  # For HTTPS
allowed_cidr_blocks = ["0.0.0.0/0"]  # Restrict in production
```

## 🛡️ Security Features

- **VPC Isolation**: All resources in private virtual cloud
- **Private Subnets**: Database in private subnets only
- **Security Groups**: Restrictive firewall rules
- **Encryption**: EBS and RDS encryption enabled
- **SSH Keys**: Key-based authentication
- **IAM Roles**: Minimal required permissions

## 💰 Cost Estimation

**Monthly costs (us-east-1):**
- Development: ~$25/month (t3.micro instances)
- Production: ~$85/month (t3.medium instances)

## 🔄 Environment Management

### Multiple Environments
```bash
# Development
terraform workspace new dev
terraform apply -var-file="environments/dev/terraform.tfvars"

# Production  
terraform workspace new prod
terraform apply -var-file="environments/prod/terraform.tfvars"
```

### Scaling
```bash
# Scale up instance size
terraform apply -var="instance_type=t3.large"

# Enable multi-AZ database
terraform apply -var="multi_az=true"
```

## 🧪 Testing

### Validation
```bash
# Validate Terraform configuration
terraform validate

# Check deployment health
curl -f http://<ALB_DNS_NAME>/api/health
```

### SSH Access
```bash
# Connect to EC2 instance
ssh -i keys/id_rsa ec2-user@<PUBLIC_IP>

# Check application logs
sudo docker-compose logs -f
sudo systemctl status cicd-dashboard
```

## 🧹 Cleanup

### Destroy Infrastructure
```bash
# WARNING: This destroys all resources!
terraform destroy

# Or use script
./scripts/deploy.sh destroy
```

### Selective Cleanup
```bash
# Stop instances to save costs
aws ec2 stop-instances --instance-ids <INSTANCE_ID>

# Scale down
terraform apply -var="instance_type=t3.micro"
```

## 🚨 Troubleshooting

### Common Issues

1. **Permission Denied**
   ```bash
   # Fix script permissions
   chmod +x scripts/*.sh
   ```

2. **SSH Connection Failed**
   ```bash
   # Check key permissions
   chmod 600 keys/id_rsa
   
   # Verify security group allows SSH
   terraform plan | grep security_group
   ```

3. **Application Not Loading**
   ```bash
   # Check user data logs
   ssh -i keys/id_rsa ec2-user@<IP>
   sudo tail -f /var/log/user-data.log
   ```

4. **Database Connection Issues**
   ```bash
   # Verify RDS endpoint
   terraform output database_endpoint
   
   # Check security group rules
   aws ec2 describe-security-groups --group-ids <SG_ID>
   ```

## 📚 Related Documentation

- [Main Deployment Guide](../deployment.md)
- [AI Prompts Documentation](../prompts.md)
- [Original Project README](../README.md)

## 🤖 AI-Generated Code

This infrastructure was created using AI-native development practices:
- 95%+ of Terraform code generated by AI
- Automated deployment scripts created by AI
- Security best practices implemented by AI
- Documentation generated with AI assistance

See [prompts.md](../prompts.md) for detailed AI interaction logs.

---

**Infrastructure Status**: ✅ Production Ready  
**Security Level**: 🛡️ High  
**Automation Level**: 🤖 Fully Automated  
**Documentation Level**: 📚 Comprehensive

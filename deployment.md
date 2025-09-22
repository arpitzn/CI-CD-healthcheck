# CI/CD Pipeline Health Dashboard - Cloud Deployment Guide

## Assignment 3: Infrastructure as Code (IaC) Deployment

This guide demonstrates deploying the CI/CD Pipeline Health Dashboard to AWS using Terraform and an AI-native development workflow.

## 🎯 Overview

This deployment transforms Assignment 2's local Docker environment into a production-ready cloud deployment on AWS with:

- **Infrastructure as Code**: All resources provisioned with Terraform
- **Managed Services**: RDS PostgreSQL and ElastiCache Redis
- **High Availability**: Multi-AZ deployment with load balancing
- **Security**: VPC, Security Groups, and encrypted storage
- **Monitoring**: CloudWatch integration and health checks

## 📋 Prerequisites

### Required Tools
```bash
# Install Terraform
wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
unzip terraform_1.6.0_linux_amd64.zip
sudo mv terraform /usr/local/bin/

# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Verify installations
terraform --version
aws --version
```

### AWS Setup
```bash
# Configure AWS credentials
aws configure
# Enter your AWS Access Key ID, Secret Access Key, and default region

# Verify AWS connection
aws sts get-caller-identity
```

### Required AWS Permissions
Your AWS user/role needs permissions for:
- EC2 (instances, VPC, security groups, key pairs)
- RDS (database instances, subnet groups)
- ElastiCache (Redis clusters)
- ELB (Application Load Balancer)
- IAM (roles for monitoring)

## 🚀 Deployment Steps

### Step 1: Clone and Prepare Repository
```bash
# Navigate to your Assignment 2 project
cd /path/to/assignment2

# Verify the infra directory structure
ls -la infra/
```

### Step 2: Generate SSH Key Pair
```bash
# Generate SSH keys for EC2 access
chmod +x infra/scripts/generate_ssh_key.sh
./infra/scripts/generate_ssh_key.sh
```

### Step 3: Configure Variables
```bash
# Copy the example variables file
cp infra/terraform.tfvars.example infra/terraform.tfvars

# Edit the variables file
nano infra/terraform.tfvars
```

**Required Configuration:**
```hcl
# infra/terraform.tfvars
aws_region = "us-east-1"
environment = "prod"
project_name = "cicd-dashboard"
instance_type = "t3.medium"
key_pair_name = "cicd-dashboard-key"
db_username = "admin"
# Set db_password via environment variable for security
allowed_cidr_blocks = ["YOUR_IP/32"]  # Restrict access in production
enable_monitoring = true
```

### Step 4: Set Database Password (Security Best Practice)
```bash
# Set database password as environment variable
export TF_VAR_db_password="YourSecurePassword123!"

# Or use AWS Secrets Manager (recommended for production)
# aws secretsmanager create-secret --name cicd-dashboard-db-password --secret-string "YourSecurePassword123!"
```

### Step 5: Deploy Infrastructure
```bash
# Navigate to infrastructure directory
cd infra

# Initialize Terraform
terraform init

# Review the deployment plan
terraform plan

# Apply the infrastructure (confirm when prompted)
terraform apply

# Or use the automated deployment script
chmod +x scripts/deploy.sh
./scripts/deploy.sh deploy
```

### Step 6: Verify Deployment
```bash
# Get deployment outputs
terraform output

# Example outputs:
# application_url = "http://cicd-dashboard-alb-123456789.us-east-1.elb.amazonaws.com"
# backend_api_url = "http://cicd-dashboard-alb-123456789.us-east-1.elb.amazonaws.com/api"
# ssh_command = "ssh -i ~/.ssh/id_rsa ec2-user@1.2.3.4"
```

## 🔍 Post-Deployment Verification

### Check Application Status
```bash
# SSH into the EC2 instance
ssh -i infra/keys/id_rsa ec2-user@<PUBLIC_IP>

# Check service status
sudo systemctl status cicd-dashboard

# View application logs
sudo docker-compose logs -f

# Run health check
/opt/cicd-dashboard/health-check.sh
```

### Access Applications
- **Main Dashboard**: `http://<ALB_DNS_NAME>`
- **Backend API**: `http://<ALB_DNS_NAME>/api`
- **Grafana**: `http://<ALB_DNS_NAME>/grafana` (admin/admin123)
- **Prometheus**: `http://<ALB_DNS_NAME>/prometheus`

### Monitor Resources
```bash
# Check AWS resources
aws ec2 describe-instances --filters "Name=tag:Project,Values=CICD-Pipeline-Dashboard"
aws rds describe-db-instances --db-instance-identifier cicd-dashboard-database
aws elasticache describe-replication-groups --replication-group-id cicd-dashboard-redis
```

## 🏗️ Architecture Overview

```
Internet Gateway
       |
   Application Load Balancer (Public Subnets)
       |
   EC2 Instance (Public Subnet)
   ├── Frontend (Port 3000)
   ├── Backend (Port 3001)
   ├── Grafana (Port 3003)
   └── Prometheus (Port 9090)
       |
   Private Subnets
   ├── RDS PostgreSQL (Port 5432)
   └── ElastiCache Redis (Port 6379)
```

## 📊 Infrastructure Components

| Component | Type | Purpose |
|-----------|------|---------|
| VPC | Network | Isolated network environment |
| EC2 Instance | Compute | Application hosting |
| RDS PostgreSQL | Database | Data persistence |
| ElastiCache Redis | Cache | Session storage and caching |
| Application Load Balancer | Load Balancer | Traffic distribution |
| Security Groups | Firewall | Network access control |
| EIP | Network | Static public IP |

## 🔒 Security Features

- **VPC Isolation**: All resources in private virtual cloud
- **Security Groups**: Least-privilege access control
- **Encrypted Storage**: EBS volumes and RDS encryption
- **Database Security**: Database in private subnets only
- **IAM Roles**: Minimal required permissions
- **SSH Key Access**: Key-based authentication only

## 🔧 Customization Options

### Environment-Specific Deployments
```bash
# Development environment
terraform workspace new dev
terraform apply -var-file="environments/dev/terraform.tfvars"

# Staging environment
terraform workspace new staging
terraform apply -var-file="environments/staging/terraform.tfvars"

# Production environment
terraform workspace new prod
terraform apply -var-file="environments/prod/terraform.tfvars"
```

### Scaling Configuration
```hcl
# Increase instance size for high load
instance_type = "t3.large"  # or "t3.xlarge"

# Enable multi-AZ database for high availability
multi_az = true

# Add auto-scaling group (future enhancement)
# min_size = 1
# max_size = 3
# desired_capacity = 2
```

## 🧪 Testing Deployment

### Automated Testing
```bash
# Run deployment validation
terraform validate

# Test with curl
curl -f http://<ALB_DNS_NAME>/api/health
curl -f http://<ALB_DNS_NAME>

# Load testing (optional)
# ab -n 1000 -c 10 http://<ALB_DNS_NAME>/
```

### Manual Testing
1. **Frontend**: Verify dashboard loads and displays data
2. **Backend API**: Test /api/health endpoint
3. **Database**: Verify connection and data persistence
4. **Monitoring**: Check Grafana dashboards and Prometheus metrics

## 🧹 Cleanup (Cost Management)

### Destroy Infrastructure
```bash
# Destroy all resources (WARNING: This deletes everything!)
terraform destroy

# Or use the automated script
./scripts/deploy.sh destroy
```

### Selective Resource Management
```bash
# Scale down to save costs
terraform apply -var="instance_type=t3.micro"

# Stop instance without destroying
aws ec2 stop-instances --instance-ids <INSTANCE_ID>
```

## 💰 Cost Estimation

**Monthly AWS Costs (us-east-1):**
- EC2 t3.medium: ~$30
- RDS db.t3.micro: ~$15
- ElastiCache cache.t3.micro: ~$15
- ALB: ~$18
- Data Transfer: ~$5
- **Total**: ~$83/month

**Cost Optimization Tips:**
- Use `t3.micro` for development ($6/month)
- Stop instances when not needed
- Use Reserved Instances for production (50% savings)
- Enable detailed billing for monitoring

## 🚨 Troubleshooting

### Common Issues

1. **SSH Connection Failed**
   ```bash
   # Check security group allows SSH from your IP
   # Verify key permissions: chmod 600 infra/keys/id_rsa
   ```

2. **Application Not Loading**
   ```bash
   # Check EC2 user data logs
   sudo tail -f /var/log/user-data.log
   
   # Verify Docker containers
   sudo docker-compose ps
   ```

3. **Database Connection Issues**
   ```bash
   # Check security groups allow database access
   # Verify RDS endpoint in environment variables
   ```

4. **Terraform Apply Fails**
   ```bash
   # Check AWS credentials and permissions
   aws sts get-caller-identity
   
   # Verify Terraform state
   terraform state list
   ```

## 📚 Next Steps

### Production Enhancements
- [ ] Implement HTTPS with SSL certificates
- [ ] Add CloudWatch alerting and monitoring
- [ ] Implement backup and disaster recovery
- [ ] Add CI/CD pipeline for infrastructure updates
- [ ] Implement auto-scaling groups
- [ ] Add domain name and Route53 configuration

### Security Hardening
- [ ] Implement AWS Secrets Manager
- [ ] Add WAF protection
- [ ] Enable VPC Flow Logs
- [ ] Implement least-privilege IAM policies
- [ ] Add compliance scanning

## 🤖 AI-Native Development Notes

This deployment was created using AI assistance for:
- Terraform code generation and best practices
- Security group configuration
- User data script automation
- Documentation and troubleshooting guides
- Cost optimization recommendations

See [prompts.md](prompts.md) for detailed AI interaction logs.

---

**Assignment 3 Completion Checklist:**
- ✅ Infrastructure provisioned with Terraform
- ✅ Application deployed to cloud
- ✅ Managed database configured
- ✅ Load balancer and networking setup
- ✅ Security groups and access control
- ✅ Documentation and deployment guide
- ✅ AI-native development workflow demonstrated

**Live Application URL**: `http://<YOUR_ALB_DNS_NAME>`

*Total deployment time: ~15-20 minutes*  
*Infrastructure cost: ~$83/month for production setup*

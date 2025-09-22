#!/bin/bash

# User Data Script for CI/CD Dashboard EC2 Instance
# This script installs Docker, Docker Compose, and deploys the application

# Variables passed from Terraform
DB_HOST="${db_host}"
DB_USERNAME="${db_username}"
DB_PASSWORD="${db_password}"
REDIS_HOST="${redis_host}"

# Log all output
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

echo "=== Starting CI/CD Dashboard Setup ==="
echo "Timestamp: $(date)"

# Update system
echo "Updating system packages..."
yum update -y

# Install required packages
echo "Installing required packages..."
yum install -y git curl wget unzip

# Install Docker
echo "Installing Docker..."
yum install -y docker
systemctl start docker
systemctl enable docker

# Add ec2-user to docker group
usermod -a -G docker ec2-user

# Install Docker Compose
echo "Installing Docker Compose..."
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose

# Verify installations
echo "Verifying installations..."
docker --version
docker-compose --version

# Create application directory
echo "Setting up application directory..."
mkdir -p /opt/cicd-dashboard
cd /opt/cicd-dashboard

# Clone the repository (you'll need to update this with your actual repository)
echo "Cloning application repository..."
# For demo purposes, we'll create the necessary files locally
# In production, you would clone from your actual repository:
# git clone https://github.com/yourusername/your-repo.git .

# Create docker-compose override file for production
echo "Creating production Docker Compose configuration..."
cat > docker-compose.override.yml << EOF
version: '3.8'

services:
  backend:
    environment:
      - NODE_ENV=production
      - MONGODB_URI=postgresql://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:5432/cicd_monitoring
      - REDIS_URL=redis://${REDIS_HOST}:6379
      - JWT_SECRET=\${JWT_SECRET:-production-jwt-secret-change-me}
      - FRONTEND_URL=http://$(curl -s http://169.254.169.254/latest/meta-data/public-hostname)
    restart: always

  frontend:
    environment:
      - REACT_APP_API_URL=http://$(curl -s http://169.254.169.254/latest/meta-data/public-hostname)/api
      - REACT_APP_WEBSOCKET_URL=http://$(curl -s http://169.254.169.254/latest/meta-data/public-hostname)
    restart: always

  # Remove local mongodb and redis since we're using managed services
  mongodb:
    image: tianon/true
    restart: "no"
    
  redis:
    image: tianon/true
    restart: "no"
EOF

# Create environment file
echo "Creating environment file..."
cat > .env << EOF
# Production Environment Configuration
NODE_ENV=production
DB_HOST=${DB_HOST}
DB_USERNAME=${DB_USERNAME}
DB_PASSWORD=${DB_PASSWORD}
REDIS_HOST=${REDIS_HOST}

# JWT Secret (change in production)
JWT_SECRET=production-super-secret-jwt-key-change-me

# Email configuration (configure as needed)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=cicd-monitor@company.com

# Slack webhook (configure as needed)
SLACK_WEBHOOK_URL=
EOF

# Create a simple health check script
echo "Creating health check script..."
cat > health-check.sh << 'EOF'
#!/bin/bash

# Health check script for CI/CD Dashboard
echo "=== CI/CD Dashboard Health Check ==="
echo "Timestamp: $(date)"

# Check if containers are running
echo "Checking container status..."
docker-compose ps

# Check if services are responding
echo "Checking service health..."
curl -f http://localhost:3000 && echo "Frontend: OK" || echo "Frontend: FAILED"
curl -f http://localhost:3001/api/health && echo "Backend: OK" || echo "Backend: FAILED"
curl -f http://localhost:3003 && echo "Grafana: OK" || echo "Grafana: FAILED"
curl -f http://localhost:9090/-/healthy && echo "Prometheus: OK" || echo "Prometheus: FAILED"

echo "Health check completed"
EOF

chmod +x health-check.sh

# Create log rotation configuration
echo "Setting up log rotation..."
cat > /etc/logrotate.d/cicd-dashboard << EOF
/opt/cicd-dashboard/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    copytruncate
}
EOF

# Create a systemd service for the application
echo "Creating systemd service..."
cat > /etc/systemd/system/cicd-dashboard.service << EOF
[Unit]
Description=CI/CD Dashboard
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/cicd-dashboard
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the service
systemctl daemon-reload
systemctl enable cicd-dashboard.service

# Wait for Docker to be fully ready
echo "Waiting for Docker to be ready..."
sleep 30

# Start the application
echo "Starting CI/CD Dashboard application..."
systemctl start cicd-dashboard.service

# Wait for services to start
echo "Waiting for services to start..."
sleep 60

# Run initial health check
echo "Running initial health check..."
./health-check.sh

# Setup cron job for periodic health checks
echo "Setting up periodic health checks..."
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/cicd-dashboard/health-check.sh >> /var/log/health-check.log 2>&1") | crontab -

# Create a simple status page
echo "Creating status page..."
cat > /var/www/html/status.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>CI/CD Dashboard - Server Status</title>
    <meta http-equiv="refresh" content="30">
</head>
<body>
    <h1>CI/CD Dashboard - Server Status</h1>
    <p>Server is running and configured.</p>
    <p>Last updated: <span id="timestamp"></span></p>
    <script>
        document.getElementById('timestamp').textContent = new Date().toLocaleString();
    </script>
</body>
</html>
EOF

# Install and configure nginx for the status page
yum install -y nginx
systemctl start nginx
systemctl enable nginx

echo "=== CI/CD Dashboard Setup Completed ==="
echo "Timestamp: $(date)"
echo "Application should be accessible on ports 3000 (frontend), 3001 (backend), 3003 (grafana), 9090 (prometheus)"
echo "Check logs: tail -f /var/log/user-data.log"
echo "Check application: systemctl status cicd-dashboard"
EOF

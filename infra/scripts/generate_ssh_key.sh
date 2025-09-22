#!/bin/bash

# Script to generate SSH key pair for EC2 access
# Generated using AI assistance for Infrastructure as Code

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEY_DIR="$SCRIPT_DIR/../keys"

echo "=== Generating SSH Key Pair for CI/CD Dashboard ==="

# Create keys directory if it doesn't exist
mkdir -p "$KEY_DIR"

# Generate SSH key pair
if [ ! -f "$KEY_DIR/id_rsa" ]; then
    echo "Generating new SSH key pair..."
    ssh-keygen -t rsa -b 4096 -f "$KEY_DIR/id_rsa" -C "cicd-dashboard-$(date +%Y%m%d)" -N ""
    
    echo "SSH key pair generated successfully!"
    echo "Private key: $KEY_DIR/id_rsa"
    echo "Public key: $KEY_DIR/id_rsa.pub"
    
    # Set appropriate permissions
    chmod 600 "$KEY_DIR/id_rsa"
    chmod 644 "$KEY_DIR/id_rsa.pub"
    
    echo ""
    echo "Public key content:"
    cat "$KEY_DIR/id_rsa.pub"
    
else
    echo "SSH key pair already exists at $KEY_DIR/id_rsa"
    echo "If you want to generate a new key, delete the existing files first."
fi

echo ""
echo "Next steps:"
echo "1. Run 'terraform plan' to review the infrastructure"
echo "2. Run 'terraform apply' to deploy the infrastructure"
echo "3. Use 'ssh -i $KEY_DIR/id_rsa ec2-user@<public-ip>' to connect to the instance"

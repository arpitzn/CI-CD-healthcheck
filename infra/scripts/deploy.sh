#!/bin/bash

# Deployment script for CI/CD Dashboard to AWS
# AI-generated Infrastructure as Code deployment automation

set -e  # Exit on any error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_DIR="$(dirname "$INFRA_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if terraform is installed
    if ! command -v terraform &> /dev/null; then
        error "Terraform is not installed. Please install Terraform first."
    fi
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        warning "AWS CLI is not installed. Install it for easier AWS management."
    fi
    
    # Check if jq is installed
    if ! command -v jq &> /dev/null; then
        warning "jq is not installed. Install it for better JSON parsing."
    fi
    
    success "Prerequisites check completed"
}

# Generate SSH key if needed
generate_ssh_key() {
    log "Checking SSH key..."
    if [ ! -f "$INFRA_DIR/keys/id_rsa" ]; then
        log "Generating SSH key pair..."
        bash "$SCRIPT_DIR/generate_ssh_key.sh"
    else
        success "SSH key already exists"
    fi
}

# Initialize Terraform
init_terraform() {
    log "Initializing Terraform..."
    cd "$INFRA_DIR"
    
    terraform init
    success "Terraform initialized"
}

# Validate Terraform configuration
validate_terraform() {
    log "Validating Terraform configuration..."
    cd "$INFRA_DIR"
    
    terraform validate
    success "Terraform configuration is valid"
}

# Plan Terraform deployment
plan_terraform() {
    log "Planning Terraform deployment..."
    cd "$INFRA_DIR"
    
    # Check if terraform.tfvars exists
    if [ ! -f "terraform.tfvars" ]; then
        warning "terraform.tfvars not found. Please create it from terraform.tfvars.example"
        warning "Make sure to set the db_password variable"
    fi
    
    terraform plan -out=tfplan
    success "Terraform plan created"
}

# Apply Terraform deployment
apply_terraform() {
    log "Applying Terraform deployment..."
    cd "$INFRA_DIR"
    
    terraform apply tfplan
    success "Infrastructure deployed successfully"
}

# Get deployment outputs
get_outputs() {
    log "Getting deployment outputs..."
    cd "$INFRA_DIR"
    
    echo ""
    echo "=== Deployment Information ==="
    
    if command -v jq &> /dev/null; then
        APPLICATION_URL=$(terraform output -json | jq -r '.application_url.value')
        BACKEND_API_URL=$(terraform output -json | jq -r '.backend_api_url.value')
        GRAFANA_URL=$(terraform output -json | jq -r '.grafana_url.value')
        PROMETHEUS_URL=$(terraform output -json | jq -r '.prometheus_url.value')
        SSH_COMMAND=$(terraform output -json | jq -r '.ssh_command.value')
        
        echo "Application URL: $APPLICATION_URL"
        echo "Backend API URL: $BACKEND_API_URL"
        echo "Grafana URL: $GRAFANA_URL"
        echo "Prometheus URL: $PROMETHEUS_URL"
        echo "SSH Command: $SSH_COMMAND"
    else
        terraform output
    fi
    
    echo ""
    success "Deployment completed successfully!"
}

# Main deployment function
deploy() {
    log "Starting CI/CD Dashboard deployment to AWS..."
    
    check_prerequisites
    generate_ssh_key
    init_terraform
    validate_terraform
    plan_terraform
    
    echo ""
    read -p "Do you want to apply the Terraform plan? (y/N): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        apply_terraform
        get_outputs
    else
        warning "Deployment cancelled by user"
        exit 0
    fi
}

# Destroy infrastructure
destroy() {
    log "Destroying infrastructure..."
    cd "$INFRA_DIR"
    
    echo ""
    warning "This will destroy ALL infrastructure resources!"
    read -p "Are you sure you want to destroy the infrastructure? (y/N): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        terraform destroy
        success "Infrastructure destroyed"
    else
        warning "Destruction cancelled by user"
    fi
}

# Show help
show_help() {
    echo "CI/CD Dashboard Deployment Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  deploy    Deploy the infrastructure (default)"
    echo "  destroy   Destroy the infrastructure"
    echo "  plan      Show the Terraform plan without applying"
    echo "  outputs   Show deployment outputs"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 deploy   # Deploy the infrastructure"
    echo "  $0 destroy  # Destroy the infrastructure"
    echo "  $0 plan     # Show what would be deployed"
}

# Main script logic
case "${1:-deploy}" in
    deploy)
        deploy
        ;;
    destroy)
        destroy
        ;;
    plan)
        check_prerequisites
        generate_ssh_key
        init_terraform
        validate_terraform
        plan_terraform
        ;;
    outputs)
        get_outputs
        ;;
    help)
        show_help
        ;;
    *)
        error "Unknown command: $1. Use '$0 help' for usage information."
        ;;
esac

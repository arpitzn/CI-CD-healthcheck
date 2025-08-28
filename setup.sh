#!/bin/bash

# CI/CD Monitoring System Setup Script
# This script helps you quickly set up the entire monitoring system

set -e

echo "🚀 CI/CD Monitoring System Setup"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "success") echo -e "${GREEN}✅ $message${NC}" ;;
        "warning") echo -e "${YELLOW}⚠️  $message${NC}" ;;
        "error") echo -e "${RED}❌ $message${NC}" ;;
        "info") echo -e "${BLUE}ℹ️  $message${NC}" ;;
        *) echo "$message" ;;
    esac
}

# Check if Docker is installed
check_docker() {
    if command -v docker &> /dev/null; then
        print_status "success" "Docker is installed"
        docker --version
    else
        print_status "error" "Docker is not installed. Please install Docker first."
        exit 1
    fi
}

# Check if Docker Compose is installed
check_docker_compose() {
    if command -v docker-compose &> /dev/null; then
        print_status "success" "Docker Compose is installed"
        docker-compose --version
    else
        print_status "error" "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
}

# Setup environment file
setup_environment() {
    print_status "info" "Setting up environment configuration..."
    
    if [ ! -f .env ]; then
        if [ -f environment.example ]; then
            cp environment.example .env
            print_status "success" "Created .env file from example"
        else
            print_status "warning" "environment.example not found, creating basic .env file"
            cat > .env << EOF
# Basic configuration
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-in-production
MONGODB_URI=mongodb://admin:password123@mongodb:27017/cicd_monitoring?authSource=admin
REDIS_URL=redis://redis:6379
FRONTEND_URL=http://localhost:3000

# Optional: Add your notification settings
# SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
# SMTP_HOST=smtp.gmail.com
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password
EOF
        fi
    else
        print_status "info" ".env file already exists, skipping creation"
    fi
}

# Create necessary directories
create_directories() {
    print_status "info" "Creating necessary directories..."
    
    directories=(
        "logs"
        "backend/logs"
        "backend/uploads"
        "nginx/logs"
        "nginx/ssl"
        "monitoring/grafana/dashboards"
        "monitoring/grafana/datasources"
    )
    
    for dir in "${directories[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            print_status "success" "Created directory: $dir"
        fi
    done
}

# Build and start services
start_services() {
    print_status "info" "Building and starting services..."
    
    # Pull latest images
    print_status "info" "Pulling Docker images..."
    docker-compose pull
    
    # Build custom images
    print_status "info" "Building application images..."
    docker-compose build
    
    # Start services
    print_status "info" "Starting all services..."
    docker-compose up -d
    
    # Wait for services to be ready
    print_status "info" "Waiting for services to start..."
    sleep 30
}

# Check service health
check_services() {
    print_status "info" "Checking service health..."
    
    services=(
        "mongodb:27017"
        "redis:6379"
        "backend:3001"
        "frontend:3000"
    )
    
    for service in "${services[@]}"; do
        service_name=$(echo $service | cut -d: -f1)
        port=$(echo $service | cut -d: -f2)
        
        if docker-compose ps | grep $service_name | grep -q "Up"; then
            print_status "success" "$service_name is running"
        else
            print_status "warning" "$service_name may not be ready yet"
        fi
    done
}

# Display access information
show_access_info() {
    echo ""
    print_status "success" "Setup completed! 🎉"
    echo ""
    echo "📱 Access your applications:"
    echo "   Dashboard:   http://localhost:3000"
    echo "   API:         http://localhost:3001/api"
    echo "   Sample App:  http://localhost:3002"
    echo "   Prometheus:  http://localhost:9090"
    echo "   Grafana:     http://localhost:3001 (admin/admin123)"
    echo ""
    echo "🔧 Useful commands:"
    echo "   View logs:           docker-compose logs -f"
    echo "   Stop services:       docker-compose down"
    echo "   Restart services:    docker-compose restart"
    echo "   View status:         docker-compose ps"
    echo ""
    echo "📚 Documentation:"
    echo "   Requirements:        docs/requirement-analysis.md"
    echo "   Technical Design:    docs/tech-design.md"
    echo "   AI Usage Logs:       docs/ai-prompt-logs.md"
    echo ""
    print_status "info" "Check the logs if any service is not working properly:"
    echo "   docker-compose logs [service-name]"
}

# Main setup process
main() {
    echo ""
    print_status "info" "Starting setup process..."
    echo ""
    
    # Check prerequisites
    check_docker
    check_docker_compose
    echo ""
    
    # Setup steps
    setup_environment
    create_directories
    start_services
    check_services
    
    # Show completion info
    show_access_info
}

# Handle script arguments
case "${1:-}" in
    "check")
        check_docker
        check_docker_compose
        check_services
        ;;
    "start")
        docker-compose up -d
        check_services
        ;;
    "stop")
        docker-compose down
        print_status "success" "All services stopped"
        ;;
    "restart")
        docker-compose restart
        check_services
        ;;
    "logs")
        docker-compose logs -f
        ;;
    "status")
        docker-compose ps
        ;;
    "clean")
        print_status "warning" "This will remove all containers, volumes, and data. Are you sure? (y/N)"
        read -r response
        if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
            docker-compose down -v --remove-orphans
            docker system prune -f
            print_status "success" "Cleanup completed"
        else
            print_status "info" "Cleanup cancelled"
        fi
        ;;
    "help"|"-h"|"--help")
        echo "CI/CD Monitoring System Setup Script"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  (no args)  Run full setup process"
        echo "  check      Check prerequisites and service status"
        echo "  start      Start all services"
        echo "  stop       Stop all services"
        echo "  restart    Restart all services"
        echo "  logs       View service logs"
        echo "  status     Show service status"
        echo "  clean      Remove all containers and data (destructive)"
        echo "  help       Show this help message"
        ;;
    "")
        main
        ;;
    *)
        print_status "error" "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac

#!/bin/bash

# Advanced Health Monitoring Script
# This script provides comprehensive health checking capabilities

set -euo pipefail

# Configuration
DEFAULT_URL="http://localhost:3000"
DEFAULT_TIMEOUT=30
DEFAULT_INTERVAL=10
DEFAULT_RETRIES=3

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

# Function to perform basic health check
basic_health_check() {
    local url=$1
    local timeout=${2:-$DEFAULT_TIMEOUT}
    
    print_status "info" "Performing basic health check on $url"
    
    if curl -f -s --max-time "$timeout" "$url/health" > /dev/null; then
        print_status "success" "Basic health check passed"
        return 0
    else
        print_status "error" "Basic health check failed"
        return 1
    fi
}

# Function to perform detailed health check
detailed_health_check() {
    local url=$1
    local timeout=${2:-$DEFAULT_TIMEOUT}
    
    print_status "info" "Performing detailed health check on $url"
    
    local response
    response=$(curl -f -s --max-time "$timeout" "$url/health/detailed" || echo "")
    
    if [ -n "$response" ]; then
        print_status "success" "Detailed health check passed"
        
        # Parse and display key metrics
        local uptime memory_used request_count error_count
        uptime=$(echo "$response" | grep -o '"uptime":[0-9]*' | cut -d':' -f2 || echo "0")
        memory_used=$(echo "$response" | grep -o '"heapUsed":"[^"]*"' | cut -d'"' -f4 || echo "Unknown")
        request_count=$(echo "$response" | grep -o '"requestCount":[0-9]*' | cut -d':' -f2 || echo "0")
        error_count=$(echo "$response" | grep -o '"errors":[0-9]*' | cut -d':' -f2 || echo "0")
        
        echo "📊 Metrics:"
        echo "   - Uptime: ${uptime}s"
        echo "   - Memory Used: $memory_used"
        echo "   - Request Count: $request_count"
        echo "   - Error Count: $error_count"
        
        return 0
    else
        print_status "error" "Detailed health check failed"
        return 1
    fi
}

# Function to check readiness
readiness_check() {
    local url=$1
    local timeout=${2:-$DEFAULT_TIMEOUT}
    
    print_status "info" "Performing readiness check on $url"
    
    if curl -f -s --max-time "$timeout" "$url/ready" > /dev/null; then
        print_status "success" "Readiness check passed"
        return 0
    else
        print_status "error" "Readiness check failed"
        return 1
    fi
}

# Function to check metrics endpoint
metrics_check() {
    local url=$1
    local timeout=${2:-$DEFAULT_TIMEOUT}
    
    print_status "info" "Checking metrics endpoint on $url"
    
    local metrics
    metrics=$(curl -f -s --max-time "$timeout" "$url/metrics" || echo "")
    
    if [ -n "$metrics" ]; then
        print_status "success" "Metrics endpoint accessible"
        
        # Extract key metrics
        local uptime_metric requests_metric errors_metric memory_metric
        uptime_metric=$(echo "$metrics" | grep "app_uptime_seconds" | awk '{print $2}' || echo "0")
        requests_metric=$(echo "$metrics" | grep "app_requests_total" | awk '{print $2}' || echo "0")
        errors_metric=$(echo "$metrics" | grep "app_errors_total" | awk '{print $2}' || echo "0")
        memory_metric=$(echo "$metrics" | grep "app_memory_usage_bytes" | awk '{print $2}' || echo "0")
        
        echo "📈 Prometheus Metrics:"
        echo "   - app_uptime_seconds: $uptime_metric"
        echo "   - app_requests_total: $requests_metric"
        echo "   - app_errors_total: $errors_metric"
        echo "   - app_memory_usage_bytes: $memory_metric"
        
        return 0
    else
        print_status "error" "Metrics endpoint check failed"
        return 1
    fi
}

# Function to perform load test
load_test() {
    local url=$1
    local concurrent=${2:-10}
    local requests=${3:-100}
    
    print_status "info" "Performing load test: $concurrent concurrent users, $requests total requests"
    
    # Simple load test using curl
    local success_count=0
    local failure_count=0
    
    for ((i=1; i<=requests; i++)); do
        if curl -f -s --max-time 5 "$url/health" > /dev/null; then
            ((success_count++))
        else
            ((failure_count++))
        fi
        
        # Show progress every 20 requests
        if ((i % 20 == 0)); then
            echo "   Progress: $i/$requests requests completed"
        fi
    done
    
    local success_rate=$((success_count * 100 / requests))
    
    echo "📊 Load Test Results:"
    echo "   - Total Requests: $requests"
    echo "   - Successful: $success_count"
    echo "   - Failed: $failure_count"
    echo "   - Success Rate: $success_rate%"
    
    if [ $success_rate -ge 95 ]; then
        print_status "success" "Load test passed (≥95% success rate)"
        return 0
    else
        print_status "error" "Load test failed (<95% success rate)"
        return 1
    fi
}

# Function to monitor continuously
continuous_monitor() {
    local url=$1
    local interval=${2:-$DEFAULT_INTERVAL}
    
    print_status "info" "Starting continuous monitoring (interval: ${interval}s)"
    print_status "info" "Press Ctrl+C to stop monitoring"
    
    while true; do
        local timestamp
        timestamp=$(date '+%Y-%m-%d %H:%M:%S')
        echo ""
        echo "🕐 Health Check at $timestamp"
        echo "================================"
        
        basic_health_check "$url" 5
        sleep 2
        readiness_check "$url" 5
        
        echo "Next check in ${interval} seconds..."
        sleep "$interval"
    done
}

# Function to perform comprehensive health check
comprehensive_check() {
    local url=$1
    local retries=${2:-$DEFAULT_RETRIES}
    
    print_status "info" "Starting comprehensive health check for $url"
    echo "========================================================"
    
    local checks_passed=0
    local total_checks=4
    
    # Basic health check with retries
    for ((i=1; i<=retries; i++)); do
        if basic_health_check "$url"; then
            ((checks_passed++))
            break
        else
            if [ $i -lt $retries ]; then
                print_status "warning" "Retry $i/$retries failed, waiting 5 seconds..."
                sleep 5
            fi
        fi
    done
    
    sleep 2
    
    # Detailed health check
    if detailed_health_check "$url"; then
        ((checks_passed++))
    fi
    
    sleep 2
    
    # Readiness check
    if readiness_check "$url"; then
        ((checks_passed++))
    fi
    
    sleep 2
    
    # Metrics check
    if metrics_check "$url"; then
        ((checks_passed++))
    fi
    
    echo ""
    echo "========================================================"
    echo "📋 Summary: $checks_passed/$total_checks checks passed"
    
    if [ $checks_passed -eq $total_checks ]; then
        print_status "success" "All health checks passed!"
        return 0
    else
        print_status "error" "Some health checks failed!"
        return 1
    fi
}

# Function to show usage
show_usage() {
    echo "Health Monitor Script"
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  basic         Perform basic health check"
    echo "  detailed      Perform detailed health check"
    echo "  ready         Check readiness probe"
    echo "  metrics       Check metrics endpoint"
    echo "  load          Perform load test"
    echo "  monitor       Continuous monitoring"
    echo "  comprehensive Complete health check suite"
    echo ""
    echo "Options:"
    echo "  -u, --url URL         Target URL (default: $DEFAULT_URL)"
    echo "  -t, --timeout SEC     Request timeout (default: $DEFAULT_TIMEOUT)"
    echo "  -i, --interval SEC    Monitor interval (default: $DEFAULT_INTERVAL)"
    echo "  -r, --retries NUM     Number of retries (default: $DEFAULT_RETRIES)"
    echo "  -c, --concurrent NUM  Concurrent requests for load test (default: 10)"
    echo "  -n, --requests NUM    Total requests for load test (default: 100)"
    echo "  -h, --help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 comprehensive"
    echo "  $0 basic -u http://staging.app.com"
    echo "  $0 monitor -i 30"
    echo "  $0 load -c 20 -n 200"
}

# Main script logic
main() {
    local command=""
    local url="$DEFAULT_URL"
    local timeout="$DEFAULT_TIMEOUT"
    local interval="$DEFAULT_INTERVAL"
    local retries="$DEFAULT_RETRIES"
    local concurrent=10
    local requests=100
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            basic|detailed|ready|metrics|load|monitor|comprehensive)
                command="$1"
                shift
                ;;
            -u|--url)
                url="$2"
                shift 2
                ;;
            -t|--timeout)
                timeout="$2"
                shift 2
                ;;
            -i|--interval)
                interval="$2"
                shift 2
                ;;
            -r|--retries)
                retries="$2"
                shift 2
                ;;
            -c|--concurrent)
                concurrent="$2"
                shift 2
                ;;
            -n|--requests)
                requests="$2"
                shift 2
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # Default to comprehensive check if no command specified
    if [ -z "$command" ]; then
        command="comprehensive"
    fi
    
    # Execute the specified command
    case $command in
        basic)
            basic_health_check "$url" "$timeout"
            ;;
        detailed)
            detailed_health_check "$url" "$timeout"
            ;;
        ready)
            readiness_check "$url" "$timeout"
            ;;
        metrics)
            metrics_check "$url" "$timeout"
            ;;
        load)
            load_test "$url" "$concurrent" "$requests"
            ;;
        monitor)
            continuous_monitor "$url" "$interval"
            ;;
        comprehensive)
            comprehensive_check "$url" "$retries"
            ;;
        *)
            echo "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"

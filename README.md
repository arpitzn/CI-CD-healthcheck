# CI/CD Pipeline Monitoring & Alerting System

## 🎯 Project Overview
A comprehensive real-time CI/CD pipeline monitoring and alerting system that collects, visualizes, and analyzes build metrics while providing intelligent notifications for pipeline failures and performance issues.

This system demonstrates modern DevOps practices with AI-assisted development, providing a complete monitoring solution for Jenkins pipelines with advanced visualization and alerting capabilities.

## ✨ Key Features

### 📊 Real-time Metrics Collection
- Build success/failure rates with trend analysis
- Average build times across different stages
- Last build status monitoring
- Resource utilization tracking
- Historical data retention and analytics

### 📈 Interactive Dashboard
- Real-time pipeline status overview
- Build success/failure rate visualizations
- Build duration trend charts
- Recent builds with detailed information
- Filtering by project, time range, and environment

### 🚨 Intelligent Alerting System
- **Slack Integration**: Rich formatted notifications with contextual information
- **Email Alerts**: Professional HTML templates with build details
- **Webhook Support**: Custom integrations with external systems
- **Smart Rules**: Configurable alert conditions and cooldown periods

### 🐳 Modern Deployment
- Complete Docker containerization
- Multi-environment support (development, staging, production)
- Health checks and monitoring
- Load balancing with Nginx
- Prometheus & Grafana integration

## Architecture
```
Application → Build → Test → Security Scan → Deploy → Health Check → Monitor
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local development)
- Jenkins instance (for integration)
- Git

### 1. Clone Repository
```bash
git clone <repository-url>
cd cicd-monitoring-system
```

### 2. Environment Configuration
```bash
# Copy environment example
cp environment.example .env

# Edit configuration (required)
nano .env
```

### 3. Start the System
```bash
# Quick setup with script
./setup.sh

# Or manual setup
docker-compose up -d

# View logs
docker-compose logs -f
```

### 4. Access Applications
- **Dashboard**: http://localhost:3000
- **API**: http://localhost:3001/api
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin123)
- **Sample App**: http://localhost:3002

## Health Check Endpoints
- `/health` - Basic health status
- `/health/detailed` - Detailed system information
- `/metrics` - Application metrics
- `/ready` - Readiness probe for Kubernetes

## 🤖 AI Development Assistance

This project was developed with significant assistance from AI tools, demonstrating modern development practices:

### AI Tools Used
- **Claude Sonnet 4**: Architecture design, code generation, documentation
- **GitHub Copilot**: Code completion and suggestions  
- **Cursor IDE**: Intelligent code editing and refactoring

### AI Contributions
- **80%** of initial codebase generated with AI assistance
- **100%** of technical documentation created with AI
- Advanced architectural patterns suggested by AI
- Comprehensive test suite generation
- Security best practices implementation

For detailed AI usage logs, see [AI Prompt Logs](docs/ai-prompt-logs.md).

## 📚 Documentation

### Technical Documentation
- [Requirements Analysis](docs/requirement-analysis.md)
- [Technical Design](docs/tech-design.md)
- [AI Prompt Logs](docs/ai-prompt-logs.md)

## 🐳 Docker Services

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3000 | React dashboard |
| Backend | 3001 | Node.js API server |
| MongoDB | 27017 | Primary database |
| Redis | 6379 | Cache and sessions |
| Prometheus | 9090 | Metrics collection |
| Grafana | 3001 | Advanced visualization |
| Sample App | 3002 | Demo application |

## 🔧 Development

### Local Development
```bash
# Backend development
cd backend && npm install && npm run dev

# Frontend development  
cd frontend && npm install && npm start

# Database (Docker)
docker-compose up mongodb redis -d
```

### Testing
```bash
# Run all tests
npm test

# Integration tests
npm run test:integration
```

## 🎓 Academic Context

This project was created as part of DevOps engineering coursework to demonstrate:
- Modern CI/CD pipeline implementation
- Real-time monitoring and alerting systems
- Containerized microservices architecture
- AI-assisted software development
- Industry best practices and patterns

---

**Project Statistics**:
- **Lines of Code**: 3,000+ (Frontend + Backend)
- **Components**: 15+ React components, 10+ backend services
- **Test Coverage**: 80%+
- **Documentation**: 4 comprehensive technical documents
- **Development Time**: 8-10 hours with AI assistance

*Built with ❤️ using modern development practices and AI assistance*

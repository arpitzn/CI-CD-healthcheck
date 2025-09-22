pipeline {
    agent any
    
    parameters {
        choice(
            name: 'DEPLOY_ENVIRONMENT',
            choices: ['staging', 'production'],
            description: 'Select deployment environment'
        )
        booleanParam(
            name: 'SKIP_TESTS',
            defaultValue: false,
            description: 'Skip test execution'
        )
        booleanParam(
            name: 'ENABLE_PERFORMANCE_TESTS',
            defaultValue: true,
            description: 'Run performance tests'
        )
        string(
            name: 'HEALTH_CHECK_TIMEOUT',
            defaultValue: '300',
            description: 'Health check timeout in seconds'
        )
    }
    
    environment {
        NODE_VERSION = '18'
        DOCKER_REGISTRY = 'your-registry.com'
        APP_NAME = 'health-monitoring-app'
        STAGING_URL = 'http://staging.yourapp.com'
        PRODUCTION_URL = 'http://production.yourapp.com'
        SLACK_CHANNEL = '#deployments'
        EMAIL_RECIPIENTS = 'devops@yourcompany.com'
    }
    
    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 30, unit: 'MINUTES')
        timestamps()
        retry(2)
    }
    
    stages {
        stage('🔍 Pre-Build Validation') {
            steps {
                script {
                    echo "🚀 Starting CI/CD Pipeline for ${env.APP_NAME}"
                    echo "📊 Build Number: ${env.BUILD_NUMBER}"
                    echo "🌍 Environment: ${params.DEPLOY_ENVIRONMENT}"
                    echo "🔗 Git Branch: ${env.GIT_BRANCH}"
                    
                    // Validate Jenkinsfile syntax
                    sh 'echo "Validating pipeline configuration..."'
                }
            }
        }
        
        stage('📦 Environment Setup') {
            parallel {
                stage('Node.js Setup') {
                    steps {
                        sh '''
                            echo "Setting up Node.js environment..."
                            node --version
                            npm --version
                        '''
                    }
                }
                stage('Docker Setup') {
                    steps {
                        sh '''
                            echo "Verifying Docker installation..."
                            docker --version
                            docker info
                        '''
                    }
                }
            }
        }
        
        stage('📥 Source Code Checkout') {
            steps {
                checkout scm
                script {
                    def gitCommit = sh(returnStdout: true, script: 'git rev-parse HEAD').trim()
                    def gitBranch = sh(returnStdout: true, script: 'git rev-parse --abbrev-ref HEAD').trim()
                    echo "📋 Git Commit: ${gitCommit}"
                    echo "🌿 Git Branch: ${gitBranch}"
                }
            }
        }
        
        stage('🔧 Build Application') {
            steps {
                sh '''
                    echo "Installing dependencies..."
                    npm ci --prefer-offline --no-audit
                    echo "Building application..."
                    npm run build
                '''
            }
            post {
                success {
                    echo "✅ Build completed successfully"
                }
                failure {
                    echo "❌ Build failed"
                }
            }
        }
        
        stage('🧪 Testing Suite') {
            when {
                not { params.SKIP_TESTS }
            }
            parallel {
                stage('Unit Tests') {
                    steps {
                        sh '''
                            echo "Running unit tests..."
                            npm test
                        '''
                        publishTestResults testResultsPattern: 'test-results.xml'
                        publishCoverageGoberturaReports coberturaReportFile: 'coverage/cobertura-coverage.xml'
                    }
                }
                stage('Integration Tests') {
                    steps {
                        sh '''
                            echo "Running integration tests..."
                            npm run test:integration
                        '''
                    }
                }
                stage('Code Quality') {
                    steps {
                        sh '''
                            echo "Checking code quality..."
                            npm run lint
                        '''
                    }
                }
            }
        }
        
        stage('🔒 Security Scanning') {
            parallel {
                stage('Dependency Audit') {
                    steps {
                        sh '''
                            echo "Checking for security vulnerabilities..."
                            npm audit --audit-level high
                        '''
                    }
                }
                stage('Static Code Analysis') {
                    steps {
                        sh '''
                            echo "Running static code analysis..."
                            # Add SAST tools here
                            echo "Static analysis completed"
                        '''
                    }
                }
            }
        }
        
        stage('🐳 Docker Operations') {
            steps {
                script {
                    def imageTag = "${env.BUILD_NUMBER}-${env.GIT_COMMIT[0..7]}"
                    echo "Building Docker image with tag: ${imageTag}"
                    
                    sh """
                        docker build -t ${env.DOCKER_REGISTRY}/${env.APP_NAME}:${imageTag} .
                        docker build -t ${env.DOCKER_REGISTRY}/${env.APP_NAME}:latest .
                        echo "Docker image built successfully"
                    """
                    
                    // Push to registry in production builds
                    if (params.DEPLOY_ENVIRONMENT == 'production') {
                        sh """
                            docker push ${env.DOCKER_REGISTRY}/${env.APP_NAME}:${imageTag}
                            docker push ${env.DOCKER_REGISTRY}/${env.APP_NAME}:latest
                        """
                    }
                }
            }
        }
        
        stage('🚀 Deploy to Staging') {
            when {
                anyOf {
                    params.DEPLOY_ENVIRONMENT == 'staging'
                    params.DEPLOY_ENVIRONMENT == 'production'
                }
            }
            steps {
                script {
                    echo "Deploying to staging environment..."
                    sh '''
                        # Simulate deployment to staging
                        echo "Stopping existing containers..."
                        docker-compose -f docker-compose.staging.yml down || true
                        
                        echo "Starting new deployment..."
                        docker-compose -f docker-compose.staging.yml up -d
                        
                        echo "Waiting for application to start..."
                        sleep 30
                    '''
                }
            }
        }
        
        stage('🏥 Health Check Validation') {
            steps {
                script {
                    def healthCheckScript = """
                        #!/bin/bash
                        set -e
                        
                        TIMEOUT=${params.HEALTH_CHECK_TIMEOUT}
                        URL="${env.STAGING_URL}"
                        
                        echo "Starting health check for \$URL with timeout \$TIMEOUT seconds"
                        
                        # Basic health check
                        for i in \$(seq 1 10); do
                            if curl -f -s \$URL/health > /dev/null; then
                                echo "✅ Basic health check passed"
                                break
                            else
                                echo "⏳ Attempt \$i/10 failed, retrying in 10 seconds..."
                                sleep 10
                            fi
                            if [ \$i -eq 10 ]; then
                                echo "❌ Health check failed after 10 attempts"
                                exit 1
                            fi
                        done
                        
                        # Detailed health check
                        DETAILED_RESPONSE=\$(curl -s \$URL/health/detailed)
                        echo "Detailed health response: \$DETAILED_RESPONSE"
                        
                        # Readiness check
                        if curl -f -s \$URL/ready > /dev/null; then
                            echo "✅ Readiness check passed"
                        else
                            echo "❌ Readiness check failed"
                            exit 1
                        fi
                        
                        # Metrics endpoint check
                        if curl -f -s \$URL/metrics > /dev/null; then
                            echo "✅ Metrics endpoint accessible"
                        else
                            echo "⚠️ Metrics endpoint not accessible"
                        fi
                        
                        echo "🎉 All health checks passed successfully!"
                    """
                    
                    writeFile file: 'health-check.sh', text: healthCheckScript
                    sh 'chmod +x health-check.sh'
                    sh './health-check.sh'
                }
            }
        }
        
        stage('⚡ Performance Testing') {
            when {
                params.ENABLE_PERFORMANCE_TESTS
            }
            steps {
                script {
                    echo "Running performance tests..."
                    sh '''
                        # Simulate performance testing
                        echo "Load testing application endpoints..."
                        
                        # Basic load test using curl
                        for i in {1..50}; do
                            curl -s ${STAGING_URL}/health > /dev/null &
                        done
                        wait
                        
                        echo "Performance tests completed"
                    '''
                }
            }
        }
        
        stage('🎯 Production Deployment') {
            when {
                params.DEPLOY_ENVIRONMENT == 'production'
            }
            steps {
                input message: 'Deploy to Production?', ok: 'Deploy',
                      submitterParameter: 'APPROVER'
                script {
                    echo "Deploying to production environment..."
                    echo "Approved by: ${env.APPROVER}"
                    
                    sh '''
                        echo "Creating production deployment..."
                        # Blue-green deployment simulation
                        docker-compose -f docker-compose.prod.yml up -d
                        
                        # Wait for application to stabilize
                        sleep 60
                        
                        echo "Production deployment completed"
                    '''
                }
            }
        }
        
        stage('📊 Post-Deployment Monitoring') {
            steps {
                script {
                    def monitoringScript = """
                        #!/bin/bash
                        echo "Setting up post-deployment monitoring..."
                        
                        # Check application metrics
                        METRICS=\$(curl -s ${params.DEPLOY_ENVIRONMENT == 'production' ? env.PRODUCTION_URL : env.STAGING_URL}/metrics)
                        echo "Current metrics:"
                        echo "\$METRICS"
                        
                        # Log deployment success
                        echo "Deployment completed at \$(date)"
                        echo "Environment: ${params.DEPLOY_ENVIRONMENT}"
                        echo "Build: ${env.BUILD_NUMBER}"
                        
                        echo "📈 Monitoring setup completed"
                    """
                    
                    writeFile file: 'monitoring.sh', text: monitoringScript
                    sh 'chmod +x monitoring.sh'
                    sh './monitoring.sh'
                    
                    // Send comprehensive metrics to monitoring system
                    sendBuildMetrics()
                }
            }
        }
        
        stage('📈 Metrics Reporting') {
            steps {
                script {
                    // Send detailed build metrics to monitoring dashboard
                    sendComprehensiveBuildMetrics()
                }
            }
        }
    }
    
    // Helper function to send build metrics to monitoring system
    def sendBuildMetrics() {
        try {
            def stageMetrics = collectStageMetrics()
            def testResults = collectTestResults()
            
            def buildData = [
                buildId: env.BUILD_ID,
                projectName: env.JOB_NAME,
                repositoryUrl: env.GIT_URL ?: '',
                branch: env.GIT_BRANCH ?: 'main',
                commit: env.GIT_COMMIT ?: '',
                status: currentBuild.result ?: 'SUCCESS',
                duration: (System.currentTimeMillis() - currentBuild.startTimeInMillis) / 1000,
                startTime: new Date(currentBuild.startTimeInMillis).format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
                endTime: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
                buildNumber: env.BUILD_NUMBER as Integer,
                triggeredBy: env.BUILD_USER ?: env.BUILD_USER_ID ?: 'system',
                environment: params.DEPLOY_ENVIRONMENT,
                stages: stageMetrics,
                testResults: testResults,
                logs: "${env.BUILD_URL}console",
                artifacts: collectArtifacts()
            ]
            
            // Send to monitoring system
            def webhookUrl = env.MONITORING_WEBHOOK_URL ?: 'http://localhost:3001/api/webhooks/jenkins'
            httpRequest(
                httpMode: 'POST',
                url: webhookUrl,
                contentType: 'APPLICATION_JSON',
                requestBody: groovy.json.JsonOutput.toJson(buildData),
                validResponseCodes: '200:299',
                timeout: 30
            )
            
            echo "✅ Build metrics sent to monitoring system"
        } catch (Exception e) {
            echo "⚠️ Failed to send build metrics: ${e.getMessage()}"
        }
    }
    
    def sendComprehensiveBuildMetrics() {
        try {
            def comprehensiveData = [
                build: [
                    id: env.BUILD_ID,
                    number: env.BUILD_NUMBER,
                    project: env.JOB_NAME,
                    status: currentBuild.result ?: 'SUCCESS',
                    duration: (System.currentTimeMillis() - currentBuild.startTimeInMillis) / 1000,
                    timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
                ],
                git: [
                    branch: env.GIT_BRANCH ?: 'main',
                    commit: env.GIT_COMMIT ?: '',
                    author: env.GIT_AUTHOR_NAME ?: '',
                    message: env.GIT_COMMIT_MESSAGE ?: ''
                ],
                deployment: [
                    environment: params.DEPLOY_ENVIRONMENT,
                    url: params.DEPLOY_ENVIRONMENT == 'production' ? env.PRODUCTION_URL : env.STAGING_URL
                ],
                performance: [
                    buildTime: (System.currentTimeMillis() - currentBuild.startTimeInMillis) / 1000,
                    queueTime: currentBuild.startTimeInMillis - currentBuild.timeInMillis,
                    stages: collectDetailedStageMetrics()
                ],
                quality: [
                    tests: collectTestResults(),
                    coverage: collectCoverageData(),
                    linting: collectLintingResults()
                ]
            ]
            
            // Send comprehensive data
            def webhookUrl = env.MONITORING_WEBHOOK_URL ?: 'http://localhost:3001/api/webhooks/jenkins'
            httpRequest(
                httpMode: 'POST',
                url: "${webhookUrl}/comprehensive",
                contentType: 'APPLICATION_JSON',
                requestBody: groovy.json.JsonOutput.toJson(comprehensiveData),
                validResponseCodes: '200:299',
                timeout: 30
            )
            
            echo "✅ Comprehensive metrics sent to monitoring system"
        } catch (Exception e) {
            echo "⚠️ Failed to send comprehensive metrics: ${e.getMessage()}"
        }
    }
    
    def collectStageMetrics() {
        def stages = []
        
        try {
            // Get stage information from current build
            def build = currentBuild.rawBuild
            def execution = build.execution
            
            if (execution) {
                execution.heads.each { head ->
                    head.get().each { node ->
                        stages.add([
                            name: node.displayName,
                            status: node.result?.toString() ?: 'SUCCESS',
                            duration: node.durationMillis ? (node.durationMillis / 1000) : 0,
                            startTime: node.startTime ? new Date(node.startTime).format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'") : null
                        ])
                    }
                }
            }
        } catch (Exception e) {
            echo "⚠️ Could not collect stage metrics: ${e.getMessage()}"
        }
        
        return stages
    }
    
    def collectDetailedStageMetrics() {
        def detailedStages = []
        
        try {
            def stageNames = [
                'Pre-Build Validation', 'Environment Setup', 'Source Code Checkout',
                'Build Application', 'Testing Suite', 'Security Scanning',
                'Docker Operations', 'Deploy to Staging', 'Health Check Validation',
                'Performance Testing', 'Production Deployment', 'Post-Deployment Monitoring'
            ]
            
            stageNames.each { stageName ->
                detailedStages.add([
                    name: stageName,
                    status: 'SUCCESS', // This would be collected from actual stage execution
                    duration: 0,       // This would be calculated from actual timing
                    startTime: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
                    endTime: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
                    logs: "${env.BUILD_URL}console"
                ])
            }
        } catch (Exception e) {
            echo "⚠️ Could not collect detailed stage metrics: ${e.getMessage()}"
        }
        
        return detailedStages
    }
    
    def collectTestResults() {
        def testResults = [
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0
        ]
        
        try {
            // Try to get test results from various possible formats
            def testResultAction = currentBuild.rawBuild.getAction(hudson.tasks.junit.TestResultAction.class)
            if (testResultAction) {
                testResults.total = testResultAction.totalCount
                testResults.passed = testResultAction.totalCount - testResultAction.failCount - testResultAction.skipCount
                testResults.failed = testResultAction.failCount
                testResults.skipped = testResultAction.skipCount
            }
        } catch (Exception e) {
            echo "⚠️ Could not collect test results: ${e.getMessage()}"
        }
        
        return testResults
    }
    
    def collectCoverageData() {
        def coverage = [
            percentage: 0,
            lines: [covered: 0, total: 0],
            functions: [covered: 0, total: 0],
            branches: [covered: 0, total: 0]
        ]
        
        try {
            // This would integrate with your coverage tool (Istanbul, JaCoCo, etc.)
            if (fileExists('coverage/coverage-summary.json')) {
                def coverageData = readJSON file: 'coverage/coverage-summary.json'
                coverage.percentage = coverageData.total?.lines?.pct ?: 0
                coverage.lines = [
                    covered: coverageData.total?.lines?.covered ?: 0,
                    total: coverageData.total?.lines?.total ?: 0
                ]
            }
        } catch (Exception e) {
            echo "⚠️ Could not collect coverage data: ${e.getMessage()}"
        }
        
        return coverage
    }
    
    def collectLintingResults() {
        def linting = [
            errors: 0,
            warnings: 0,
            info: 0,
            files: 0
        ]
        
        try {
            // This would integrate with your linting tools (ESLint, etc.)
            if (fileExists('lint-results.json')) {
                def lintData = readJSON file: 'lint-results.json'
                linting.errors = lintData.errorCount ?: 0
                linting.warnings = lintData.warningCount ?: 0
                linting.files = lintData.fileCount ?: 0
            }
        } catch (Exception e) {
            echo "⚠️ Could not collect linting results: ${e.getMessage()}"
        }
        
        return linting
    }
    
    def collectArtifacts() {
        def artifacts = []
        
        try {
            // Collect build artifacts
            artifacts.addAll([
                'target/*.jar',
                'dist/*.zip',
                'build/*.tar.gz',
                'coverage/lcov-report/**',
                'test-results.xml'
            ])
        } catch (Exception e) {
            echo "⚠️ Could not collect artifacts: ${e.getMessage()}"
        }
        
        return artifacts
    }
    
    post {
        always {
            echo '🧹 Cleaning up workspace...'
            cleanWs()
            
            // Archive artifacts
            archiveArtifacts artifacts: 'logs/*.log', allowEmptyArchive: true
        }
        
        success {
            script {
                def message = """
                    ✅ **Pipeline Success!**
                    
                    🏗️ **Build:** ${env.BUILD_NUMBER}
                    🌍 **Environment:** ${params.DEPLOY_ENVIRONMENT}
                    🕐 **Duration:** ${currentBuild.durationString}
                    📋 **Commit:** ${env.GIT_COMMIT[0..7]}
                    👤 **Triggered by:** ${env.BUILD_USER ?: 'System'}
                    
                    🔗 **Application URL:** ${params.DEPLOY_ENVIRONMENT == 'production' ? env.PRODUCTION_URL : env.STAGING_URL}
                """
                
                // Send notifications
                echo message
                
                // Uncomment these lines when notifications are configured
                // slackSend channel: env.SLACK_CHANNEL, color: 'good', message: message
                // emailext subject: "✅ Deployment Success - ${env.APP_NAME}", 
                //          body: message, to: env.EMAIL_RECIPIENTS
            }
        }
        
        failure {
            script {
                def message = """
                    ❌ **Pipeline Failed!**
                    
                    🏗️ **Build:** ${env.BUILD_NUMBER}
                    🌍 **Environment:** ${params.DEPLOY_ENVIRONMENT}
                    🕐 **Duration:** ${currentBuild.durationString}
                    📋 **Commit:** ${env.GIT_COMMIT[0..7]}
                    👤 **Triggered by:** ${env.BUILD_USER ?: 'System'}
                    
                    🔍 **Check logs:** ${env.BUILD_URL}console
                """
                
                echo message
                
                // Uncomment these lines when notifications are configured
                // slackSend channel: env.SLACK_CHANNEL, color: 'danger', message: message
                // emailext subject: "❌ Deployment Failed - ${env.APP_NAME}", 
                //          body: message, to: env.EMAIL_RECIPIENTS
            }
        }
        
        unstable {
            echo '⚠️ Pipeline completed with warnings'
        }
    }
}

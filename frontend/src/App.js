import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [metrics, setMetrics] = useState({
    totalBuilds: 156,
    successRate: 94.2,
    avgBuildTime: 8.5,
    activeAlerts: 2
  });

  const [builds, setBuilds] = useState([
    { id: 1, project: 'frontend-app', status: 'success', duration: '5m 23s', time: '2 minutes ago' },
    { id: 2, project: 'backend-api', status: 'success', duration: '7m 45s', time: '15 minutes ago' },
    { id: 3, project: 'mobile-app', status: 'failure', duration: '12m 10s', time: '1 hour ago' },
    { id: 4, project: 'data-pipeline', status: 'success', duration: '15m 32s', time: '2 hours ago' }
  ]);

  const [connectionStatus, setConnectionStatus] = useState('connected');

  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        totalBuilds: prev.totalBuilds + Math.floor(Math.random() * 2),
        successRate: Math.max(85, Math.min(99, prev.successRate + (Math.random() - 0.5) * 2))
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return '#28a745';
      case 'failure': return '#dc3545';
      case 'running': return '#007bff';
      default: return '#6c757d';
    }
  };

  const getStatusEmoji = (status) => {
    switch (status) {
      case 'success': return '✅';
      case 'failure': return '❌';
      case 'running': return '🔄';
      default: return '⏸️';
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1 className="App-title">🚀 CI/CD Monitoring Dashboard</h1>
        <p className="App-subtitle">Real-time Pipeline Monitoring & Alerting System</p>
        <div className={`status-indicator status-${connectionStatus === 'connected' ? 'success' : 'info'}`}>
          {connectionStatus === 'connected' ? '🟢' : '🔄'} {connectionStatus === 'connected' ? 'Connected' : 'Connecting...'}
        </div>
      </header>

      <main className="dashboard">
        <div className="welcome-section">
          <h2 className="welcome-title">Welcome to Your CI/CD Command Center</h2>
          <p className="welcome-description">
            Monitor your build pipelines, track success rates, and get instant alerts when things go wrong. 
            This dashboard provides real-time insights into your development workflow with comprehensive 
            metrics and intelligent alerting.
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <span className="feature-icon">📊</span>
            <h3 className="feature-title">Total Builds</h3>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#007bff', margin: '16px 0' }}>
              {metrics.totalBuilds}
            </div>
            <p className="feature-description">
              Complete builds executed across all your projects and environments
            </p>
          </div>

          <div className="feature-card">
            <span className="feature-icon">🎯</span>
            <h3 className="feature-title">Success Rate</h3>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: metrics.successRate >= 95 ? '#28a745' : '#ffc107', margin: '16px 0' }}>
              {metrics.successRate.toFixed(1)}%
            </div>
            <p className="feature-description">
              Percentage of successful builds in the last 24 hours
            </p>
          </div>

          <div className="feature-card">
            <span className="feature-icon">⏱️</span>
            <h3 className="feature-title">Avg Build Time</h3>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#17a2b8', margin: '16px 0' }}>
              {metrics.avgBuildTime.toFixed(1)}m
            </div>
            <p className="feature-description">
              Average duration of build execution across all pipelines
            </p>
          </div>

          <div className="feature-card">
            <span className="feature-icon">🚨</span>
            <h3 className="feature-title">Active Alerts</h3>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: metrics.activeAlerts > 0 ? '#dc3545' : '#28a745', margin: '16px 0' }}>
              {metrics.activeAlerts}
            </div>
            <p className="feature-description">
              Current alerts requiring attention from your DevOps team
            </p>
          </div>
        </div>

        <div className="welcome-section" style={{ marginTop: '60px' }}>
          <h2 className="welcome-title">Recent Build Activity</h2>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}>
            {builds.map(build => (
              <div key={build.id} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '16px 0', 
                borderBottom: '1px solid #e0e0e0' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '1.5rem' }}>{getStatusEmoji(build.status)}</span>
                  <div>
                    <div style={{ fontWeight: '600', color: '#333' }}>{build.project}</div>
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>Duration: {build.duration}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: getStatusColor(build.status), fontWeight: '500', textTransform: 'capitalize' }}>
                    {build.status}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#666' }}>{build.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="links-section">
          <h3 className="welcome-title">System Components</h3>
          <p style={{ color: '#666', marginBottom: '24px' }}>
            Access different parts of your monitoring infrastructure:
          </p>
          <div className="links-grid">
            <a href="http://localhost:3001/api" target="_blank" rel="noopener noreferrer" className="service-link">
              <div className="service-name">🔧 Backend API</div>
              <div className="service-url">localhost:3001/api</div>
            </a>
            <a href="http://localhost:3002" target="_blank" rel="noopener noreferrer" className="service-link">
              <div className="service-name">📱 Sample App</div>
              <div className="service-url">localhost:3002</div>
            </a>
            <a href="http://localhost:9090" target="_blank" rel="noopener noreferrer" className="service-link">
              <div className="service-name">📈 Prometheus</div>
              <div className="service-url">localhost:9090</div>
            </a>
            <a href="http://localhost:3003" target="_blank" rel="noopener noreferrer" className="service-link">
              <div className="service-name">📊 Grafana</div>
              <div className="service-url">localhost:3003</div>
            </a>
          </div>
        </div>

        <div style={{ marginTop: '60px', padding: '24px', background: 'white', borderRadius: '12px', textAlign: 'center' }}>
          <h3 style={{ color: '#333', marginBottom: '16px' }}>🤖 AI-Powered Development</h3>
          <p style={{ color: '#666', lineHeight: '1.6' }}>
            This entire monitoring system was built with AI assistance using Claude Sonnet 4, GitHub Copilot, and Cursor IDE. 
            The development process demonstrates modern AI-assisted software engineering practices, achieving in hours 
            what would traditionally take weeks to implement.
          </p>
          <div style={{ marginTop: '20px', display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <span style={{ background: '#e3f2fd', color: '#1565c0', padding: '8px 16px', borderRadius: '20px', fontSize: '0.9rem' }}>
              80% AI-Generated Code
            </span>
            <span style={{ background: '#e8f5e8', color: '#2e7d32', padding: '8px 16px', borderRadius: '20px', fontSize: '0.9rem' }}>
              Real-time Monitoring
            </span>
            <span style={{ background: '#fff3e0', color: '#ef6c00', padding: '8px 16px', borderRadius: '20px', fontSize: '0.9rem' }}>
              Intelligent Alerts
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Timeline, Alert, Spin, Select, DatePicker } from 'antd';
import { 
  TrophyOutlined, 
  WarningOutlined, 
  ClockCircleOutlined, 
  RocketOutlined,
  BuildOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { useQuery } from 'react-query';
import moment from 'moment';

import MetricsOverview from '../../components/Dashboard/MetricsOverview';
import BuildStatusCard from '../../components/Dashboard/BuildStatusCard';
import TrendChart from '../../components/Dashboard/TrendChart';
import RecentBuilds from '../../components/Dashboard/RecentBuilds';
import SuccessRateChart from '../../components/Charts/SuccessRateChart';
import BuildTimeChart from '../../components/Charts/BuildTimeChart';
import DeploymentFrequency from '../../components/Charts/DeploymentFrequency';

import { useWebSocket } from '../../contexts/WebSocketContext';
import { api } from '../../services/api';

import './Dashboard.css';

const { Option } = Select;
const { RangePicker } = DatePicker;

const Dashboard = () => {
  const [timeRange, setTimeRange] = useState('24h');
  const [selectedProject, setSelectedProject] = useState('all');
  const [dateRange, setDateRange] = useState([
    moment().subtract(24, 'hours'),
    moment()
  ]);

  const { socket, isConnected } = useWebSocket();

  // Fetch dashboard metrics
  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery(
    ['dashboard-metrics', timeRange, selectedProject],
    () => api.getDashboardMetrics({ 
      timeRange, 
      project: selectedProject,
      startDate: dateRange[0].toISOString(),
      endDate: dateRange[1].toISOString()
    }),
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  // Fetch recent builds
  const { data: recentBuilds, isLoading: buildsLoading, refetch: refetchBuilds } = useQuery(
    ['recent-builds', selectedProject],
    () => api.getRecentBuilds({ project: selectedProject, limit: 10 }),
    {
      refetchInterval: 30000,
    }
  );

  // Fetch projects list
  const { data: projects } = useQuery(
    'projects',
    () => api.getProjects(),
    {
      staleTime: 300000, // 5 minutes
    }
  );

  // Listen for real-time updates
  useEffect(() => {
    if (socket && isConnected) {
      const handleBuildUpdate = (buildData) => {
        console.log('Build update received:', buildData);
        refetchMetrics();
        refetchBuilds();
      };

      const handleMetricsUpdate = (metricsData) => {
        console.log('Metrics update received:', metricsData);
        refetchMetrics();
      };

      socket.on('build.completed', handleBuildUpdate);
      socket.on('build.started', handleBuildUpdate);
      socket.on('metrics.updated', handleMetricsUpdate);

      return () => {
        socket.off('build.completed', handleBuildUpdate);
        socket.off('build.started', handleBuildUpdate);
        socket.off('metrics.updated', handleMetricsUpdate);
      };
    }
  }, [socket, isConnected, refetchMetrics, refetchBuilds]);

  const handleTimeRangeChange = (value) => {
    setTimeRange(value);
    const ranges = {
      '1h': [moment().subtract(1, 'hours'), moment()],
      '24h': [moment().subtract(24, 'hours'), moment()],
      '7d': [moment().subtract(7, 'days'), moment()],
      '30d': [moment().subtract(30, 'days'), moment()],
    };
    setDateRange(ranges[value] || ranges['24h']);
  };

  const handleDateRangeChange = (dates) => {
    setDateRange(dates);
    setTimeRange('custom');
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'failure':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'running':
        return <ClockCircleOutlined style={{ color: '#1890ff' }} />;
      default:
        return <BuildOutlined />;
    }
  };

  if (metricsLoading || buildsLoading) {
    return (
      <div className="dashboard-loading">
        <Spin size="large" />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Connection Status */}
      {!isConnected && (
        <Alert
          message="Connection Lost"
          description="Real-time updates are currently unavailable. The dashboard will continue to refresh automatically."
          type="warning"
          showIcon
          closable
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Dashboard Controls */}
      <Row gutter={16} className="dashboard-controls">
        <Col>
          <Select
            value={selectedProject}
            onChange={setSelectedProject}
            style={{ width: 200 }}
            placeholder="Select Project"
          >
            <Option value="all">All Projects</Option>
            {projects?.map(project => (
              <Option key={project.name} value={project.name}>
                {project.displayName || project.name}
              </Option>
            ))}
          </Select>
        </Col>
        <Col>
          <Select
            value={timeRange}
            onChange={handleTimeRangeChange}
            style={{ width: 120 }}
          >
            <Option value="1h">Last Hour</Option>
            <Option value="24h">Last 24h</Option>
            <Option value="7d">Last 7 days</Option>
            <Option value="30d">Last 30 days</Option>
            <Option value="custom">Custom</Option>
          </Select>
        </Col>
        <Col>
          <RangePicker
            value={dateRange}
            onChange={handleDateRangeChange}
            showTime
            format="YYYY-MM-DD HH:mm"
          />
        </Col>
      </Row>

      {/* Key Metrics Cards */}
      <Row gutter={16} className="metrics-overview">
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Builds"
              value={metrics?.totalBuilds || 0}
              prefix={<BuildOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Success Rate"
              value={metrics?.successRate || 0}
              precision={1}
              suffix="%"
              prefix={<TrophyOutlined />}
              valueStyle={{ 
                color: (metrics?.successRate || 0) >= 95 ? '#52c41a' : '#ff4d4f' 
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Avg Build Time"
              value={metrics?.averageBuildTime || 0}
              precision={0}
              suffix="min"
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Alerts"
              value={metrics?.activeAlerts || 0}
              prefix={<WarningOutlined />}
              valueStyle={{ 
                color: (metrics?.activeAlerts || 0) > 0 ? '#ff4d4f' : '#52c41a' 
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Charts and Visualizations */}
      <Row gutter={16} className="charts-section">
        <Col xs={24} lg={12}>
          <Card title="Build Success Rate Trend" className="chart-card">
            <SuccessRateChart 
              data={metrics?.successRateTrend || []} 
              timeRange={timeRange}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Build Duration Trend" className="chart-card">
            <BuildTimeChart 
              data={metrics?.buildTimeTrend || []} 
              timeRange={timeRange}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} className="charts-section">
        <Col xs={24} lg={16}>
          <Card title="Deployment Frequency" className="chart-card">
            <DeploymentFrequency 
              data={metrics?.deploymentFrequency || []} 
              timeRange={timeRange}
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Pipeline Health" className="chart-card">
            <MetricsOverview metrics={metrics} />
          </Card>
        </Col>
      </Row>

      {/* Recent Builds and Timeline */}
      <Row gutter={16} className="builds-section">
        <Col xs={24} lg={16}>
          <Card title="Recent Builds" className="builds-card">
            <RecentBuilds builds={recentBuilds || []} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Build Timeline" className="timeline-card">
            <Timeline>
              {recentBuilds?.slice(0, 8).map((build, index) => (
                <Timeline.Item
                  key={build.id}
                  dot={getStatusIcon(build.status)}
                  color={build.status === 'success' ? 'green' : 
                         build.status === 'failure' ? 'red' : 'blue'}
                >
                  <div className="timeline-item">
                    <div className="timeline-title">
                      {build.projectName} #{build.buildNumber}
                    </div>
                    <div className="timeline-meta">
                      {moment(build.timestamp).fromNow()}
                    </div>
                    <div className="timeline-details">
                      {build.branch} • {build.duration}s • {build.triggeredBy}
                    </div>
                  </div>
                </Timeline.Item>
              ))}
            </Timeline>
          </Card>
        </Col>
      </Row>

      {/* Build Status Cards */}
      <Row gutter={16} className="status-cards">
        {metrics?.projectStatus?.map((project) => (
          <Col xs={24} sm={12} lg={8} xl={6} key={project.name}>
            <BuildStatusCard project={project} />
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default Dashboard;

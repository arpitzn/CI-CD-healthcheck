import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Spin } from 'antd';
import moment from 'moment';

const SuccessRateChart = ({ data, timeRange, loading = false }) => {
  if (loading) {
    return (
      <div className="chart-loading">
        <Spin size="large" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="chart-empty">
        <p>No data available for the selected time range</p>
      </div>
    );
  }

  // Format data for the chart
  const chartData = data.map(item => ({
    ...item,
    timestamp: moment(item.timestamp).format(getTimeFormat(timeRange)),
    successRate: parseFloat(item.successRate.toFixed(2)),
    totalBuilds: item.totalBuilds || 0,
    successfulBuilds: item.successfulBuilds || 0,
    failedBuilds: item.failedBuilds || 0
  }));

  function getTimeFormat(timeRange) {
    switch (timeRange) {
      case '1h':
        return 'HH:mm';
      case '24h':
        return 'HH:mm';
      case '7d':
        return 'MMM DD';
      case '30d':
        return 'MMM DD';
      default:
        return 'MMM DD HH:mm';
    }
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="custom-tooltip">
          <div className="tooltip-header">
            <strong>{label}</strong>
          </div>
          <div className="tooltip-content">
            <div className="tooltip-item">
              <span className="tooltip-label">Success Rate:</span>
              <span className="tooltip-value success">{data.successRate}%</span>
            </div>
            <div className="tooltip-item">
              <span className="tooltip-label">Total Builds:</span>
              <span className="tooltip-value">{data.totalBuilds}</span>
            </div>
            <div className="tooltip-item">
              <span className="tooltip-label">Successful:</span>
              <span className="tooltip-value success">{data.successfulBuilds}</span>
            </div>
            <div className="tooltip-item">
              <span className="tooltip-label">Failed:</span>
              <span className="tooltip-value failure">{data.failedBuilds}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="success-rate-chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="successGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#52c41a" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#52c41a" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="timestamp" 
            tick={{ fontSize: 12 }}
            stroke="#8c8c8c"
          />
          <YAxis 
            domain={[0, 100]}
            tick={{ fontSize: 12 }}
            stroke="#8c8c8c"
            label={{ value: 'Success Rate (%)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="successRate"
            stroke="#52c41a"
            strokeWidth={2}
            fill="url(#successGradient)"
            dot={{ fill: '#52c41a', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#52c41a', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
      
      {/* Chart Summary */}
      <div className="chart-summary">
        <div className="summary-item">
          <span className="summary-label">Current Rate:</span>
          <span className="summary-value success">
            {chartData.length > 0 ? chartData[chartData.length - 1].successRate : 0}%
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Average:</span>
          <span className="summary-value">
            {chartData.length > 0 ? 
              (chartData.reduce((sum, item) => sum + item.successRate, 0) / chartData.length).toFixed(1) : 0
            }%
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Trend:</span>
          <span className={`summary-value ${getTrendClass(chartData)}`}>
            {getTrendText(chartData)}
          </span>
        </div>
      </div>
    </div>
  );
};

function getTrendClass(data) {
  if (data.length < 2) return '';
  const recent = data.slice(-3);
  const average = recent.reduce((sum, item) => sum + item.successRate, 0) / recent.length;
  const previous = data.slice(-6, -3);
  const previousAverage = previous.length > 0 ? 
    previous.reduce((sum, item) => sum + item.successRate, 0) / previous.length : average;
  
  if (average > previousAverage) return 'trend-up';
  if (average < previousAverage) return 'trend-down';
  return 'trend-stable';
}

function getTrendText(data) {
  if (data.length < 2) return 'No trend';
  const trendClass = getTrendClass(data);
  
  switch (trendClass) {
    case 'trend-up':
      return '↗ Improving';
    case 'trend-down':
      return '↘ Declining';
    default:
      return '→ Stable';
  }
}

export default SuccessRateChart;

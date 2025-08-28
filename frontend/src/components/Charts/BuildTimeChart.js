import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Spin } from 'antd';
import moment from 'moment';

const BuildTimeChart = ({ data, timeRange, loading = false }) => {
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
        <p>No build time data available</p>
      </div>
    );
  }

  // Format data for the chart
  const chartData = data.map(item => ({
    ...item,
    timestamp: moment(item.timestamp).format(getTimeFormat(timeRange)),
    averageBuildTime: parseFloat((item.averageBuildTime / 60).toFixed(2)), // Convert to minutes
    maxBuildTime: parseFloat((item.maxBuildTime / 60).toFixed(2)),
    minBuildTime: parseFloat((item.minBuildTime / 60).toFixed(2)),
    buildCount: item.buildCount || 0
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
              <span className="tooltip-label">Average Time:</span>
              <span className="tooltip-value">{data.averageBuildTime} min</span>
            </div>
            <div className="tooltip-item">
              <span className="tooltip-label">Max Time:</span>
              <span className="tooltip-value warning">{data.maxBuildTime} min</span>
            </div>
            <div className="tooltip-item">
              <span className="tooltip-label">Min Time:</span>
              <span className="tooltip-value success">{data.minBuildTime} min</span>
            </div>
            <div className="tooltip-item">
              <span className="tooltip-label">Build Count:</span>
              <span className="tooltip-value">{data.buildCount}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Calculate if we should show as bar chart or line chart based on data density
  const useBarChart = chartData.length <= 20 && timeRange !== '1h';

  return (
    <div className="build-time-chart">
      <ResponsiveContainer width="100%" height="100%">
        {useBarChart ? (
          <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="timestamp" 
              tick={{ fontSize: 12 }}
              stroke="#8c8c8c"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              stroke="#8c8c8c"
              label={{ value: 'Build Time (min)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="averageBuildTime"
              fill="#1890ff"
              radius={[2, 2, 0, 0]}
              opacity={0.8}
            />
          </BarChart>
        ) : (
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="timestamp" 
              tick={{ fontSize: 12 }}
              stroke="#8c8c8c"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              stroke="#8c8c8c"
              label={{ value: 'Build Time (min)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="averageBuildTime"
              stroke="#1890ff"
              strokeWidth={2}
              dot={{ fill: '#1890ff', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#1890ff', strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="maxBuildTime"
              stroke="#ff7875"
              strokeWidth={1}
              strokeDasharray="5 5"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="minBuildTime"
              stroke="#73d13d"
              strokeWidth={1}
              strokeDasharray="5 5"
              dot={false}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
      
      {/* Chart Summary */}
      <div className="chart-summary">
        <div className="summary-item">
          <span className="summary-label">Current Avg:</span>
          <span className="summary-value">
            {chartData.length > 0 ? chartData[chartData.length - 1].averageBuildTime : 0} min
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Overall Avg:</span>
          <span className="summary-value">
            {chartData.length > 0 ? 
              (chartData.reduce((sum, item) => sum + item.averageBuildTime, 0) / chartData.length).toFixed(1) : 0
            } min
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Performance:</span>
          <span className={`summary-value ${getPerformanceClass(chartData)}`}>
            {getPerformanceText(chartData)}
          </span>
        </div>
      </div>

      {/* Legend for line chart */}
      {!useBarChart && (
        <div className="chart-legend">
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#1890ff' }}></div>
            <span>Average</span>
          </div>
          <div className="legend-item">
            <div className="legend-color dashed" style={{ backgroundColor: '#ff7875' }}></div>
            <span>Maximum</span>
          </div>
          <div className="legend-item">
            <div className="legend-color dashed" style={{ backgroundColor: '#73d13d' }}></div>
            <span>Minimum</span>
          </div>
        </div>
      )}
    </div>
  );
};

function getPerformanceClass(data) {
  if (data.length < 2) return '';
  const recent = data.slice(-3);
  const average = recent.reduce((sum, item) => sum + item.averageBuildTime, 0) / recent.length;
  const previous = data.slice(-6, -3);
  const previousAverage = previous.length > 0 ? 
    previous.reduce((sum, item) => sum + item.averageBuildTime, 0) / previous.length : average;
  
  if (average < previousAverage * 0.9) return 'trend-up'; // Faster is better
  if (average > previousAverage * 1.1) return 'trend-down'; // Slower is worse
  return 'trend-stable';
}

function getPerformanceText(data) {
  if (data.length < 2) return 'No trend';
  const performanceClass = getPerformanceClass(data);
  
  switch (performanceClass) {
    case 'trend-up':
      return '↗ Faster';
    case 'trend-down':
      return '↘ Slower';
    default:
      return '→ Stable';
  }
}

export default BuildTimeChart;

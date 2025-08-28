import React from 'react';
import { Table, Tag, Button, Tooltip, Space, Progress } from 'antd';
import { 
  EyeOutlined, 
  DownloadOutlined, 
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';

const RecentBuilds = ({ builds, loading = false }) => {
  const navigate = useNavigate();

  const getStatusConfig = (status) => {
    const configs = {
      success: {
        color: 'success',
        icon: <CheckCircleOutlined />,
        text: 'Success'
      },
      failure: {
        color: 'error',
        icon: <CloseCircleOutlined />,
        text: 'Failed'
      },
      running: {
        color: 'processing',
        icon: <SyncOutlined spin />,
        text: 'Running'
      },
      aborted: {
        color: 'warning',
        icon: <PauseCircleOutlined />,
        text: 'Aborted'
      },
      unstable: {
        color: 'warning',
        icon: <ClockCircleOutlined />,
        text: 'Unstable'
      },
      pending: {
        color: 'default',
        icon: <PlayCircleOutlined />,
        text: 'Pending'
      }
    };
    return configs[status] || configs.pending;
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const duration = moment.duration(seconds, 'seconds');
    if (duration.hours() > 0) {
      return `${duration.hours()}h ${duration.minutes()}m ${duration.seconds()}s`;
    } else if (duration.minutes() > 0) {
      return `${duration.minutes()}m ${duration.seconds()}s`;
    } else {
      return `${duration.seconds()}s`;
    }
  };

  const getBranchColor = (branch) => {
    const colors = {
      main: 'blue',
      master: 'blue',
      develop: 'green',
      staging: 'orange',
      production: 'red'
    };
    return colors[branch] || 'default';
  };

  const getTestResultsProgress = (testResults) => {
    if (!testResults || testResults.total === 0) return null;
    
    const successRate = (testResults.passed / testResults.total) * 100;
    let status = 'success';
    if (successRate < 80) status = 'exception';
    else if (successRate < 95) status = 'normal';

    return (
      <Progress
        percent={successRate}
        size="small"
        status={status}
        format={() => `${testResults.passed}/${testResults.total}`}
        style={{ width: 80 }}
      />
    );
  };

  const columns = [
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const config = getStatusConfig(status);
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      }
    },
    {
      title: 'Project',
      dataIndex: 'projectName',
      key: 'projectName',
      width: 150,
      render: (text, record) => (
        <div>
          <div className="project-name">{text}</div>
          <div className="build-number">#{record.buildNumber}</div>
        </div>
      )
    },
    {
      title: 'Branch',
      dataIndex: 'branch',
      key: 'branch',
      width: 120,
      render: (branch) => (
        <Tag color={getBranchColor(branch)}>
          {branch}
        </Tag>
      )
    },
    {
      title: 'Commit',
      dataIndex: 'commit',
      key: 'commit',
      width: 100,
      render: (commit) => (
        <Tooltip title={commit}>
          <code className="commit-hash">
            {commit ? commit.substring(0, 8) : 'N/A'}
          </code>
        </Tooltip>
      )
    },
    {
      title: 'Duration',
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
      render: (duration, record) => {
        if (record.status === 'running') {
          const elapsed = moment().diff(moment(record.startTime), 'seconds');
          return (
            <span className="running-duration">
              {formatDuration(elapsed)}
              <SyncOutlined spin style={{ marginLeft: 4 }} />
            </span>
          );
        }
        return formatDuration(duration);
      }
    },
    {
      title: 'Tests',
      dataIndex: 'testResults',
      key: 'testResults',
      width: 100,
      render: (testResults) => getTestResultsProgress(testResults)
    },
    {
      title: 'Started',
      dataIndex: 'startTime',
      key: 'startTime',
      width: 120,
      render: (startTime) => (
        <Tooltip title={moment(startTime).format('YYYY-MM-DD HH:mm:ss')}>
          {moment(startTime).fromNow()}
        </Tooltip>
      )
    },
    {
      title: 'Triggered By',
      dataIndex: 'triggeredBy',
      key: 'triggeredBy',
      width: 120,
      render: (triggeredBy) => (
        <Tag>{triggeredBy || 'System'}</Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/builds/${record.id}`)}
              size="small"
            />
          </Tooltip>
          {record.logsUrl && (
            <Tooltip title="Download Logs">
              <Button
                type="text"
                icon={<DownloadOutlined />}
                onClick={() => window.open(record.logsUrl, '_blank')}
                size="small"
              />
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  const expandedRowRender = (record) => {
    if (!record.stages || record.stages.length === 0) {
      return <div>No stage information available</div>;
    }

    const stageColumns = [
      {
        title: 'Stage',
        dataIndex: 'name',
        key: 'name'
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        render: (status) => {
          const config = getStatusConfig(status);
          return (
            <Tag color={config.color} icon={config.icon} size="small">
              {config.text}
            </Tag>
          );
        }
      },
      {
        title: 'Duration',
        dataIndex: 'duration',
        key: 'duration',
        render: (duration) => formatDuration(duration)
      },
      {
        title: 'Started',
        dataIndex: 'startTime',
        key: 'startTime',
        render: (startTime) => moment(startTime).format('HH:mm:ss')
      }
    ];

    return (
      <Table
        columns={stageColumns}
        dataSource={record.stages}
        pagination={false}
        size="small"
        rowKey="name"
      />
    );
  };

  return (
    <div className="recent-builds">
      <Table
        columns={columns}
        dataSource={builds}
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} of ${total} builds`
        }}
        expandable={{
          expandedRowRender,
          expandRowByClick: false,
          rowExpandable: (record) => record.stages && record.stages.length > 0
        }}
        rowKey="id"
        size="middle"
        scroll={{ x: 'max-content' }}
        className="builds-table"
      />
      
      <style jsx>{`
        .recent-builds {
          width: 100%;
        }
        
        .project-name {
          font-weight: 600;
          color: #262626;
        }
        
        .build-number {
          font-size: 12px;
          color: #8c8c8c;
        }
        
        .commit-hash {
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 12px;
          background: #f5f5f5;
          padding: 2px 4px;
          border-radius: 3px;
        }
        
        .running-duration {
          color: #1890ff;
          font-weight: 500;
        }
        
        .builds-table .ant-table-tbody > tr:hover > td {
          background-color: #f5f5f5;
        }
        
        .builds-table .ant-table-expanded-row > td {
          background-color: #fafafa;
        }
        
        @media (max-width: 768px) {
          .builds-table {
            font-size: 12px;
          }
          
          .builds-table .ant-table-thead > tr > th,
          .builds-table .ant-table-tbody > tr > td {
            padding: 8px 4px;
          }
        }
      `}</style>
    </div>
  );
};

export default RecentBuilds;

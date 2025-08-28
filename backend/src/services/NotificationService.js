const axios = require('axios');
const nodemailer = require('nodemailer');
const moment = require('moment');
const logger = require('../utils/logger');

class NotificationService {
  constructor() {
    this.emailTransporter = this.createEmailTransporter();
    logger.info('NotificationService initialized');
  }

  /**
   * Create email transporter
   */
  createEmailTransporter() {
    try {
      if (!process.env.SMTP_HOST) {
        logger.warn('SMTP configuration not found, email notifications disabled');
        return null;
      }

      const config = {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      };

      return nodemailer.createTransporter(config);
    } catch (error) {
      logger.error('Error creating email transporter:', error);
      return null;
    }
  }

  /**
   * Send Slack alert notification
   * @param {Object} alert - Alert data
   * @param {Object} config - Slack configuration
   */
  async sendSlackAlert(alert, config) {
    try {
      if (!config.webhookUrl) {
        throw new Error('Slack webhook URL not configured');
      }

      const message = this.buildSlackMessage(alert, config);
      
      const response = await axios.post(config.webhookUrl, message, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (response.status === 200) {
        logger.info(`Slack alert sent successfully for ${alert.projectName}`);
      } else {
        throw new Error(`Slack API returned status ${response.status}`);
      }

    } catch (error) {
      logger.error('Error sending Slack alert:', error);
      throw error;
    }
  }

  /**
   * Build Slack message format
   */
  buildSlackMessage(alert, config) {
    const severityConfig = this.getSeverityConfig(alert.severity);
    const buildUrl = this.getBuildUrl(alert);
    
    const message = {
      channel: config.channel || '#deployments',
      username: config.username || 'CI/CD Monitor',
      icon_emoji: config.iconEmoji || ':warning:',
      attachments: [{
        color: severityConfig.color,
        title: `${severityConfig.emoji} ${alert.ruleName}`,
        title_link: buildUrl,
        text: alert.message,
        fields: [
          {
            title: 'Project',
            value: alert.projectName,
            short: true
          },
          {
            title: 'Build Number',
            value: `#${alert.buildNumber}`,
            short: true
          },
          {
            title: 'Severity',
            value: alert.severity.toUpperCase(),
            short: true
          },
          {
            title: 'Time',
            value: moment(alert.timestamp).format('YYYY-MM-DD HH:mm:ss'),
            short: true
          }
        ],
        actions: this.buildSlackActions(alert, buildUrl),
        footer: 'CI/CD Monitoring System',
        footer_icon: 'https://api.slack.com/img/blocks/bkb_template_images/notificationsWarningIcon.png',
        ts: Math.floor(alert.timestamp.getTime() / 1000)
      }]
    };

    // Add additional fields based on alert metadata
    if (alert.metadata && alert.metadata.buildData) {
      const buildData = alert.metadata.buildData;
      
      if (buildData.branch) {
        message.attachments[0].fields.push({
          title: 'Branch',
          value: buildData.branch,
          short: true
        });
      }

      if (buildData.duration) {
        message.attachments[0].fields.push({
          title: 'Duration',
          value: `${Math.round(buildData.duration / 60)}m ${buildData.duration % 60}s`,
          short: true
        });
      }

      if (buildData.environment) {
        message.attachments[0].fields.push({
          title: 'Environment',
          value: buildData.environment,
          short: true
        });
      }
    }

    return message;
  }

  /**
   * Build Slack action buttons
   */
  buildSlackActions(alert, buildUrl) {
    const actions = [];

    if (buildUrl) {
      actions.push({
        type: 'button',
        text: 'View Build',
        url: buildUrl,
        style: 'primary'
      });
    }

    actions.push({
      type: 'button',
      text: 'View Dashboard',
      url: process.env.FRONTEND_URL || 'http://localhost:3000',
      style: 'default'
    });

    actions.push({
      type: 'button',
      text: 'Acknowledge',
      name: 'acknowledge',
      value: alert._id.toString(),
      style: 'default'
    });

    return actions;
  }

  /**
   * Send email alert notification
   * @param {Object} alert - Alert data
   * @param {Object} config - Email configuration
   */
  async sendEmailAlert(alert, config) {
    try {
      if (!this.emailTransporter) {
        throw new Error('Email transporter not configured');
      }

      const emailContent = this.buildEmailContent(alert, config);
      
      const mailOptions = {
        from: config.from || process.env.SMTP_FROM || 'cicd-monitor@company.com',
        to: config.recipients || config.to,
        cc: config.cc,
        bcc: config.bcc,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html
      };

      const result = await this.emailTransporter.sendMail(mailOptions);
      
      logger.info(`Email alert sent successfully to ${mailOptions.to} for ${alert.projectName}`);
      return result;

    } catch (error) {
      logger.error('Error sending email alert:', error);
      throw error;
    }
  }

  /**
   * Build email content
   */
  buildEmailContent(alert, config) {
    const severityConfig = this.getSeverityConfig(alert.severity);
    const buildUrl = this.getBuildUrl(alert);
    const dashboardUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    const subject = `${severityConfig.emoji} CI/CD Alert: ${alert.ruleName} - ${alert.projectName}`;
    
    // Plain text version
    const text = `
CI/CD MONITORING ALERT

Alert: ${alert.ruleName}
Severity: ${alert.severity.toUpperCase()}
Project: ${alert.projectName}
Build: #${alert.buildNumber}
Time: ${moment(alert.timestamp).format('YYYY-MM-DD HH:mm:ss')}

Message: ${alert.message}

${buildUrl ? `Build URL: ${buildUrl}` : ''}
Dashboard: ${dashboardUrl}

---
This is an automated message from the CI/CD Monitoring System.
    `.trim();

    // HTML version
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>CI/CD Alert</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background-color: ${severityConfig.bgColor}; color: white; padding: 15px; border-radius: 8px 8px 0 0; margin: -20px -20px 20px -20px; }
        .alert-title { font-size: 24px; margin: 0; }
        .alert-meta { font-size: 14px; opacity: 0.9; margin-top: 5px; }
        .details { margin: 20px 0; }
        .detail-row { margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
        .detail-label { font-weight: bold; color: #333; }
        .detail-value { color: #666; }
        .message { background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0; border-left: 4px solid ${severityConfig.bgColor}; }
        .actions { margin: 20px 0; }
        .button { display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; margin-right: 10px; }
        .button:hover { background-color: #0056b3; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="alert-title">${severityConfig.emoji} ${alert.ruleName}</div>
            <div class="alert-meta">${alert.projectName} • Build #${alert.buildNumber}</div>
        </div>
        
        <div class="details">
            <div class="detail-row">
                <span class="detail-label">Severity:</span>
                <span class="detail-value">${alert.severity.toUpperCase()}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Time:</span>
                <span class="detail-value">${moment(alert.timestamp).format('YYYY-MM-DD HH:mm:ss')}</span>
            </div>
            ${alert.metadata && alert.metadata.buildData ? this.buildAdditionalDetails(alert.metadata.buildData) : ''}
        </div>
        
        <div class="message">
            <strong>Alert Message:</strong><br>
            ${alert.message}
        </div>
        
        <div class="actions">
            ${buildUrl ? `<a href="${buildUrl}" class="button">View Build</a>` : ''}
            <a href="${dashboardUrl}" class="button">View Dashboard</a>
        </div>
        
        <div class="footer">
            This is an automated message from the CI/CD Monitoring System.<br>
            Generated at ${moment().format('YYYY-MM-DD HH:mm:ss')}
        </div>
    </div>
</body>
</html>
    `.trim();

    return { subject, text, html };
  }

  /**
   * Build additional details for email
   */
  buildAdditionalDetails(buildData) {
    let details = '';
    
    if (buildData.branch) {
      details += `
        <div class="detail-row">
            <span class="detail-label">Branch:</span>
            <span class="detail-value">${buildData.branch}</span>
        </div>
      `;
    }
    
    if (buildData.duration) {
      details += `
        <div class="detail-row">
            <span class="detail-label">Duration:</span>
            <span class="detail-value">${Math.round(buildData.duration / 60)}m ${buildData.duration % 60}s</span>
        </div>
      `;
    }
    
    if (buildData.environment) {
      details += `
        <div class="detail-row">
            <span class="detail-label">Environment:</span>
            <span class="detail-value">${buildData.environment}</span>
        </div>
      `;
    }
    
    return details;
  }

  /**
   * Send webhook alert notification
   * @param {Object} alert - Alert data
   * @param {Object} config - Webhook configuration
   */
  async sendWebhookAlert(alert, config) {
    try {
      if (!config.url) {
        throw new Error('Webhook URL not configured');
      }

      const payload = {
        alert: {
          id: alert._id,
          ruleName: alert.ruleName,
          severity: alert.severity,
          message: alert.message,
          projectName: alert.projectName,
          buildNumber: alert.buildNumber,
          timestamp: alert.timestamp,
          metadata: alert.metadata
        },
        webhook: {
          version: '1.0',
          source: 'cicd-monitoring-system'
        }
      };

      const requestConfig = {
        method: config.method || 'POST',
        url: config.url,
        data: payload,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'CI/CD-Monitor/1.0',
          ...config.headers
        },
        timeout: config.timeout || 10000
      };

      // Add authentication if configured
      if (config.auth) {
        if (config.auth.type === 'bearer') {
          requestConfig.headers.Authorization = `Bearer ${config.auth.token}`;
        } else if (config.auth.type === 'basic') {
          requestConfig.auth = {
            username: config.auth.username,
            password: config.auth.password
          };
        }
      }

      const response = await axios(requestConfig);
      
      if (response.status >= 200 && response.status < 300) {
        logger.info(`Webhook alert sent successfully to ${config.url} for ${alert.projectName}`);
      } else {
        throw new Error(`Webhook returned status ${response.status}`);
      }

    } catch (error) {
      logger.error('Error sending webhook alert:', error);
      throw error;
    }
  }

  /**
   * Get severity configuration
   */
  getSeverityConfig(severity) {
    const configs = {
      critical: {
        emoji: '🚨',
        color: 'danger',
        bgColor: '#dc3545'
      },
      warning: {
        emoji: '⚠️',
        color: 'warning',
        bgColor: '#ffc107'
      },
      info: {
        emoji: 'ℹ️',
        color: 'good',
        bgColor: '#17a2b8'
      }
    };
    
    return configs[severity] || configs.warning;
  }

  /**
   * Get build URL
   */
  getBuildUrl(alert) {
    // This could be configured based on your CI/CD system
    const baseUrl = process.env.JENKINS_BASE_URL || process.env.CI_BASE_URL;
    
    if (baseUrl && alert.projectName && alert.buildNumber) {
      return `${baseUrl}/job/${alert.projectName}/${alert.buildNumber}/`;
    }
    
    return null;
  }

  /**
   * Send build summary report
   * @param {Object} summaryData - Build summary data
   * @param {Object} recipients - Email recipients
   */
  async sendBuildSummaryReport(summaryData, recipients) {
    try {
      if (!this.emailTransporter) {
        throw new Error('Email transporter not configured');
      }

      const emailContent = this.buildSummaryReportContent(summaryData);
      
      const mailOptions = {
        from: process.env.SMTP_FROM || 'cicd-monitor@company.com',
        to: recipients.to,
        cc: recipients.cc,
        subject: emailContent.subject,
        html: emailContent.html
      };

      const result = await this.emailTransporter.sendMail(mailOptions);
      
      logger.info(`Build summary report sent successfully to ${mailOptions.to}`);
      return result;

    } catch (error) {
      logger.error('Error sending build summary report:', error);
      throw error;
    }
  }

  /**
   * Build summary report content
   */
  buildSummaryReportContent(summaryData) {
    const {
      period,
      totalBuilds,
      successRate,
      averageBuildTime,
      topProjects,
      recentFailures
    } = summaryData;

    const subject = `CI/CD ${period} Report - ${moment().format('YYYY-MM-DD')}`;
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>CI/CD Summary Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .title { font-size: 28px; color: #333; margin-bottom: 10px; }
        .subtitle { font-size: 16px; color: #666; }
        .metrics { display: flex; justify-content: space-around; margin: 30px 0; }
        .metric { text-align: center; }
        .metric-value { font-size: 36px; font-weight: bold; color: #007bff; }
        .metric-label { font-size: 14px; color: #666; margin-top: 5px; }
        .section { margin: 30px 0; }
        .section-title { font-size: 20px; color: #333; margin-bottom: 15px; border-bottom: 2px solid #007bff; padding-bottom: 5px; }
        .table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .table th { background-color: #f8f9fa; font-weight: bold; }
        .status-success { color: #28a745; }
        .status-failure { color: #dc3545; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #999; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="title">📊 CI/CD ${period} Report</div>
            <div class="subtitle">${moment().format('MMMM DD, YYYY')}</div>
        </div>
        
        <div class="metrics">
            <div class="metric">
                <div class="metric-value">${totalBuilds}</div>
                <div class="metric-label">Total Builds</div>
            </div>
            <div class="metric">
                <div class="metric-value">${successRate.toFixed(1)}%</div>
                <div class="metric-label">Success Rate</div>
            </div>
            <div class="metric">
                <div class="metric-value">${Math.round(averageBuildTime)}m</div>
                <div class="metric-label">Avg Build Time</div>
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">Top Active Projects</div>
            <table class="table">
                <thead>
                    <tr>
                        <th>Project</th>
                        <th>Builds</th>
                        <th>Success Rate</th>
                        <th>Avg Duration</th>
                    </tr>
                </thead>
                <tbody>
                    ${topProjects.map(project => `
                        <tr>
                            <td>${project.name}</td>
                            <td>${project.totalBuilds}</td>
                            <td class="${project.successRate >= 95 ? 'status-success' : 'status-failure'}">${project.successRate.toFixed(1)}%</td>
                            <td>${Math.round(project.averageDuration / 60)}m</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        ${recentFailures.length > 0 ? `
        <div class="section">
            <div class="section-title">Recent Failures</div>
            <table class="table">
                <thead>
                    <tr>
                        <th>Project</th>
                        <th>Build</th>
                        <th>Branch</th>
                        <th>Time</th>
                    </tr>
                </thead>
                <tbody>
                    ${recentFailures.map(failure => `
                        <tr>
                            <td>${failure.projectName}</td>
                            <td>#${failure.buildNumber}</td>
                            <td>${failure.branch}</td>
                            <td>${moment(failure.endTime).format('MM/DD HH:mm')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}
        
        <div class="footer">
            Generated by CI/CD Monitoring System at ${moment().format('YYYY-MM-DD HH:mm:ss')}
        </div>
    </div>
</body>
</html>
    `;

    return { subject, html };
  }

  /**
   * Test notification configuration
   */
  async testNotification(type, config) {
    try {
      const testAlert = {
        _id: 'test-alert-id',
        ruleName: 'Test Alert Rule',
        severity: 'warning',
        message: 'This is a test alert to verify notification configuration.',
        projectName: 'test-project',
        buildNumber: 123,
        timestamp: new Date(),
        metadata: {
          buildData: {
            branch: 'main',
            duration: 300,
            environment: 'staging'
          }
        }
      };

      switch (type) {
        case 'slack':
          await this.sendSlackAlert(testAlert, config);
          break;
        case 'email':
          await this.sendEmailAlert(testAlert, config);
          break;
        case 'webhook':
          await this.sendWebhookAlert(testAlert, config);
          break;
        default:
          throw new Error(`Unknown notification type: ${type}`);
      }

      return { success: true, message: 'Test notification sent successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

module.exports = NotificationService;

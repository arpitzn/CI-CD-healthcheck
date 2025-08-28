const EventEmitter = require('events');
const moment = require('moment');
const _ = require('lodash');

const Alert = require('../models/Alert');
const AlertRule = require('../models/AlertRule');
const Build = require('../models/Build');
const logger = require('../utils/logger');

class AlertEngine extends EventEmitter {
  constructor({ notificationService, socketIo }) {
    super();
    this.notificationService = notificationService;
    this.socketIo = socketIo;
    this.rules = new Map();
    this.alertCooldowns = new Map();
    
    this.loadAlertRules();
    logger.info('AlertEngine initialized');
  }

  /**
   * Load alert rules from database
   */
  async loadAlertRules() {
    try {
      const rules = await AlertRule.find({ enabled: true });
      this.rules.clear();
      
      rules.forEach(rule => {
        this.rules.set(rule._id.toString(), rule);
      });
      
      logger.info(`Loaded ${rules.length} alert rules`);
    } catch (error) {
      logger.error('Error loading alert rules:', error);
    }
  }

  /**
   * Evaluate all rules against build data
   * @param {Object} buildData - Build data to evaluate
   */
  async evaluateRules(buildData) {
    try {
      logger.debug(`Evaluating alert rules for ${buildData.projectName}#${buildData.buildNumber}`);
      
      for (const [ruleId, rule] of this.rules) {
        try {
          const matches = await this.evaluateRule(rule, buildData);
          if (matches) {
            await this.triggerAlert(rule, buildData);
          }
        } catch (error) {
          logger.error(`Error evaluating rule ${rule.name}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error in rule evaluation:', error);
    }
  }

  /**
   * Evaluate a single rule against build data
   * @param {Object} rule - Alert rule to evaluate
   * @param {Object} buildData - Build data to check
   */
  async evaluateRule(rule, buildData) {
    const { condition } = rule;
    
    switch (condition.type) {
      case 'build_failure':
        return this.evaluateBuildFailure(condition, buildData);
      
      case 'duration_threshold':
        return this.evaluateDurationThreshold(condition, buildData);
      
      case 'error_rate':
        return await this.evaluateErrorRate(condition, buildData);
      
      case 'consecutive_failures':
        return await this.evaluateConsecutiveFailures(condition, buildData);
      
      case 'test_failure_rate':
        return this.evaluateTestFailureRate(condition, buildData);
      
      case 'deployment_failure':
        return this.evaluateDeploymentFailure(condition, buildData);
      
      default:
        logger.warn(`Unknown rule condition type: ${condition.type}`);
        return false;
    }
  }

  /**
   * Evaluate build failure condition
   */
  evaluateBuildFailure(condition, buildData) {
    const targetProjects = condition.parameters.projects || [];
    const targetBranches = condition.parameters.branches || [];
    const targetEnvironments = condition.parameters.environments || [];
    
    // Check if build failed
    if (buildData.status !== 'failure') {
      return false;
    }
    
    // Check project filter
    if (targetProjects.length > 0 && !targetProjects.includes(buildData.projectName)) {
      return false;
    }
    
    // Check branch filter
    if (targetBranches.length > 0 && !targetBranches.includes(buildData.branch)) {
      return false;
    }
    
    // Check environment filter
    if (targetEnvironments.length > 0 && !targetEnvironments.includes(buildData.environment)) {
      return false;
    }
    
    return true;
  }

  /**
   * Evaluate duration threshold condition
   */
  evaluateDurationThreshold(condition, buildData) {
    const thresholdMinutes = condition.parameters.thresholdMinutes || 30;
    const buildDurationMinutes = buildData.duration / 60;
    
    return buildDurationMinutes > thresholdMinutes;
  }

  /**
   * Evaluate error rate condition
   */
  async evaluateErrorRate(condition, buildData) {
    const {
      timeWindowMinutes = 60,
      errorRateThreshold = 50,
      minimumBuilds = 3
    } = condition.parameters;
    
    const timeWindow = moment().subtract(timeWindowMinutes, 'minutes').toDate();
    
    const recentBuilds = await Build.find({
      projectName: buildData.projectName,
      endTime: { $gte: timeWindow }
    });
    
    if (recentBuilds.length < minimumBuilds) {
      return false;
    }
    
    const failedBuilds = recentBuilds.filter(build => build.status === 'failure');
    const errorRate = (failedBuilds.length / recentBuilds.length) * 100;
    
    return errorRate >= errorRateThreshold;
  }

  /**
   * Evaluate consecutive failures condition
   */
  async evaluateConsecutiveFailures(condition, buildData) {
    const { consecutiveCount = 3 } = condition.parameters;
    
    if (buildData.status !== 'failure') {
      return false;
    }
    
    const recentBuilds = await Build.find({
      projectName: buildData.projectName,
      branch: buildData.branch
    }).sort({ buildNumber: -1 }).limit(consecutiveCount);
    
    if (recentBuilds.length < consecutiveCount) {
      return false;
    }
    
    return recentBuilds.every(build => build.status === 'failure');
  }

  /**
   * Evaluate test failure rate condition
   */
  evaluateTestFailureRate(condition, buildData) {
    const { failureRateThreshold = 10 } = condition.parameters;
    
    if (!buildData.testResults || buildData.testResults.total === 0) {
      return false;
    }
    
    const failureRate = (buildData.testResults.failed / buildData.testResults.total) * 100;
    return failureRate >= failureRateThreshold;
  }

  /**
   * Evaluate deployment failure condition
   */
  evaluateDeploymentFailure(condition, buildData) {
    const targetEnvironments = condition.parameters.environments || ['production', 'staging'];
    
    return buildData.status === 'failure' && 
           targetEnvironments.includes(buildData.environment);
  }

  /**
   * Trigger an alert
   * @param {Object} rule - Alert rule that triggered
   * @param {Object} buildData - Build data that triggered the alert
   */
  async triggerAlert(rule, buildData) {
    try {
      // Check cooldown period
      const cooldownKey = `${rule._id}-${buildData.projectName}`;
      const lastAlert = this.alertCooldowns.get(cooldownKey);
      const cooldownMinutes = rule.cooldownMinutes || 15;
      
      if (lastAlert && moment().diff(lastAlert, 'minutes') < cooldownMinutes) {
        logger.debug(`Alert ${rule.name} is in cooldown period`);
        return;
      }
      
      // Create alert record
      const alert = await this.createAlert(rule, buildData);
      
      // Send notifications
      await this.sendNotifications(alert, rule);
      
      // Emit real-time update
      this.socketIo.emit('alert.triggered', {
        id: alert._id,
        ruleName: rule.name,
        severity: rule.severity,
        projectName: buildData.projectName,
        buildId: buildData._id,
        timestamp: alert.timestamp
      });
      
      // Set cooldown
      this.alertCooldowns.set(cooldownKey, moment());
      
      logger.info(`Alert triggered: ${rule.name} for ${buildData.projectName}#${buildData.buildNumber}`);
      
    } catch (error) {
      logger.error('Error triggering alert:', error);
    }
  }

  /**
   * Create alert record in database
   */
  async createAlert(rule, buildData) {
    const alert = new Alert({
      ruleId: rule._id,
      ruleName: rule.name,
      severity: rule.severity,
      message: this.formatMessage(rule.messageTemplate, buildData),
      projectName: buildData.projectName,
      buildId: buildData._id,
      buildNumber: buildData.buildNumber,
      status: 'active',
      timestamp: new Date(),
      metadata: {
        condition: rule.condition,
        buildData: {
          status: buildData.status,
          duration: buildData.duration,
          branch: buildData.branch,
          environment: buildData.environment
        }
      }
    });
    
    await alert.save();
    return alert;
  }

  /**
   * Format alert message using template
   */
  formatMessage(template, buildData) {
    if (!template) {
      return `Build ${buildData.projectName}#${buildData.buildNumber} failed`;
    }
    
    return template
      .replace(/\{projectName\}/g, buildData.projectName)
      .replace(/\{buildNumber\}/g, buildData.buildNumber)
      .replace(/\{status\}/g, buildData.status)
      .replace(/\{branch\}/g, buildData.branch)
      .replace(/\{duration\}/g, `${Math.round(buildData.duration / 60)}m`)
      .replace(/\{environment\}/g, buildData.environment)
      .replace(/\{triggeredBy\}/g, buildData.triggeredBy);
  }

  /**
   * Send notifications for alert
   */
  async sendNotifications(alert, rule) {
    for (const channel of rule.channels) {
      try {
        switch (channel.type) {
          case 'slack':
            await this.notificationService.sendSlackAlert(alert, channel.configuration);
            break;
          
          case 'email':
            await this.notificationService.sendEmailAlert(alert, channel.configuration);
            break;
          
          case 'webhook':
            await this.notificationService.sendWebhookAlert(alert, channel.configuration);
            break;
          
          default:
            logger.warn(`Unknown notification channel type: ${channel.type}`);
        }
      } catch (error) {
        logger.error(`Error sending ${channel.type} notification:`, error);
      }
    }
  }

  /**
   * Create a new alert rule
   */
  async createAlertRule(ruleData) {
    try {
      const rule = new AlertRule(ruleData);
      await rule.save();
      
      // Add to active rules
      this.rules.set(rule._id.toString(), rule);
      
      logger.info(`Created new alert rule: ${rule.name}`);
      return rule;
    } catch (error) {
      logger.error('Error creating alert rule:', error);
      throw error;
    }
  }

  /**
   * Update an alert rule
   */
  async updateAlertRule(ruleId, updateData) {
    try {
      const rule = await AlertRule.findByIdAndUpdate(
        ruleId, 
        updateData, 
        { new: true }
      );
      
      if (rule) {
        if (rule.enabled) {
          this.rules.set(ruleId, rule);
        } else {
          this.rules.delete(ruleId);
        }
        
        logger.info(`Updated alert rule: ${rule.name}`);
      }
      
      return rule;
    } catch (error) {
      logger.error('Error updating alert rule:', error);
      throw error;
    }
  }

  /**
   * Delete an alert rule
   */
  async deleteAlertRule(ruleId) {
    try {
      await AlertRule.findByIdAndDelete(ruleId);
      this.rules.delete(ruleId);
      
      logger.info(`Deleted alert rule: ${ruleId}`);
    } catch (error) {
      logger.error('Error deleting alert rule:', error);
      throw error;
    }
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(filters = {}) {
    try {
      const query = { status: 'active', ...filters };
      const alerts = await Alert.find(query)
        .sort({ timestamp: -1 })
        .populate('ruleId');
      
      return alerts;
    } catch (error) {
      logger.error('Error getting active alerts:', error);
      throw error;
    }
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId, acknowledgedBy) {
    try {
      const alert = await Alert.findByIdAndUpdate(
        alertId,
        {
          status: 'acknowledged',
          acknowledgedBy,
          acknowledgedAt: new Date()
        },
        { new: true }
      );
      
      if (alert) {
        this.socketIo.emit('alert.acknowledged', {
          id: alert._id,
          acknowledgedBy
        });
        
        logger.info(`Alert acknowledged: ${alertId} by ${acknowledgedBy}`);
      }
      
      return alert;
    } catch (error) {
      logger.error('Error acknowledging alert:', error);
      throw error;
    }
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId, resolvedBy, resolution) {
    try {
      const alert = await Alert.findByIdAndUpdate(
        alertId,
        {
          status: 'resolved',
          resolvedBy,
          resolvedAt: new Date(),
          resolution
        },
        { new: true }
      );
      
      if (alert) {
        this.socketIo.emit('alert.resolved', {
          id: alert._id,
          resolvedBy,
          resolution
        });
        
        logger.info(`Alert resolved: ${alertId} by ${resolvedBy}`);
      }
      
      return alert;
    } catch (error) {
      logger.error('Error resolving alert:', error);
      throw error;
    }
  }

  /**
   * Get alert statistics
   */
  async getAlertStatistics(timeRange = '24h') {
    try {
      const startTime = this.getStartTimeForPeriod(timeRange);
      
      const pipeline = [
        {
          $match: {
            timestamp: { $gte: startTime }
          }
        },
        {
          $group: {
            _id: null,
            totalAlerts: { $sum: 1 },
            criticalAlerts: {
              $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] }
            },
            warningAlerts: {
              $sum: { $cond: [{ $eq: ['$severity', 'warning'] }, 1, 0] }
            },
            activeAlerts: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
            },
            acknowledgedAlerts: {
              $sum: { $cond: [{ $eq: ['$status', 'acknowledged'] }, 1, 0] }
            },
            resolvedAlerts: {
              $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
            }
          }
        }
      ];
      
      const result = await Alert.aggregate(pipeline);
      return result[0] || {
        totalAlerts: 0,
        criticalAlerts: 0,
        warningAlerts: 0,
        activeAlerts: 0,
        acknowledgedAlerts: 0,
        resolvedAlerts: 0
      };
    } catch (error) {
      logger.error('Error getting alert statistics:', error);
      throw error;
    }
  }

  /**
   * Get start time for period
   */
  getStartTimeForPeriod(period) {
    switch (period) {
      case '1h':
        return moment().subtract(1, 'hours').toDate();
      case '24h':
        return moment().subtract(24, 'hours').toDate();
      case '7d':
        return moment().subtract(7, 'days').toDate();
      case '30d':
        return moment().subtract(30, 'days').toDate();
      default:
        return moment().subtract(24, 'hours').toDate();
    }
  }
}

module.exports = AlertEngine;

const EventEmitter = require('events');
const moment = require('moment');
const _ = require('lodash');

const Build = require('../models/Build');
const Metric = require('../models/Metric');
const Project = require('../models/Project');
const logger = require('../utils/logger');
const { calculateMetrics, aggregateMetrics } = require('../utils/metricsCalculator');

class MetricsCollector extends EventEmitter {
  constructor({ socketIo, notificationService }) {
    super();
    this.socketIo = socketIo;
    this.notificationService = notificationService;
    this.processingQueue = [];
    this.isProcessing = false;
    
    logger.info('MetricsCollector initialized');
  }

  /**
   * Process build data from webhooks
   * @param {Object} buildData - Raw build data from CI/CD system
   * @param {string} source - Source system (jenkins, github, gitlab, etc.)
   */
  async processBuildData(buildData, source = 'jenkins') {
    try {
      logger.info(`Processing build data from ${source}:`, {
        buildId: buildData.buildId,
        projectName: buildData.projectName,
        status: buildData.status
      });

      // Validate and normalize build data
      const normalizedData = this.normalizeBuildData(buildData, source);
      
      // Save build to database
      const build = await this.saveBuild(normalizedData);
      
      // Update project information
      await this.updateProject(build);
      
      // Calculate and save metrics
      await this.calculateAndSaveMetrics(build);
      
      // Emit real-time updates
      this.emitRealtimeUpdates(build);
      
      // Emit event for alert processing
      this.emit('build.processed', build);
      
      logger.info(`Build processing completed for ${build.projectName}#${build.buildNumber}`);
      
      return build;
    } catch (error) {
      logger.error('Error processing build data:', error);
      throw error;
    }
  }

  /**
   * Normalize build data from different sources
   */
  normalizeBuildData(buildData, source) {
    const normalized = {
      buildId: buildData.buildId || buildData.id,
      projectName: buildData.projectName || buildData.job_name,
      repositoryUrl: buildData.repositoryUrl || buildData.repository_url,
      branch: buildData.branch || buildData.git_branch || 'main',
      commit: buildData.commit || buildData.git_commit,
      status: this.normalizeStatus(buildData.status),
      duration: parseInt(buildData.duration) || 0,
      startTime: buildData.startTime ? new Date(buildData.startTime) : new Date(),
      endTime: buildData.endTime ? new Date(buildData.endTime) : new Date(),
      buildNumber: parseInt(buildData.buildNumber) || parseInt(buildData.build_number) || 1,
      triggeredBy: buildData.triggeredBy || buildData.triggered_by || 'system',
      environment: buildData.environment || 'development',
      testResults: this.normalizeTestResults(buildData.testResults),
      stages: this.normalizeStages(buildData.stages),
      logs: buildData.logs || buildData.build_log,
      artifacts: buildData.artifacts || [],
      metadata: {
        source,
        originalData: buildData,
        processedAt: new Date()
      }
    };

    // Calculate end time if not provided
    if (!buildData.endTime && normalized.startTime && normalized.duration) {
      normalized.endTime = moment(normalized.startTime).add(normalized.duration, 'seconds').toDate();
    }

    return normalized;
  }

  /**
   * Normalize status values from different CI/CD systems
   */
  normalizeStatus(status) {
    if (!status) return 'unknown';
    
    const statusMap = {
      'SUCCESS': 'success',
      'PASSED': 'success',
      'COMPLETED': 'success',
      'FAILURE': 'failure',
      'FAILED': 'failure',
      'ERROR': 'failure',
      'ABORTED': 'aborted',
      'CANCELLED': 'aborted',
      'UNSTABLE': 'unstable',
      'RUNNING': 'running',
      'IN_PROGRESS': 'running',
      'PENDING': 'pending',
      'QUEUED': 'pending'
    };

    return statusMap[status.toUpperCase()] || status.toLowerCase();
  }

  /**
   * Normalize test results
   */
  normalizeTestResults(testResults) {
    if (!testResults) {
      return {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0
      };
    }

    return {
      total: parseInt(testResults.total) || 0,
      passed: parseInt(testResults.passed) || parseInt(testResults.success) || 0,
      failed: parseInt(testResults.failed) || parseInt(testResults.failure) || 0,
      skipped: parseInt(testResults.skipped) || parseInt(testResults.skip) || 0
    };
  }

  /**
   * Normalize stage data
   */
  normalizeStages(stages) {
    if (!Array.isArray(stages)) return [];

    return stages.map(stage => ({
      name: stage.name,
      status: this.normalizeStatus(stage.status),
      duration: parseInt(stage.duration) || 0,
      startTime: stage.startTime ? new Date(stage.startTime) : null,
      endTime: stage.endTime ? new Date(stage.endTime) : null,
      logs: stage.logs || null
    }));
  }

  /**
   * Save build to database
   */
  async saveBuild(buildData) {
    try {
      // Check if build already exists
      const existingBuild = await Build.findOne({
        buildId: buildData.buildId,
        projectName: buildData.projectName
      });

      if (existingBuild) {
        // Update existing build
        Object.assign(existingBuild, buildData);
        await existingBuild.save();
        return existingBuild;
      } else {
        // Create new build
        const build = new Build(buildData);
        await build.save();
        return build;
      }
    } catch (error) {
      logger.error('Error saving build:', error);
      throw error;
    }
  }

  /**
   * Update project information
   */
  async updateProject(build) {
    try {
      const projectData = {
        name: build.projectName,
        repositoryUrl: build.repositoryUrl,
        lastBuildId: build._id,
        lastBuildStatus: build.status,
        lastBuildTime: build.endTime,
        updatedAt: new Date()
      };

      await Project.findOneAndUpdate(
        { name: build.projectName },
        projectData,
        { upsert: true, new: true }
      );

      logger.debug(`Project ${build.projectName} updated`);
    } catch (error) {
      logger.error('Error updating project:', error);
      throw error;
    }
  }

  /**
   * Calculate and save metrics
   */
  async calculateAndSaveMetrics(build) {
    try {
      // Calculate various time periods
      const timePeriods = ['1h', '24h', '7d', '30d'];
      
      for (const period of timePeriods) {
        await this.calculateMetricsForPeriod(build, period);
      }

      logger.debug(`Metrics calculated for ${build.projectName}`);
    } catch (error) {
      logger.error('Error calculating metrics:', error);
      throw error;
    }
  }

  /**
   * Calculate metrics for a specific time period
   */
  async calculateMetricsForPeriod(build, period) {
    const startTime = this.getStartTimeForPeriod(period);
    
    // Get builds for the period
    const builds = await Build.find({
      projectName: build.projectName,
      endTime: { $gte: startTime }
    }).sort({ endTime: -1 });

    if (builds.length === 0) return;

    // Calculate metrics
    const metrics = calculateMetrics(builds);
    
    // Save aggregated metrics
    const metricData = {
      projectName: build.projectName,
      period,
      timestamp: new Date(),
      ...metrics,
      buildIds: builds.map(b => b._id)
    };

    await Metric.findOneAndUpdate(
      { 
        projectName: build.projectName,
        period,
        timestamp: {
          $gte: moment().startOf('hour').toDate(),
          $lt: moment().endOf('hour').toDate()
        }
      },
      metricData,
      { upsert: true, new: true }
    );
  }

  /**
   * Get start time for period calculation
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

  /**
   * Emit real-time updates via WebSocket
   */
  emitRealtimeUpdates(build) {
    try {
      // Emit to all clients
      this.socketIo.emit('build.completed', {
        id: build._id,
        projectName: build.projectName,
        status: build.status,
        buildNumber: build.buildNumber,
        branch: build.branch,
        duration: build.duration,
        timestamp: build.endTime
      });

      // Emit to project-specific room
      this.socketIo.to(`project-${build.projectName}`).emit('project.build.update', {
        projectName: build.projectName,
        build: {
          id: build._id,
          status: build.status,
          buildNumber: build.buildNumber,
          duration: build.duration
        }
      });

      logger.debug(`Real-time updates emitted for ${build.projectName}#${build.buildNumber}`);
    } catch (error) {
      logger.error('Error emitting real-time updates:', error);
    }
  }

  /**
   * Get dashboard metrics for specified time range and project
   */
  async getDashboardMetrics(options = {}) {
    try {
      const {
        timeRange = '24h',
        project = 'all',
        startDate,
        endDate
      } = options;

      let query = {};
      
      // Set time range
      if (startDate && endDate) {
        query.endTime = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      } else {
        query.endTime = {
          $gte: this.getStartTimeForPeriod(timeRange)
        };
      }

      // Set project filter
      if (project !== 'all') {
        query.projectName = project;
      }

      // Get builds
      const builds = await Build.find(query).sort({ endTime: -1 });
      
      // Calculate overall metrics
      const overallMetrics = calculateMetrics(builds);
      
      // Get trend data
      const trendData = await this.getTrendData(query, timeRange);
      
      // Get project status
      const projectStatus = await this.getProjectStatus(project);

      return {
        ...overallMetrics,
        successRateTrend: trendData.successRate,
        buildTimeTrend: trendData.buildTime,
        deploymentFrequency: trendData.deploymentFrequency,
        projectStatus,
        lastUpdated: new Date()
      };
    } catch (error) {
      logger.error('Error getting dashboard metrics:', error);
      throw error;
    }
  }

  /**
   * Get trend data for charts
   */
  async getTrendData(baseQuery, timeRange) {
    const intervals = this.getIntervalsForPeriod(timeRange);
    const trendData = {
      successRate: [],
      buildTime: [],
      deploymentFrequency: []
    };

    for (const interval of intervals) {
      const query = {
        ...baseQuery,
        endTime: {
          $gte: interval.start,
          $lt: interval.end
        }
      };

      const builds = await Build.find(query);
      const metrics = calculateMetrics(builds);

      trendData.successRate.push({
        timestamp: interval.start,
        successRate: metrics.successRate,
        totalBuilds: metrics.totalBuilds,
        successfulBuilds: metrics.successfulBuilds,
        failedBuilds: metrics.failedBuilds
      });

      trendData.buildTime.push({
        timestamp: interval.start,
        averageBuildTime: metrics.averageBuildTime,
        maxBuildTime: metrics.maxBuildTime,
        minBuildTime: metrics.minBuildTime,
        buildCount: builds.length
      });

      const deployments = builds.filter(b => 
        b.environment === 'production' || b.environment === 'staging'
      );
      
      trendData.deploymentFrequency.push({
        timestamp: interval.start,
        deployments: deployments.length,
        production: deployments.filter(d => d.environment === 'production').length,
        staging: deployments.filter(d => d.environment === 'staging').length
      });
    }

    return trendData;
  }

  /**
   * Get intervals for trend calculation
   */
  getIntervalsForPeriod(timeRange) {
    const intervals = [];
    let interval, count;

    switch (timeRange) {
      case '1h':
        interval = 5; // 5 minute intervals
        count = 12;
        break;
      case '24h':
        interval = 60; // 1 hour intervals
        count = 24;
        break;
      case '7d':
        interval = 1440; // 1 day intervals
        count = 7;
        break;
      case '30d':
        interval = 1440; // 1 day intervals
        count = 30;
        break;
      default:
        interval = 60;
        count = 24;
    }

    for (let i = count - 1; i >= 0; i--) {
      const end = moment().subtract(i * interval, 'minutes');
      const start = moment(end).subtract(interval, 'minutes');
      
      intervals.push({
        start: start.toDate(),
        end: end.toDate()
      });
    }

    return intervals;
  }

  /**
   * Get project status information
   */
  async getProjectStatus(projectFilter) {
    const query = projectFilter !== 'all' ? { name: projectFilter } : {};
    const projects = await Project.find(query);
    
    const projectStatus = await Promise.all(projects.map(async (project) => {
      const recentBuilds = await Build.find({
        projectName: project.name
      }).sort({ endTime: -1 }).limit(10);

      const metrics = calculateMetrics(recentBuilds);

      return {
        name: project.name,
        displayName: project.displayName || project.name,
        lastBuildStatus: project.lastBuildStatus,
        lastBuildTime: project.lastBuildTime,
        ...metrics
      };
    }));

    return projectStatus;
  }

  /**
   * Get recent builds
   */
  async getRecentBuilds(options = {}) {
    const {
      project = 'all',
      limit = 20,
      offset = 0
    } = options;

    const query = project !== 'all' ? { projectName: project } : {};
    
    const builds = await Build.find(query)
      .sort({ endTime: -1 })
      .limit(limit)
      .skip(offset)
      .lean();

    return builds;
  }
}

module.exports = MetricsCollector;

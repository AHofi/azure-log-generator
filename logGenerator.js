const appInsights = require('applicationinsights');
const { v4: uuidv4 } = require('uuid');

class LogGenerator {
  constructor() {
    this.activeJobs = new Map();
    this.continuousJob = null;
    this.statistics = {
      totalLogsGenerated: 0,
      totalMetricsGenerated: 0,
      totalEventsGenerated: 0,
      totalBytesGenerated: 0,
      startTime: new Date()
    };
  }

  // Generate random string of specified size
  generateMessage(size) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ';
    let message = '';
    for (let i = 0; i < size; i++) {
      message += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return message;
  }

  // Log a message at specified level
  logMessage(level, message, properties = {}) {
    const client = appInsights.defaultClient;
    
    const enhancedProperties = {
      ...properties,
      generatorId: 'azure-log-generator',
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId || uuidv4(),
      messageSize: message.length
    };

    switch (level) {
      case 'trace':
        client.trackTrace({
          message,
          severity: appInsights.Contracts.SeverityLevel.Verbose,
          properties: enhancedProperties
        });
        break;
      case 'info':
        client.trackTrace({
          message,
          severity: appInsights.Contracts.SeverityLevel.Information,
          properties: enhancedProperties
        });
        break;
      case 'warning':
        client.trackTrace({
          message,
          severity: appInsights.Contracts.SeverityLevel.Warning,
          properties: enhancedProperties
        });
        break;
      case 'error':
        client.trackException({
          exception: new Error(message),
          properties: enhancedProperties
        });
        break;
      case 'critical':
        client.trackException({
          exception: new Error(`CRITICAL: ${message}`),
          severity: appInsights.Contracts.SeverityLevel.Critical,
          properties: enhancedProperties
        });
        break;
    }

    this.statistics.totalLogsGenerated++;
    this.statistics.totalBytesGenerated += message.length;
  }

  // Generate custom metric
  generateMetric(name, value, properties = {}) {
    const client = appInsights.defaultClient;
    client.trackMetric({
      name: name || `custom_metric_${Math.floor(Math.random() * 100)}`,
      value: value || Math.random() * 1000,
      properties: {
        ...properties,
        generatorId: 'azure-log-generator',
        timestamp: new Date().toISOString()
      }
    });
    this.statistics.totalMetricsGenerated++;
  }

  // Generate custom event
  generateEvent(name, properties = {}) {
    const client = appInsights.defaultClient;
    client.trackEvent({
      name: name || `custom_event_${Math.floor(Math.random() * 50)}`,
      properties: {
        ...properties,
        generatorId: 'azure-log-generator',
        timestamp: new Date().toISOString(),
        randomValue: Math.random().toString()
      }
    });
    this.statistics.totalEventsGenerated++;
  }

  // Main log generation function
  async generateLogs(options) {
    const {
      jobId,
      count,
      interval,
      level,
      messageSize,
      includeMetrics,
      includeEvents
    } = options;

    const job = {
      id: jobId,
      status: 'running',
      startTime: new Date(),
      parameters: options,
      logsGenerated: 0,
      metricsGenerated: 0,
      eventsGenerated: 0
    };

    this.activeJobs.set(jobId, job);

    // Generate logs asynchronously
    setImmediate(() => {
      this._generateLogsAsync(job);
    });

    return job;
  }

  async _generateLogsAsync(job) {
    const { count, interval, level, messageSize, includeMetrics, includeEvents } = job.parameters;

    for (let i = 0; i < count; i++) {
      if (job.status === 'cancelled') break;

      // Generate log message
      const message = this.generateMessage(messageSize);
      this.logMessage(level, message, { jobId: job.id, index: i });
      job.logsGenerated++;

      // Generate metric if enabled
      if (includeMetrics && Math.random() < 0.3) {
        this.generateMetric(`job_${job.id}_metric`, Math.random() * 1000, { jobId: job.id });
        job.metricsGenerated++;
      }

      // Generate event if enabled
      if (includeEvents && Math.random() < 0.2) {
        this.generateEvent(`job_${job.id}_event`, { jobId: job.id, index: i });
        job.eventsGenerated++;
      }

      // Wait for interval
      if (interval > 0 && i < count - 1) {
        await this.sleep(interval);
      }

      // Flush every 100 logs to ensure they're sent
      if (i % 100 === 0) {
        appInsights.defaultClient.flush();
      }
    }

    job.status = 'completed';
    job.endTime = new Date();
    job.duration = job.endTime - job.startTime;

    // Final flush
    appInsights.defaultClient.flush();
  }

  // Burst log generation
  async burstLogs(options) {
    const { jobId, duration, threadsCount } = options;

    const job = {
      id: jobId,
      status: 'running',
      startTime: new Date(),
      parameters: options,
      logsGenerated: 0,
      threads: []
    };

    this.activeJobs.set(jobId, job);

    // Start multiple threads
    for (let i = 0; i < threadsCount; i++) {
      const thread = this._burstThread(job, i);
      job.threads.push(thread);
    }

    // Stop after duration
    setTimeout(() => {
      job.status = 'stopping';
    }, duration);

    return job;
  }

  async _burstThread(job, threadId) {
    while (job.status === 'running') {
      const message = this.generateMessage(1024);
      this.logMessage('info', message, { 
        jobId: job.id, 
        threadId, 
        burst: true 
      });
      job.logsGenerated++;

      // Generate metrics and events at high rate
      if (Math.random() < 0.5) {
        this.generateMetric(`burst_metric_${threadId}`, Math.random() * 1000, { 
          jobId: job.id,
          threadId 
        });
      }

      if (Math.random() < 0.3) {
        this.generateEvent(`burst_event_${threadId}`, { 
          jobId: job.id,
          threadId 
        });
      }

      // Minimal delay to prevent blocking
      if (job.logsGenerated % 1000 === 0) {
        await this.sleep(1);
        appInsights.defaultClient.flush();
      }
    }
  }

  // Continuous log generation
  async startContinuousLogs(options) {
    if (this.continuousJob) {
      throw new Error('Continuous logging already running');
    }

    const { logsPerSecond, config = {} } = options;

    this.continuousJob = {
      id: uuidv4(),
      status: 'running',
      startTime: new Date(),
      parameters: { logsPerSecond, config },
      logsGenerated: 0,
      interval: null
    };

    const intervalMs = 1000 / logsPerSecond;

    this.continuousJob.interval = setInterval(() => {
      if (this.continuousJob.status === 'running') {
        const message = this.generateMessage(config.messageSize || 1024);
        this.logMessage(config.level || 'info', message, { 
          continuousJobId: this.continuousJob.id 
        });
        this.continuousJob.logsGenerated++;

        // Periodic metrics and events
        if (config.includeMetrics && Math.random() < 0.1) {
          this.generateMetric('continuous_metric', Math.random() * 1000, {
            continuousJobId: this.continuousJob.id
          });
        }

        if (config.includeEvents && Math.random() < 0.05) {
          this.generateEvent('continuous_event', {
            continuousJobId: this.continuousJob.id
          });
        }

        // Flush periodically
        if (this.continuousJob.logsGenerated % 100 === 0) {
          appInsights.defaultClient.flush();
        }
      }
    }, intervalMs);

    return this.continuousJob;
  }

  async stopContinuousLogs() {
    if (!this.continuousJob) {
      throw new Error('No continuous logging running');
    }

    this.continuousJob.status = 'stopped';
    if (this.continuousJob.interval) {
      clearInterval(this.continuousJob.interval);
    }
    this.continuousJob.endTime = new Date();
    this.continuousJob.duration = this.continuousJob.endTime - this.continuousJob.startTime;

    const job = this.continuousJob;
    this.continuousJob = null;

    // Final flush
    appInsights.defaultClient.flush();

    return job;
  }

  // Stop all active jobs
  async stopAll() {
    // Stop continuous job
    if (this.continuousJob) {
      await this.stopContinuousLogs();
    }

    // Cancel all active jobs
    for (const [jobId, job] of this.activeJobs) {
      job.status = 'cancelled';
    }

    // Final flush
    appInsights.defaultClient.flush();
  }

  // Get current status
  getStatus() {
    const activeJobsInfo = Array.from(this.activeJobs.values()).map(job => ({
      id: job.id,
      status: job.status,
      startTime: job.startTime,
      logsGenerated: job.logsGenerated,
      metricsGenerated: job.metricsGenerated || 0,
      eventsGenerated: job.eventsGenerated || 0
    }));

    return {
      statistics: this.statistics,
      activeJobs: activeJobsInfo,
      continuousJob: this.continuousJob ? {
        id: this.continuousJob.id,
        status: this.continuousJob.status,
        startTime: this.continuousJob.startTime,
        logsGenerated: this.continuousJob.logsGenerated,
        logsPerSecond: this.continuousJob.parameters.logsPerSecond
      } : null,
      uptime: new Date() - this.statistics.startTime
    };
  }

  // Helper function to sleep
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = LogGenerator;
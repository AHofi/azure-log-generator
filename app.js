require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const compression = require('compression');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');

// Initialize Application Insights first
const appInsights = require('./appInsights');

// Import log generator
const LogGenerator = require('./logGenerator');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:"],
    }
  }
}));
app.use(cors());
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Serve static files from public directory
app.use(express.static('public'));

// Initialize log generator
const logGenerator = new LogGenerator();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Azure Log Generator',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Get current status
app.get('/status', (req, res) => {
  res.json(logGenerator.getStatus());
});

// Generate logs endpoint
app.post('/generate-logs', async (req, res) => {
  try {
    const {
      count = 1000,
      interval = 100,
      level = 'info',
      messageSize = 1024,
      includeMetrics = true,
      includeEvents = true
    } = req.body;

    // Validate parameters
    if (count < 1 || count > 1000000) {
      return res.status(400).json({ error: 'Count must be between 1 and 1,000,000' });
    }

    if (interval < 0 || interval > 60000) {
      return res.status(400).json({ error: 'Interval must be between 0 and 60000 ms' });
    }

    const validLevels = ['trace', 'info', 'warning', 'error', 'critical'];
    if (!validLevels.includes(level)) {
      return res.status(400).json({ error: `Level must be one of: ${validLevels.join(', ')}` });
    }

    // Start generation
    const jobId = uuidv4();
    const result = await logGenerator.generateLogs({
      jobId,
      count,
      interval,
      level,
      messageSize,
      includeMetrics,
      includeEvents
    });

    res.json({
      jobId,
      message: 'Log generation started',
      parameters: result.parameters,
      estimatedDuration: `${(count * interval / 1000).toFixed(2)} seconds`
    });
  } catch (error) {
    console.error('Error in generate-logs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Burst logs endpoint
app.post('/burst-logs', async (req, res) => {
  try {
    const {
      duration = 60000,
      threadsCount = 10
    } = req.body;

    // Validate parameters
    if (duration < 1000 || duration > 300000) {
      return res.status(400).json({ error: 'Duration must be between 1,000 and 300,000 ms (5 minutes)' });
    }

    if (threadsCount < 1 || threadsCount > 50) {
      return res.status(400).json({ error: 'Thread count must be between 1 and 50' });
    }

    const jobId = uuidv4();
    const result = await logGenerator.burstLogs({
      jobId,
      duration,
      threadsCount
    });

    res.json({
      jobId,
      message: 'Burst log generation started',
      parameters: result.parameters
    });
  } catch (error) {
    console.error('Error in burst-logs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Continuous logs endpoint
app.post('/continuous-logs', async (req, res) => {
  try {
    const {
      action,
      logsPerSecond = 100,
      config = {}
    } = req.body;

    if (!['start', 'stop'].includes(action)) {
      return res.status(400).json({ error: 'Action must be either "start" or "stop"' });
    }

    if (action === 'start') {
      if (logsPerSecond < 1 || logsPerSecond > 10000) {
        return res.status(400).json({ error: 'Logs per second must be between 1 and 10,000' });
      }

      const result = await logGenerator.startContinuousLogs({
        logsPerSecond,
        config
      });

      res.json({
        message: 'Continuous log generation started',
        parameters: result.parameters
      });
    } else {
      await logGenerator.stopContinuousLogs();
      res.json({
        message: 'Continuous log generation stopped'
      });
    }
  } catch (error) {
    console.error('Error in continuous-logs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stop all generation
app.post('/stop-all', async (req, res) => {
  try {
    await logGenerator.stopAll();
    res.json({
      message: 'All log generation stopped'
    });
  } catch (error) {
    console.error('Error in stop-all:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Application Insights configuration
app.get('/config/app-insights', (req, res) => {
  const config = {
    connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING ? 'Configured' : 'Not configured',
    dailyCapGB: process.env.APP_INSIGHTS_DAILY_CAP_GB || '1',
    customMetricsEnabled: process.env.ENABLE_CUSTOM_METRICS === 'true',
    customEventsEnabled: process.env.ENABLE_CUSTOM_EVENTS === 'true',
    dependenciesTrackingEnabled: process.env.ENABLE_DEPENDENCIES_TRACKING === 'true'
  };
  res.json(config);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path
  });
});

// Start server only if not in test environment
let server;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    console.log(`Azure Log Generator started on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Application Insights: ${process.env.APPLICATIONINSIGHTS_CONNECTION_STRING ? 'Configured' : 'Not configured'}`);
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  logGenerator.stopAll().then(() => {
    if (server) {
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  logGenerator.stopAll().then(() => {
    if (server) {
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
});

module.exports = app;
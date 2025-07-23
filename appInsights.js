const appInsights = require('applicationinsights');

// Initialize Application Insights
function initializeAppInsights() {
  const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
  
  if (!connectionString) {
    console.warn('Application Insights connection string not found. Telemetry will not be sent.');
    return null;
  }

  // Setup Application Insights
  appInsights.setup(connectionString)
    .setAutoDependencyCorrelation(true)
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true, true)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(process.env.ENABLE_DEPENDENCIES_TRACKING === 'true')
    .setAutoCollectConsole(true)
    .setUseDiskRetryCaching(true)
    .setSendLiveMetrics(true)
    .setDistributedTracingMode(appInsights.DistributedTracingModes.AI_AND_W3C);

  // Configure telemetry processor to add custom properties
  appInsights.defaultClient.addTelemetryProcessor((envelope, context) => {
    // Add custom properties to all telemetry
    envelope.tags['ai.cloud.role'] = 'log-generator';
    envelope.tags['ai.cloud.roleInstance'] = process.env.WEBSITE_INSTANCE_ID || 'local';
    
    if (envelope.data.baseData) {
      envelope.data.baseData.properties = envelope.data.baseData.properties || {};
      envelope.data.baseData.properties.environment = process.env.NODE_ENV || 'development';
      envelope.data.baseData.properties.generatorVersion = '1.0.0';
    }

    return true;
  });

  // Configure sampling if needed (to control volume)
  const samplingPercentage = process.env.AI_SAMPLING_PERCENTAGE;
  if (samplingPercentage) {
    appInsights.defaultClient.config.samplingPercentage = parseFloat(samplingPercentage);
    console.log(`Application Insights sampling set to ${samplingPercentage}%`);
  }

  // Configure batching for better performance
  appInsights.defaultClient.config.maxBatchSize = 250;
  appInsights.defaultClient.config.maxBatchIntervalMs = 20000;

  // Start collecting telemetry
  appInsights.start();

  console.log('Application Insights initialized successfully');
  console.log(`Connection String: ${connectionString.substring(0, 50)}...`);

  // Log startup event
  appInsights.defaultClient.trackEvent({
    name: 'LogGeneratorStartup',
    properties: {
      nodeVersion: process.version,
      platform: process.platform,
      environment: process.env.NODE_ENV || 'development',
      dailyCapGB: process.env.APP_INSIGHTS_DAILY_CAP_GB || 'not set'
    }
  });

  // Track memory usage metric every 30 seconds
  setInterval(() => {
    const memUsage = process.memoryUsage();
    appInsights.defaultClient.trackMetric({
      name: 'MemoryUsageMB',
      value: memUsage.heapUsed / 1024 / 1024,
      properties: {
        heapTotal: memUsage.heapTotal / 1024 / 1024,
        rss: memUsage.rss / 1024 / 1024,
        external: memUsage.external / 1024 / 1024
      }
    });
  }, 30000);

  return appInsights;
}

// Initialize on module load
const ai = initializeAppInsights();

// Export for use in other modules
module.exports = ai;
# Azure Application Insights Daily Cap Testing - Implementation Plan

## Overview
This project creates a high-volume log generator deployed as an Azure App Service to test Application Insights daily cap notifications. The solution uses Node.js/Express for flexibility and continuous operation, integrated with GitHub Actions for easy deployment.

## Architecture Decision

### Why App Service over Function App?
- **Continuous Operation**: App Services can run continuously without the 5-10 minute execution limits of Function Apps
- **Better for High Volume**: No cold start delays, consistent performance for sustained log generation
- **Cost Effective for Testing**: Can use lower-tier plans (B1) for testing purposes
- **Easy Scaling**: Can scale up/out if needed for even higher log volumes

## Implementation Details

### 1. Core Application Structure

#### app.js - Main Express Server
- Express.js web server with multiple endpoints
- Health check endpoint for monitoring
- Log generation endpoints with different patterns
- Graceful shutdown handling

#### logGenerator.js - Log Generation Engine
Features:
- Configurable log volume (logs per second)
- Variable log message sizes
- Different log levels (Trace, Info, Warning, Error, Critical)
- Burst mode for rapid generation
- Continuous mode for sustained load
- Custom event generation
- Metric tracking

#### appInsights.js - Application Insights Integration
- SDK initialization with connection string
- Custom telemetry processors
- Performance tracking
- Exception handling
- Custom dimensions for better filtering

### 2. Log Generation Endpoints

#### `/generate-logs` (POST)
Parameters:
```json
{
  "count": 1000,           // Number of logs to generate
  "interval": 100,         // Milliseconds between logs
  "level": "info",         // Log level: trace/info/warning/error/critical
  "messageSize": 1024,     // Size of each log message in bytes
  "includeMetrics": true,  // Also send custom metrics
  "includeEvents": true    // Also send custom events
}
```

#### `/burst-logs` (POST)
Generates maximum logs as fast as possible:
```json
{
  "duration": 60000,       // Duration in milliseconds
  "threadsCount": 10      // Parallel generation threads
}
```

#### `/continuous-logs` (POST)
Starts/stops continuous generation:
```json
{
  "action": "start",       // start/stop
  "logsPerSecond": 100,
  "config": { ... }        // Same as generate-logs parameters
}
```

#### `/status` (GET)
Returns current generation status and statistics

### 3. GitHub Repository Structure

```
.github/
  workflows/
    azure-deploy.yml     # Automated deployment workflow
azure/
  azuredeploy.json      # ARM template
  azuredeploy.parameters.json
  deploy.ps1            # PowerShell deployment script
src/
  app.js
  logGenerator.js
  appInsights.js
test/
  test-daily-cap.ps1    # Testing scripts
  load-test.js          # Load testing scenarios
.env.example
.gitignore
package.json
package-lock.json
README.md
plan.md
```

### 4. Deployment Strategy

#### GitHub Actions Workflow
1. Trigger on push to main branch
2. Build Node.js application
3. Run tests
4. Deploy to Azure App Service
5. Configure Application Insights

#### Azure Resources Created
1. Resource Group
2. App Service Plan (B1 tier minimum)
3. App Service
4. Application Insights
5. Log Analytics Workspace (for workspace-based AI)

### 5. Configuration

#### Environment Variables
```
# Application Insights
APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=...;IngestionEndpoint=...
APP_INSIGHTS_DAILY_CAP_GB=1  # Daily cap in GB for testing

# App Configuration
PORT=8080
NODE_ENV=production
LOG_GENERATION_MAX_THREADS=20
DEFAULT_LOG_SIZE_BYTES=1024

# Feature Flags
ENABLE_CUSTOM_METRICS=true
ENABLE_CUSTOM_EVENTS=true
ENABLE_DEPENDENCIES_TRACKING=true
```

### 6. Testing Daily Cap

#### Test Scenarios

1. **Gradual Increase Test**
   - Start with 10 logs/second
   - Increase by 10 every minute
   - Monitor when cap is reached

2. **Burst Test**
   - Generate maximum logs for 5 minutes
   - Check cap notification timing

3. **Multi-Type Test**
   - Generate logs, metrics, and events simultaneously
   - Verify all count towards cap

4. **Regional Test** (if using regional endpoints)
   - Test cap behavior per region

#### Monitoring Script (PowerShell)
```powershell
# Monitor current usage against daily cap
$resourceGroup = "rg-logtest"
$appInsightsName = "ai-logtest"

# Get current usage
az monitor app-insights component billing show `
  --resource-group $resourceGroup `
  --app $appInsightsName

# Check if cap notification was triggered
az monitor activity-log list `
  --resource-group $resourceGroup `
  --start-time (Get-Date).AddHours(-1) `
  --query "[?contains(operationName, 'DailyCap')]"
```

### 7. Cost Optimization

1. **Use Free Tier During Development**
   - App Service: F1 free tier for initial development
   - Application Insights: 5GB free per month

2. **Implement Sampling**
   - Configure adaptive sampling in Application Insights
   - Reduce data volume while maintaining statistical accuracy

3. **Clean Up After Testing**
   - Delete resources after testing
   - Use Azure DevTest Labs for automatic shutdown

### 8. Security Considerations

1. **Authentication**
   - Add API key for log generation endpoints
   - Use Azure AD authentication for production

2. **Network Security**
   - Enable App Service firewall rules
   - Restrict access to known IPs during testing

3. **Secrets Management**
   - Use Azure Key Vault for connection strings
   - Never commit secrets to GitHub

### 9. Troubleshooting

Common issues and solutions:

1. **Logs Not Appearing**
   - Check connection string
   - Verify Application Insights is enabled
   - Check for sampling configuration

2. **Cap Not Triggering**
   - Ensure sufficient log volume
   - Check cap configuration (remember lag time)
   - Verify workspace-based vs classic AI settings

3. **Performance Issues**
   - Scale up App Service plan
   - Optimize log generation code
   - Use async operations

### 10. Next Steps After Implementation

1. **Create GitHub Repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Azure log generator for AI daily cap testing"
   git remote add origin https://github.com/yourusername/azure-log-generator.git
   git push -u origin main
   ```

2. **Set GitHub Secrets**
   - AZURE_CREDENTIALS (service principal)
   - AZURE_SUBSCRIPTION_ID
   - RESOURCE_GROUP_NAME

3. **Initial Deployment**
   - Run GitHub Actions workflow
   - Verify App Service is running
   - Test endpoints manually

4. **Run Test Scenarios**
   - Execute test scripts
   - Monitor Application Insights
   - Verify cap notifications

## Summary

This implementation provides a robust, scalable solution for testing Application Insights daily cap notifications. The GitHub integration ensures easy deployment and updates, while the configurable log generation allows testing various scenarios to understand cap behavior thoroughly.
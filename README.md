# Azure Log Generator

A high-volume log generator for testing Azure Application Insights daily cap notifications. This Node.js application can generate configurable volumes of logs, metrics, and events to help test and understand Application Insights behavior when approaching daily caps.

## Features

- **Multiple Generation Modes**: Standard, burst, and continuous log generation
- **Configurable Volume**: Control logs per second, message size, and log levels
- **Multi-Type Telemetry**: Generate logs, custom metrics, and custom events
- **REST API**: Easy-to-use endpoints for controlling log generation
- **GitHub Actions Integration**: Automated deployment to Azure App Service
- **Real-time Monitoring**: Track generation statistics and status

## Prerequisites

- Node.js 18.x or higher
- Azure subscription
- GitHub account (for automated deployment)

## Quick Start

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/yourusername/azure-log-generator.git
cd azure-log-generator
```

2. Install dependencies:
```bash
npm install
```

3. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

4. Update the Application Insights connection string in `.env`:
```
APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=your-key;IngestionEndpoint=https://...
```

5. Start the application:
```bash
npm start
```

The application will run on `http://localhost:8080`

## API Endpoints

### Health Check
```
GET /
```
Returns application status and version information.

### Get Status
```
GET /status
```
Returns current generation statistics and active jobs.

### Generate Logs
```
POST /generate-logs
Content-Type: application/json

{
  "count": 1000,           // Number of logs to generate (1-1,000,000)
  "interval": 100,         // Milliseconds between logs (0-60000)
  "level": "info",         // Log level: trace/info/warning/error/critical
  "messageSize": 1024,     // Size of each log message in bytes
  "includeMetrics": true,  // Also generate custom metrics
  "includeEvents": true    // Also generate custom events
}
```

### Burst Logs
Generate maximum logs as fast as possible:
```
POST /burst-logs
Content-Type: application/json

{
  "duration": 60000,       // Duration in milliseconds (1000-300000)
  "threadsCount": 10       // Parallel generation threads (1-50)
}
```

### Continuous Logs
Start or stop continuous log generation:
```
POST /continuous-logs
Content-Type: application/json

{
  "action": "start",       // start/stop
  "logsPerSecond": 100,    // Logs per second (1-10000)
  "config": {              // Optional configuration
    "level": "info",
    "messageSize": 1024,
    "includeMetrics": true,
    "includeEvents": true
  }
}
```

### Stop All Generation
```
POST /stop-all
```
Stops all active log generation jobs.

### Get Application Insights Config
```
GET /config/app-insights
```
Returns current Application Insights configuration.

## Deployment to Azure

### Using PowerShell Script

1. Login to Azure:
```powershell
Connect-AzAccount
```

2. Run the deployment script:
```powershell
cd azure
./deploy.ps1 -ResourceGroupName "rg-logtest" -Location "eastus"
```

### Using GitHub Actions

1. Fork this repository to your GitHub account

2. Set up GitHub Secrets:
   - `AZURE_WEBAPP_PUBLISH_PROFILE`: Get from Azure Portal or deployment script
   - `AZURE_RESOURCE_GROUP`: Your resource group name
   - `APPLICATIONINSIGHTS_CONNECTION_STRING`: Your AI connection string

3. Push to main branch to trigger deployment

### Manual Azure Deployment

1. Create resources using ARM template:
```bash
az group create --name rg-logtest --location eastus

az deployment group create \
  --resource-group rg-logtest \
  --template-file azure/azuredeploy.json \
  --parameters azure/azuredeploy.parameters.json
```

2. Deploy code:
```bash
az webapp deployment source config-zip \
  --resource-group rg-logtest \
  --name app-log-generator \
  --src app.zip
```

## Testing Daily Cap

### Basic Test
```bash
# Generate 10,000 logs
curl -X POST http://your-app.azurewebsites.net/generate-logs \
  -H "Content-Type: application/json" \
  -d '{"count": 10000, "interval": 10}'
```

### Burst Test
```bash
# Generate maximum logs for 1 minute
curl -X POST http://your-app.azurewebsites.net/burst-logs \
  -H "Content-Type: application/json" \
  -d '{"duration": 60000, "threadsCount": 20}'
```

### Continuous Test
```bash
# Start continuous generation at 1000 logs/second
curl -X POST http://your-app.azurewebsites.net/continuous-logs \
  -H "Content-Type: application/json" \
  -d '{"action": "start", "logsPerSecond": 1000}'
```

## Monitoring Daily Cap

### Azure CLI
```bash
# Check current usage
az monitor app-insights component billing show \
  --resource-group rg-logtest \
  --app ai-log-generator

# Check for cap notifications
az monitor activity-log list \
  --resource-group rg-logtest \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) \
  --query "[?contains(operationName.value, 'DailyCap')]"
```

### Portal
1. Navigate to your Application Insights resource
2. Check "Usage and estimated costs"
3. Look for daily cap warnings/notifications

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | AI connection string | Required |
| `APP_INSIGHTS_DAILY_CAP_GB` | Daily cap in GB | 1 |
| `PORT` | Server port | 8080 |
| `NODE_ENV` | Environment | production |
| `LOG_GENERATION_MAX_THREADS` | Max parallel threads | 20 |
| `DEFAULT_LOG_SIZE_BYTES` | Default message size | 1024 |
| `ENABLE_CUSTOM_METRICS` | Send custom metrics | true |
| `ENABLE_CUSTOM_EVENTS` | Send custom events | true |
| `AI_SAMPLING_PERCENTAGE` | Sampling percentage | 100 |

## Troubleshooting

### Logs Not Appearing in Application Insights

1. Check connection string is correct
2. Verify Application Insights is not in a failed state
3. Check if daily cap has been reached
4. Allow 2-5 minutes for logs to appear
5. Check sampling configuration

### Daily Cap Not Triggering

1. Ensure you're generating enough data (cap behavior may have delay)
2. Check both Application Insights and Log Analytics caps
3. Remember workspace-based AI uses the lesser of two caps
4. Monitor actual data ingestion vs generated volume

### Performance Issues

1. Reduce thread count in burst mode
2. Increase interval between logs
3. Scale up App Service plan
4. Enable sampling to reduce data volume

## Cost Optimization

- Use F1 (free) tier for initial testing
- Enable sampling to reduce data volume
- Set appropriate daily caps
- Delete resources after testing
- Monitor costs in Azure Cost Management

## Security Notes

- Never commit actual connection strings
- Use Key Vault for production scenarios
- Restrict network access during testing
- Enable authentication for production use

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details
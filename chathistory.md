# Azure Log Generator Chat History

## Project Context
This chat documents the creation of an Azure log generator application for testing Application Insights daily cap notifications.

## Initial Request
User needed help deploying an App Service or Function App to generate high-volume logs for ingestion into Azure Application Insights to test daily cap notifications.

## Solution Overview
Created a Node.js Express application deployed as an Azure App Service (chosen over Function App for continuous operation without execution time limits) that can generate configurable volumes of logs, metrics, and events.

## Key Decisions Made

1. **App Service vs Function App**: Chose App Service because:
   - No execution time limits (Function Apps have 5-10 minute limits)
   - Better for continuous log generation
   - Can run 24/7 without cold starts
   - More suitable for sustained high-volume operations

2. **Technology Stack**:
   - Node.js with Express.js for the web server
   - Application Insights SDK for telemetry
   - GitHub Actions for CI/CD
   - ARM templates for infrastructure as code

3. **Architecture Features**:
   - REST API endpoints for controlling log generation
   - Multiple generation modes (standard, burst, continuous)
   - Configurable log volume, frequency, and size
   - Real-time status monitoring
   - Graceful shutdown handling

## Files Created

1. **plan.md** - Comprehensive implementation plan with architecture details
2. **app.js** - Express server with API endpoints
3. **logGenerator.js** - Core log generation engine
4. **appInsights.js** - Application Insights configuration
5. **package.json** - Node.js dependencies
6. **.env.example** - Environment variables template
7. **.gitignore** - Git ignore configuration
8. **README.md** - Complete usage documentation
9. **.github/workflows/azure-deploy.yml** - GitHub Actions workflow
10. **azure/azuredeploy.json** - ARM template
11. **azure/azuredeploy.parameters.json** - ARM parameters
12. **azure/deploy.ps1** - PowerShell deployment script

## API Endpoints Implemented

- `GET /` - Health check
- `GET /status` - Current generation statistics
- `POST /generate-logs` - Generate specific number of logs
- `POST /burst-logs` - Maximum speed generation
- `POST /continuous-logs` - Start/stop continuous generation
- `POST /stop-all` - Stop all active jobs
- `GET /config/app-insights` - View AI configuration

## GitHub Repository
Successfully created and pushed to: https://github.com/AHofi/azure-log-generator

## Important Configuration Notes

### Application Insights Daily Cap Behavior (2025)
- Maximum cap: 1,000 GB/day (can request higher)
- Default in portal: 100 GB/day
- Since March 2023: AI and Log Analytics caps set independently
- Since Sept 2023: All billable data types capped when limit reached
- Cap can't stop collection at precise level - expect some overflow
- Regional considerations for connection strings

### Environment Variables Required
- `APPLICATIONINSIGHTS_CONNECTION_STRING` - Required for telemetry
- `APP_INSIGHTS_DAILY_CAP_GB` - For tracking (not enforcing) cap
- `PORT` - Server port (default 8080)
- Various feature flags for metrics/events/dependencies

## Deployment Steps

1. **Local Testing**:
   ```bash
   npm install
   cp .env.example .env
   # Edit .env with your AI connection string
   npm start
   ```

2. **Azure Deployment via PowerShell**:
   ```powershell
   cd azure
   ./deploy.ps1 -ResourceGroupName "rg-logtest" -Location "eastus"
   ```

3. **GitHub Actions Setup**:
   - Add secrets: AZURE_WEBAPP_PUBLISH_PROFILE, AZURE_RESOURCE_GROUP, APPLICATIONINSIGHTS_CONNECTION_STRING
   - Push to main branch triggers deployment

## Testing Daily Cap

1. **Basic Test**: Generate 10,000 logs over time
2. **Burst Test**: Maximum logs for 1-5 minutes
3. **Continuous Test**: Sustained load at configurable rate

Monitor cap usage via:
- Azure Portal: Application Insights > Usage and estimated costs
- Azure CLI: `az monitor app-insights component billing show`
- Activity Log: Check for DailyCap operations

## Key Learning Points

1. Daily caps have inherent lag - can't stop precisely at limit
2. Workspace-based AI uses lesser of AI and Log Analytics caps
3. High-volume scenarios may exceed cap before stopping
4. TLS 1.2+ required after March 2025
5. Consider sampling to control costs while testing

## Next Machine Setup

1. Clone repository: `git clone https://github.com/AHofi/azure-log-generator.git`
2. Install dependencies: `npm install`
3. Configure environment variables
4. Deploy to Azure or run locally

This project provides a complete solution for testing Application Insights daily cap behavior with various log generation patterns.
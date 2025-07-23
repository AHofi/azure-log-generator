# Azure Log Generator Deployment Script
# This script deploys the infrastructure and application to Azure

param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName,
    
    [Parameter(Mandatory=$true)]
    [string]$Location,
    
    [Parameter(Mandatory=$false)]
    [string]$AppServiceName = "app-log-generator",
    
    [Parameter(Mandatory=$false)]
    [string]$DailyCapGB = "1"
)

Write-Host "Azure Log Generator Deployment Script" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green

# Check if logged in to Azure
$context = Get-AzContext
if (!$context) {
    Write-Host "Please login to Azure..." -ForegroundColor Yellow
    Connect-AzAccount
}

# Create Resource Group if it doesn't exist
Write-Host "`nChecking Resource Group..." -ForegroundColor Cyan
$rg = Get-AzResourceGroup -Name $ResourceGroupName -ErrorAction SilentlyContinue
if (!$rg) {
    Write-Host "Creating Resource Group: $ResourceGroupName" -ForegroundColor Yellow
    New-AzResourceGroup -Name $ResourceGroupName -Location $Location
} else {
    Write-Host "Resource Group exists: $ResourceGroupName" -ForegroundColor Green
}

# Deploy ARM template
Write-Host "`nDeploying ARM template..." -ForegroundColor Cyan
$templateFile = Join-Path $PSScriptRoot "azuredeploy.json"
$parametersFile = Join-Path $PSScriptRoot "azuredeploy.parameters.json"

$deploymentName = "deployment-$(Get-Date -Format 'yyyyMMddHHmmss')"
$deployment = New-AzResourceGroupDeployment `
    -Name $deploymentName `
    -ResourceGroupName $ResourceGroupName `
    -TemplateFile $templateFile `
    -TemplateParameterFile $parametersFile `
    -appServiceName $AppServiceName `
    -dailyCapGB $DailyCapGB `
    -Verbose

if ($deployment.ProvisioningState -eq "Succeeded") {
    Write-Host "`nDeployment succeeded!" -ForegroundColor Green
    
    # Display outputs
    Write-Host "`nDeployment Outputs:" -ForegroundColor Cyan
    Write-Host "App Service URL: $($deployment.Outputs.appServiceUrl.Value)" -ForegroundColor White
    Write-Host "Application Insights Connection String: $($deployment.Outputs.appInsightsConnectionString.Value.Substring(0, 50))..." -ForegroundColor White
    
    # Get publish profile for GitHub Actions
    Write-Host "`nGetting publish profile for GitHub Actions..." -ForegroundColor Cyan
    $profile = Get-AzWebAppPublishingProfile `
        -ResourceGroupName $ResourceGroupName `
        -Name $AppServiceName `
        -OutputFile "$PSScriptRoot\publishprofile.xml"
    
    Write-Host "Publish profile saved to: $PSScriptRoot\publishprofile.xml" -ForegroundColor Green
    Write-Host "`nIMPORTANT: Add this publish profile to your GitHub repository secrets as 'AZURE_WEBAPP_PUBLISH_PROFILE'" -ForegroundColor Yellow
    
    # Test the deployment
    Write-Host "`nTesting deployment..." -ForegroundColor Cyan
    $appUrl = $deployment.Outputs.appServiceUrl.Value
    try {
        $response = Invoke-RestMethod -Uri $appUrl -Method Get
        Write-Host "App is running! Status: $($response.status)" -ForegroundColor Green
    } catch {
        Write-Host "App is not yet responding. It may take a few minutes to start." -ForegroundColor Yellow
    }
    
} else {
    Write-Host "`nDeployment failed!" -ForegroundColor Red
    Write-Host "Error: $($deployment.Error)" -ForegroundColor Red
}

Write-Host "`nDeployment script completed." -ForegroundColor Green
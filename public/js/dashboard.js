// Dashboard JavaScript for Azure Log Generator

let continuousRunning = false;
let statusRefreshInterval;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    // Check connection
    checkConnection();
    
    // Load Application Insights config
    loadAppInsightsConfig();
    
    // Set up form handlers
    document.getElementById('generateLogsForm').addEventListener('submit', handleGenerateLogs);
    document.getElementById('burstLogsBtn').addEventListener('click', handleBurstLogs);
    document.getElementById('continuousToggleBtn').addEventListener('click', handleContinuousToggle);
    document.getElementById('stopAllBtn').addEventListener('click', handleStopAll);
    
    // Start status refresh
    startStatusRefresh();
});

// Check server connection
async function checkConnection() {
    try {
        const response = await fetch('/health', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
            cache: 'no-cache'
        });
        if (response.ok) {
            setConnectionStatus(true);
            return true;
        } else {
            setConnectionStatus(false);
            return false;
        }
    } catch (error) {
        console.error('Connection check failed:', error);
        setConnectionStatus(false);
        return false;
    }
}

// Set connection status indicator
function setConnectionStatus(connected) {
    const statusIcon = document.getElementById('connectionStatus');
    const statusText = document.getElementById('connectionText');
    
    if (connected) {
        statusIcon.classList.remove('disconnected');
        statusIcon.classList.add('connected');
        statusText.textContent = 'Connected';
        // Reset retry counter on successful connection
        window.connectionRetries = 0;
    } else {
        statusIcon.classList.remove('connected');
        statusIcon.classList.add('disconnected');
        statusText.textContent = 'Disconnected';
    }
}

// Load Application Insights configuration
async function loadAppInsightsConfig() {
    try {
        const response = await fetch('/config/app-insights');
        if (response.ok) {
            const config = await response.json();
            
            document.getElementById('aiConnectionStatus').innerHTML = 
                config.connectionString === 'Configured' 
                ? '<span class="text-success"><i class="bi bi-check-circle"></i> Configured</span>'
                : '<span class="text-danger"><i class="bi bi-x-circle"></i> Not Configured</span>';
            
            document.getElementById('aiDailyCap').textContent = config.dailyCapGB + ' GB';
            document.getElementById('aiCustomMetrics').innerHTML = 
                config.customMetricsEnabled 
                ? '<span class="text-success">Enabled</span>' 
                : '<span class="text-muted">Disabled</span>';
            
            document.getElementById('aiCustomEvents').innerHTML = 
                config.customEventsEnabled 
                ? '<span class="text-success">Enabled</span>' 
                : '<span class="text-muted">Disabled</span>';
            
            document.getElementById('aiDependencies').innerHTML = 
                config.dependenciesTrackingEnabled 
                ? '<span class="text-success">Enabled</span>' 
                : '<span class="text-muted">Disabled</span>';
        }
    } catch (error) {
        console.error('Failed to load App Insights config:', error);
    }
}

// Handle generate logs form submission
async function handleGenerateLogs(event) {
    event.preventDefault();
    
    const formData = {
        count: parseInt(document.getElementById('logCount').value),
        interval: parseInt(document.getElementById('logInterval').value),
        level: document.getElementById('logLevel').value,
        messageSize: parseInt(document.getElementById('messageSize').value),
        includeMetrics: document.getElementById('includeMetrics').checked,
        includeEvents: document.getElementById('includeEvents').checked
    };
    
    try {
        const response = await fetch('/generate-logs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            const result = await response.json();
            showToast('success', `Log generation started. Job ID: ${result.jobId}`);
            refreshStatus();
        } else {
            const error = await response.json();
            showToast('error', `Failed to start generation: ${error.error}`);
        }
    } catch (error) {
        showToast('error', `Failed to start generation: ${error.message}`);
    }
}

// Handle burst logs
async function handleBurstLogs() {
    console.log('Burst button clicked');
    const duration = parseInt(document.getElementById('burstDuration').value);
    const threadsCount = parseInt(document.getElementById('burstThreads').value);
    
    console.log('Burst params:', { duration, threadsCount });
    
    try {
        const response = await fetch('/burst-logs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ duration, threadsCount })
        });
        
        console.log('Burst response status:', response.status);
        
        if (response.ok) {
            const result = await response.json();
            console.log('Burst started:', result);
            showToast('warning', `Burst generation started. Job ID: ${result.jobId}`);
            // Force immediate status refresh
            setTimeout(refreshStatus, 100);
        } else {
            const error = await response.json();
            showToast('error', `Failed to start burst: ${error.error}`);
        }
    } catch (error) {
        console.error('Burst error:', error);
        showToast('error', `Failed to start burst: ${error.message}`);
    }
}

// Handle continuous toggle
async function handleContinuousToggle() {
    const action = continuousRunning ? 'stop' : 'start';
    const logsPerSecond = parseInt(document.getElementById('logsPerSecond').value);
    
    try {
        const response = await fetch('/continuous-logs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action, logsPerSecond })
        });
        
        if (response.ok) {
            continuousRunning = !continuousRunning;
            updateContinuousButton();
            showToast('info', `Continuous generation ${action}ed`);
            refreshStatus();
        } else {
            const error = await response.json();
            showToast('error', `Failed to ${action} continuous generation: ${error.error}`);
        }
    } catch (error) {
        showToast('error', `Failed to ${action} continuous generation: ${error.message}`);
    }
}

// Update continuous button state
function updateContinuousButton() {
    const btn = document.getElementById('continuousToggleBtn');
    if (continuousRunning) {
        btn.classList.remove('btn-success');
        btn.classList.add('btn-warning');
        btn.innerHTML = '<i class="bi bi-pause-circle"></i> Stop Continuous Generation';
    } else {
        btn.classList.remove('btn-warning');
        btn.classList.add('btn-success');
        btn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Start Continuous Generation';
    }
}

// Handle stop all
async function handleStopAll() {
    if (!confirm('Are you sure you want to stop all log generation?')) {
        return;
    }
    
    try {
        const response = await fetch('/stop-all', {
            method: 'POST'
        });
        
        if (response.ok) {
            showToast('success', 'All generation stopped');
            continuousRunning = false;
            updateContinuousButton();
            refreshStatus();
        } else {
            const error = await response.json();
            showToast('error', `Failed to stop generation: ${error.error}`);
        }
    } catch (error) {
        showToast('error', `Failed to stop generation: ${error.message}`);
    }
}

// Start status refresh interval
function startStatusRefresh() {
    refreshStatus();
    statusRefreshInterval = setInterval(refreshStatus, 5000);
}

// Refresh status
async function refreshStatus() {
    try {
        const response = await fetch('/status', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
            cache: 'no-cache'
        });
        
        if (response.ok) {
            const status = await response.json();
            updateStatusDisplay(status);
            setConnectionStatus(true);
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        console.error('Failed to refresh status:', error);
        // Only set disconnected if multiple failures
        if (!window.connectionRetries) window.connectionRetries = 0;
        window.connectionRetries++;
        
        if (window.connectionRetries > 2) {
            setConnectionStatus(false);
        }
        
        // Try to reconnect
        setTimeout(checkConnection, 2000);
    }
}

// Update status display
function updateStatusDisplay(status) {
    // Update counters
    document.getElementById('totalLogs').textContent = (status.statistics?.totalLogsGenerated || 0).toLocaleString();
    document.getElementById('activeJobs').textContent = (status.activeJobs?.length || 0);
    document.getElementById('activeThreads').textContent = (status.statistics?.activeThreads || 0);
    
    // Update jobs list
    const jobsContainer = document.getElementById('jobsContainer');
    if (!status.activeJobs || status.activeJobs.length === 0) {
        jobsContainer.innerHTML = '<p class="text-muted">No active jobs</p>';
    } else {
        console.log('Active jobs:', status.activeJobs);
        jobsContainer.innerHTML = status.activeJobs.map(job => {
            return `
                <div class="job-item">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <div class="job-type">Active Job</div>
                            <div class="job-id">ID: ${job.id.substring(0, 8)}...</div>
                            <div class="job-stats">
                                ${(job.logsGenerated || 0).toLocaleString()} logs generated
                            </div>
                        </div>
                        <div class="text-end">
                            <small class="text-muted">Started ${getTimeSince(job.startTime)}</small>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Update continuous status
    const continuousStatus = document.getElementById('continuousStatus');
    if (status.continuousJob) {
        continuousRunning = true;
        updateContinuousButton();
        continuousStatus.className = 'alert alert-success running';
        continuousStatus.innerHTML = `
            <i class="bi bi-play-circle pulse"></i> 
            Running at ${status.continuousJob.logsPerSecond} logs/second
            <br>
            <small>${status.continuousJob.logsGenerated.toLocaleString()} logs generated</small>
        `;
    } else {
        continuousRunning = false;
        updateContinuousButton();
        continuousStatus.className = 'alert alert-secondary';
        continuousStatus.innerHTML = '<i class="bi bi-pause-circle"></i> Not running';
    }
}

// Get time since string
function getTimeSince(startTime) {
    const seconds = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
    
    if (seconds < 60) {
        return `${seconds}s ago`;
    } else if (seconds < 3600) {
        return `${Math.floor(seconds / 60)}m ago`;
    } else {
        return `${Math.floor(seconds / 3600)}h ago`;
    }
}

// Show toast notification
function showToast(type, message) {
    const toastElement = document.getElementById('notificationToast');
    const toastMessage = document.getElementById('toastMessage');
    
    // Remove all type classes
    toastElement.classList.remove('success', 'error', 'warning', 'info');
    
    // Add appropriate class
    toastElement.classList.add(type);
    
    // Set message
    toastMessage.textContent = message;
    
    // Show toast
    const toast = new bootstrap.Toast(toastElement);
    toast.show();
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (statusRefreshInterval) {
        clearInterval(statusRefreshInterval);
    }
});
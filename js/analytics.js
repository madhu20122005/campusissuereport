// analytics.js - Analytics Dashboard functionality

let allIssuesData = [];
let categoryChart, severityChart, timelineChart, responseTimeChart;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing analytics dashboard...');
    
    // Initialize Firebase if not already done
    if (!firebase.apps.length) {
        console.error('Firebase not initialized! Make sure config.js is loaded first.');
        return;
    }
    
    // Load all data
    loadAnalyticsData();
    
    // Setup time filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const period = parseInt(e.target.dataset.period);
            updateTimelineChart(period);
        });
    });
    
    // Looker Studio button
    const lookerBtn = document.getElementById('openLookerStudio');
    if (lookerBtn) {
        lookerBtn.addEventListener('click', () => {
            document.getElementById('lookerModal').style.display = 'flex';
        });
    }
    
    // Real-time updates
    firebase.firestore().collection('issues')
        .onSnapshot(() => {
            console.log('Data updated, refreshing analytics...');
            loadAnalyticsData();
        });
});

// Load all analytics data
function loadAnalyticsData() {
    firebase.firestore()
        .collection('issues')
        .orderBy('createdAt', 'desc')
        .get()
        .then((snapshot) => {
            allIssuesData = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                allIssuesData.push({
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
                    updatedAt: data.updatedAt ? data.updatedAt.toDate() : new Date()
                });
            });
            
            console.log('Loaded issues for analytics:', allIssuesData.length);
            
            // Update all components
            updateStats();
            updateCharts();
            updateActivity();
        })
        .catch((error) => {
            console.error('Error loading analytics data:', error);
        });
}

// Update statistics cards
function updateStats() {
    const total = allIssuesData.length;
    const pending = allIssuesData.filter(i => i.status === 'pending').length;
    const inProgress = allIssuesData.filter(i => i.status === 'in_progress').length;
    const resolved = allIssuesData.filter(i => i.status === 'resolved').length;
    
    // Update DOM
    document.getElementById('totalIssues').textContent = total;
    document.getElementById('pendingIssues').textContent = pending;
    document.getElementById('inProgressIssues').textContent = inProgress;
    document.getElementById('resolvedIssues').textContent = resolved;
    
    // Calculate resolution rate
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
    document.getElementById('resolutionRate').textContent = resolutionRate + '%';
    
    // Update progress circle
    updateProgressCircle(resolutionRate);
    
    // Calculate average response time
    const avgTime = calculateAverageResponseTime();
    document.getElementById('avgResponseTime').textContent = avgTime;
}

// Update progress circle
function updateProgressCircle(percentage) {
    const circle = document.getElementById('progressCircle');
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;
    
    circle.style.strokeDasharray = circumference;
    circle.style.strokeDashoffset = offset;
}

// Calculate average response time
function calculateAverageResponseTime() {
    const resolvedIssues = allIssuesData.filter(i => i.status === 'resolved' && i.createdAt && i.updatedAt);
    
    if (resolvedIssues.length === 0) return 0;
    
    const totalHours = resolvedIssues.reduce((sum, issue) => {
        const hours = (issue.updatedAt - issue.createdAt) / (1000 * 60 * 60);
        return sum + hours;
    }, 0);
    
    return Math.round(totalHours / resolvedIssues.length);
}

// Update all charts
function updateCharts() {
    updateCategoryChart();
    updateSeverityChart();
    updateTimelineChart(7);
    updateResponseTimeChart();
}

// Category Distribution Chart
function updateCategoryChart() {
    const categoryCounts = {};
    allIssuesData.forEach(issue => {
        const cat = issue.category || 'other';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
    
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;
    
    if (categoryChart) categoryChart.destroy();
    
    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(categoryCounts).map(k => k.charAt(0).toUpperCase() + k.slice(1)),
            datasets: [{
                data: Object.values(categoryCounts),
                backgroundColor: [
                    '#2196F3',
                    '#4CAF50',
                    '#FF9800',
                    '#F44336',
                    '#9C27B0',
                    '#00BCD4',
                    '#607D8B'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Severity Distribution Chart
function updateSeverityChart() {
    const severityCounts = { low: 0, medium: 0, high: 0 };
    allIssuesData.forEach(issue => {
        const sev = issue.severity || 'medium';
        severityCounts[sev]++;
    });
    
    const ctx = document.getElementById('severityChart');
    if (!ctx) return;
    
    if (severityChart) severityChart.destroy();
    
    severityChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Low', 'Medium', 'High'],
            datasets: [{
                label: 'Issues by Severity',
                data: [severityCounts.low, severityCounts.medium, severityCounts.high],
                backgroundColor: ['#4CAF50', '#FF9800', '#F44336']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Timeline Chart
function updateTimelineChart(days) {
    const now = new Date();
    const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
    
    // Create date buckets
    const dateCounts = {};
    for (let i = 0; i < days; i++) {
        const date = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000));
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dateCounts[dateStr] = 0;
    }
    
    // Count issues per day
    allIssuesData.forEach(issue => {
        if (issue.createdAt >= startDate) {
            const dateStr = issue.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if (dateCounts.hasOwnProperty(dateStr)) {
                dateCounts[dateStr]++;
            }
        }
    });
    
    const ctx = document.getElementById('timelineChart');
    if (!ctx) return;
    
    if (timelineChart) timelineChart.destroy();
    
    timelineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Object.keys(dateCounts),
            datasets: [{
                label: 'Issues Reported',
                data: Object.values(dateCounts),
                borderColor: '#2196F3',
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Response Time Chart
function updateResponseTimeChart() {
    const resolvedByDay = {};
    const last7Days = [];
    
    // Get last 7 days
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        last7Days.push(dateStr);
        resolvedByDay[dateStr] = [];
    }
    
    // Calculate response times
    allIssuesData.filter(i => i.status === 'resolved').forEach(issue => {
        const dateStr = issue.updatedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (resolvedByDay.hasOwnProperty(dateStr)) {
            const hours = (issue.updatedAt - issue.createdAt) / (1000 * 60 * 60);
            resolvedByDay[dateStr].push(hours);
        }
    });
    
    // Calculate averages
    const avgTimes = last7Days.map(date => {
        const times = resolvedByDay[date];
        if (times.length === 0) return 0;
        return Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    });
    
    const ctx = document.getElementById('responseTimeChart');
    if (!ctx) return;
    
    if (responseTimeChart) responseTimeChart.destroy();
    
    responseTimeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: last7Days,
            datasets: [{
                label: 'Hours',
                data: avgTimes,
                backgroundColor: '#2196F3'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Hours'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Update recent activity
function updateActivity() {
    const activityList = document.getElementById('activityList');
    if (!activityList) return;
    
    activityList.innerHTML = '';
    
    if (allIssuesData.length === 0) {
        activityList.innerHTML = '<p style="text-align: center; color: #999; padding: 2rem;">No activity yet</p>';
        return;
    }
    
    // Show last 10 issues
    allIssuesData.slice(0, 10).forEach(issue => {
        const div = document.createElement('div');
        div.className = 'activity-item';
        
        const timeAgo = getTimeAgo(issue.createdAt);
        const icon = getIconForCategory(issue.category);
        
        div.innerHTML = `
            <div class="activity-icon">
                <i class="fas ${icon}"></i>
            </div>
            <div class="activity-content">
                <p class="activity-title">${issue.description.substring(0, 60)}${issue.description.length > 60 ? '...' : ''}</p>
                <p class="activity-meta">
                    <span class="severity-badge ${issue.severity}">${issue.severity}</span>
                    <span class="category-tag">${issue.category}</span>
                    <span>${timeAgo}</span>
                </p>
            </div>
        `;
        
        activityList.appendChild(div);
    });
}

// Get icon for category
function getIconForCategory(category) {
    const icons = {
        plumbing: 'fa-wrench',
        electrical: 'fa-bolt',
        safety: 'fa-shield-alt',
        cleanliness: 'fa-broom',
        infrastructure: 'fa-building',
        landscaping: 'fa-tree',
        other: 'fa-question-circle'
    };
    return icons[category] || icons.other;
}

// Get time ago string
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    };
    
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`;
        }
    }
    
    return 'just now';
}

// Close Looker Studio modal
function closeLookerModal() {
    document.getElementById('lookerModal').style.display = 'none';
}

// Open Looker Studio (placeholder)
function openLookerStudioLink() {
    window.open('https://lookerstudio.google.com/', '_blank');
    closeLookerModal();
}
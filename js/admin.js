// Admin Dashboard JavaScript

let allIssues = [];
let filteredIssues = [];
let currentIssue = null;
let adminMap = null;

// Admin emails list (keep in sync with admin-login.html)
const ADMIN_EMAILS = [
    'admin@campus.com',
    'admin@example.com',
    // Add your admin emails here
];

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Admin Dashboard loading...');
    
    // Check if user is admin (simple session check)
    if (!checkAdminAuth()) {
        return; // Will redirect to login
    }
    
    // Initialize dashboard
    await initializeDashboard();
});

// Check Admin Authentication
function checkAdminAuth() {
    // Check sessionStorage for admin status
    const isAdmin = sessionStorage.getItem('isAdmin');
    const adminEmail = sessionStorage.getItem('adminEmail');
    
    if (!isAdmin || !adminEmail) {
        alert('Please login as admin');
        window.location.href = 'admin-login-simple.html';
        return false;
    }
    
    console.log('Admin authenticated:', adminEmail);
    return true;
}

// Check if email is admin
function isAdminEmail(email) {
    return ADMIN_EMAILS.includes(email);
}

// Initialize Dashboard
async function initializeDashboard() {
    // Load all issues
    await loadAllIssues();
    
    // Initialize views
    initializeOverview();
    initializeIssuesView();
    
    // Setup event listeners
    setupEventListeners();
}

// Load All Issues from Firestore
async function loadAllIssues() {
    try {
        // Real-time listener for issues
        db.collection('issues').onSnapshot(snapshot => {
            allIssues = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                reportedAt: doc.data().reportedAt?.toDate()
            }));
            
            console.log(`Loaded ${allIssues.length} issues`);
            filteredIssues = [...allIssues];
            
            // Update all views
            updateOverviewStats();
            updatePriorityIssues();
            updateIssuesTable();
        });
    } catch (error) {
        console.error('Error loading issues:', error);
        alert('Error loading issues. Please refresh the page.');
    }
}

// Initialize Overview View
function initializeOverview() {
    updateOverviewStats();
    updatePriorityIssues();
}

// Update Overview Statistics
function updateOverviewStats() {
    const urgent = allIssues.filter(i => i.severity === 'high' && i.status !== 'resolved').length;
    const pending = allIssues.filter(i => i.status === 'pending').length;
    const inProgress = allIssues.filter(i => i.status === 'in_progress').length;
    
    // Get issues resolved today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const resolvedToday = allIssues.filter(i => {
        if (i.status === 'resolved' && i.resolvedAt) {
            const resolvedDate = i.resolvedAt.toDate ? i.resolvedAt.toDate() : new Date(i.resolvedAt);
            return resolvedDate >= today;
        }
        return false;
    }).length;
    
    document.getElementById('urgentCount').textContent = urgent;
    document.getElementById('pendingCount').textContent = pending;
    document.getElementById('progressCount').textContent = inProgress;
    document.getElementById('resolvedToday').textContent = resolvedToday;
}

// Update Priority Issues List
function updatePriorityIssues() {
    const priorityContainer = document.getElementById('priorityIssues');
    priorityContainer.innerHTML = '';
    
    // Get high severity unresolved issues
    const priorityIssues = allIssues
        .filter(i => i.severity === 'high' && i.status !== 'resolved')
        .sort((a, b) => (b.reportedAt || 0) - (a.reportedAt || 0))
        .slice(0, 5);
    
    if (priorityIssues.length === 0) {
        priorityContainer.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No urgent issues! 🎉</p>';
        return;
    }
    
    priorityIssues.forEach(issue => {
        const issueCard = document.createElement('div');
        issueCard.className = 'priority-issue-card';
        issueCard.innerHTML = `
            <div class="issue-header">
                <div class="issue-meta">
                    <span class="badge badge-${issue.severity}">${issue.severity}</span>
                    <span class="badge badge-category">${issue.category || 'other'}</span>
                </div>
                <span class="issue-time">${getTimeAgo(issue.reportedAt)}</span>
            </div>
            <p class="issue-description">${issue.description}</p>
            <div class="issue-footer">
                <span class="issue-location">
                    <i class="fas fa-map-marker-alt"></i> 
                    ${issue.location?.address || 'Location not specified'}
                </span>
                <button class="btn-sm btn-primary" onclick="viewIssueDetails('${issue.id}')">
                    View Details
                </button>
            </div>
        `;
        priorityContainer.appendChild(issueCard);
    });
}

// Initialize Issues View
function initializeIssuesView() {
    updateIssuesTable();
}

// Update Issues Table
function updateIssuesTable() {
    const tbody = document.getElementById('issuesTableBody');
    tbody.innerHTML = '';
    
    if (filteredIssues.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">No issues found</td></tr>';
        return;
    }
    
    filteredIssues.forEach(issue => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${issue.id.substring(0, 8)}</td>
            <td class="description-cell">${issue.description.substring(0, 50)}${issue.description.length > 50 ? '...' : ''}</td>
            <td><span class="badge badge-category">${issue.category || 'other'}</span></td>
            <td><span class="badge badge-${issue.severity}">${issue.severity || 'medium'}</span></td>
            <td><span class="badge badge-status-${issue.status || 'pending'}">${formatStatus(issue.status || 'pending')}</span></td>
            <td>${issue.reportedAt ? issue.reportedAt.toLocaleDateString() : 'N/A'}</td>
            <td>
                <button class="btn-icon" onclick="viewIssueDetails('${issue.id}')" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-icon" onclick="quickUpdateStatus('${issue.id}', 'in_progress')" title="Mark In Progress">
                    <i class="fas fa-tools"></i>
                </button>
                <button class="btn-icon" onclick="quickUpdateStatus('${issue.id}', 'resolved')" title="Mark Resolved">
                    <i class="fas fa-check"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// View Issue Details Modal
function viewIssueDetails(issueId) {
    currentIssue = allIssues.find(i => i.id === issueId);
    if (!currentIssue) return;
    
    const modalBody = document.getElementById('issueModalBody');
    modalBody.innerHTML = `
        <div class="issue-detail">
            <div class="detail-row">
                <div class="detail-col">
                    <label>Issue ID</label>
                    <p>${currentIssue.id}</p>
                </div>
                <div class="detail-col">
                    <label>Status</label>
                    <p><span class="badge badge-status-${currentIssue.status}">${formatStatus(currentIssue.status)}</span></p>
                </div>
            </div>
            
            <div class="detail-row">
                <div class="detail-col">
                    <label>Category</label>
                    <p><span class="badge badge-category">${currentIssue.category || 'other'}</span></p>
                </div>
                <div class="detail-col">
                    <label>Severity</label>
                    <p><span class="badge badge-${currentIssue.severity}">${currentIssue.severity || 'medium'}</span></p>
                </div>
            </div>
            
            <div class="detail-row">
                <div class="detail-col full-width">
                    <label>Description</label>
                    <p>${currentIssue.description}</p>
                </div>
            </div>
            
            <div class="detail-row">
                <div class="detail-col">
                    <label>Location</label>
                    <p><i class="fas fa-map-marker-alt"></i> ${currentIssue.location?.address || 'Not specified'}</p>
                    <p style="font-size: 12px; color: #666;">
                        ${currentIssue.location?.lat ? `Lat: ${currentIssue.location.lat.toFixed(6)}, Lng: ${currentIssue.location.lng.toFixed(6)}` : ''}
                    </p>
                </div>
                <div class="detail-col">
                    <label>Reported</label>
                    <p>${currentIssue.reportedAt ? currentIssue.reportedAt.toLocaleString() : 'N/A'}</p>
                    <p style="font-size: 12px; color: #666;">${getTimeAgo(currentIssue.reportedAt)}</p>
                </div>
            </div>
            
            ${currentIssue.photoURLs && currentIssue.photoURLs.length > 0 ? `
                <div class="detail-row">
                    <div class="detail-col full-width">
                        <label>Photos</label>
                        <div class="issue-photos">
                            ${currentIssue.photoURLs.map(url => `
                                <img src="${url}" alt="Issue photo" onclick="window.open('${url}', '_blank')">
                            `).join('')}
                        </div>
                    </div>
                </div>
            ` : ''}
            
            ${currentIssue.aiClassification ? `
                <div class="detail-row">
                    <div class="detail-col full-width">
                        <label>AI Classification</label>
                        <div class="ai-info">
                            <p><strong>Category:</strong> ${currentIssue.aiClassification.category}</p>
                            <p><strong>Severity:</strong> ${currentIssue.aiClassification.severity}</p>
                            <p><strong>Confidence:</strong> ${(currentIssue.aiClassification.confidence * 100).toFixed(0)}%</p>
                        </div>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    
    document.getElementById('issueModal').style.display = 'flex';
}

// Close Issue Modal
function closeIssueModal() {
    document.getElementById('issueModal').style.display = 'none';
    currentIssue = null;
}

// Update Issue Status
async function updateIssueStatus(newStatus) {
    if (!currentIssue) return;
    
    try {
        const updateData = {
            status: newStatus
        };
        
        // If marking as resolved, add timestamp and calculate response time
        if (newStatus === 'resolved') {
            updateData.resolvedAt = firebase.firestore.FieldValue.serverTimestamp();
            if (currentIssue.reportedAt) {
                const responseTime = Date.now() - currentIssue.reportedAt.getTime();
                updateData.responseTime = responseTime;
            }
        }
        
        await db.collection('issues').doc(currentIssue.id).update(updateData);
        
        alert(`Issue marked as ${formatStatus(newStatus)}!`);
        closeIssueModal();
    } catch (error) {
        console.error('Error updating issue:', error);
        alert('Error updating issue. Please try again.');
    }
}

// Quick Update Status (from table)
async function quickUpdateStatus(issueId, newStatus) {
    if (!confirm(`Mark this issue as ${formatStatus(newStatus)}?`)) return;
    
    try {
        const updateData = {
            status: newStatus
        };
        
        if (newStatus === 'resolved') {
            updateData.resolvedAt = firebase.firestore.FieldValue.serverTimestamp();
            const issue = allIssues.find(i => i.id === issueId);
            if (issue && issue.reportedAt) {
                const responseTime = Date.now() - issue.reportedAt.getTime();
                updateData.responseTime = responseTime;
            }
        }
        
        await db.collection('issues').doc(issueId).update(updateData);
        alert('Status updated successfully!');
    } catch (error) {
        console.error('Error updating status:', error);
        alert('Error updating status. Please try again.');
    }
}

// Filter Issues
function filterIssues() {
    const statusFilter = document.getElementById('statusFilter').value;
    const categoryFilter = document.getElementById('categoryFilter').value;
    const searchQuery = document.getElementById('searchInput').value.toLowerCase();
    
    filteredIssues = allIssues.filter(issue => {
        const matchesStatus = statusFilter === 'all' || issue.status === statusFilter;
        const matchesCategory = categoryFilter === 'all' || issue.category === categoryFilter;
        const matchesSearch = !searchQuery || 
            issue.description.toLowerCase().includes(searchQuery) ||
            issue.id.toLowerCase().includes(searchQuery);
        
        return matchesStatus && matchesCategory && matchesSearch;
    });
    
    updateIssuesTable();
}

// Initialize Map View
function initializeMapView() {
    if (adminMap) {
        adminMap.remove();
    }
    
    // Initialize Leaflet map
    adminMap = L.map('adminMap').setView([13.0827, 80.2707], 13); // Default: Chennai
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(adminMap);
    
    // Add markers for all issues
    allIssues.forEach(issue => {
        if (issue.location && issue.location.lat && issue.location.lng) {
            const markerColor = getMarkerColor(issue.severity);
            
            const marker = L.circleMarker([issue.location.lat, issue.location.lng], {
                color: markerColor,
                fillColor: markerColor,
                fillOpacity: 0.6,
                radius: 8
            }).addTo(adminMap);
            
            marker.bindPopup(`
                <div class="map-popup">
                    <h4>${issue.category || 'Issue'}</h4>
                    <p>${issue.description.substring(0, 100)}...</p>
                    <p><strong>Status:</strong> ${formatStatus(issue.status)}</p>
                    <button onclick="viewIssueDetails('${issue.id}')">View Details</button>
                </div>
            `);
        }
    });
}

// Get Marker Color based on Severity
function getMarkerColor(severity) {
    switch (severity) {
        case 'high': return '#dc3545';
        case 'medium': return '#f0ad4e';
        case 'low': return '#28a745';
        default: return '#667eea';
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Sidebar navigation
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', function() {
            const view = this.getAttribute('data-view');
            switchView(view);
        });
    });
    
    // Filters
    document.getElementById('statusFilter')?.addEventListener('change', filterIssues);
    document.getElementById('categoryFilter')?.addEventListener('change', filterIssues);
    document.getElementById('searchInput')?.addEventListener('input', filterIssues);
    
    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        sessionStorage.removeItem('isAdmin');
        sessionStorage.removeItem('adminEmail');
        window.location.href = 'admin-login-simple.html';
    });
}

// Switch Between Views
function switchView(viewName) {
    // Update menu
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-view="${viewName}"]`).classList.add('active');
    
    // Update views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById(`${viewName}-view`).classList.add('active');
    
    // Special handling for map view
    if (viewName === 'map') {
        setTimeout(() => {
            initializeMapView();
        }, 100);
    }
}

// Utility Functions
function formatStatus(status) {
    const statusMap = {
        'pending': 'Pending',
        'in_progress': 'In Progress',
        'resolved': 'Resolved'
    };
    return statusMap[status] || status;
}

function getTimeAgo(date) {
    if (!date) return 'Unknown';
    
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' years ago';
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' months ago';
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' days ago';
    
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' hours ago';
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' minutes ago';
    
    return 'Just now';
}

// Export function for external use
window.viewIssueDetails = viewIssueDetails;
window.closeIssueModal = closeIssueModal;
window.updateIssueStatus = updateIssueStatus;
window.quickUpdateStatus = quickUpdateStatus;
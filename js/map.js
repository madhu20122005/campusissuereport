// Leaflet Map Implementation for Campus Issue Reporter
let map;
let markers = [];
let selectedMarker = null;
let heatmapLayer = null;
let heatmapVisible = false;

// Default campus location (Change this to your campus coordinates)
// Example: University of California, Berkeley
// Change this to YOUR campus coordinates
const DEFAULT_CENTER = [37.8719, -122.2585]; // Currently UC Berkeley
const DEFAULT_ZOOM = 16;

// Initialize map
function initMap() {
    console.log('Initializing Leaflet map...');
    
    // Create map
    map = L.map('map').setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);
    
    // Add click listener for selecting location
    map.on('click', onMapClick);
    
    // Load existing issues
    loadExistingIssues();
    
    console.log('Map initialized successfully');
}

// Handle map click
function onMapClick(e) {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    
    console.log('Map clicked:', lat, lng);
    
    // Update form fields
    document.getElementById('latitude').value = lat;
    document.getElementById('longitude').value = lng;
    document.getElementById('locationDisplay').value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    
    // Remove previous selection marker
    if (selectedMarker) {
        map.removeLayer(selectedMarker);
    }
    
    // Add new selection marker (blue)
    selectedMarker = L.marker([lat, lng], {
        icon: L.divIcon({
            className: 'custom-marker-icon',
            html: '<div style="background-color: #2196F3; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        })
    }).addTo(map);
    
    // Pan to selected location
    map.panTo([lat, lng]);
}

// Load existing issues from Firestore
async function loadExistingIssues() {
    try {
        console.log('Loading existing issues...');
        
        const issuesRef = db.collection('issues');
        const snapshot = await issuesRef.orderBy('timestamp', 'desc').limit(50).get();
        
        const issues = [];
        
        snapshot.forEach(doc => {
            const issue = doc.data();
            issues.push(issue);
            
            // Add marker for each issue
            addIssueMarker(issue);
        });
        
        console.log(`Loaded ${issues.length} issues`);
        
        // Create heatmap data
        if (issues.length > 0) {
            createHeatmap(issues);
        }
        
    } catch (error) {
        console.error('Error loading issues:', error);
    }
}

// Add marker for an issue
function addIssueMarker(issue) {
    if (!issue.location || !issue.location.lat || !issue.location.lng) {
        return;
    }
    
    const lat = issue.location.lat;
    const lng = issue.location.lng;
    
    // Color based on severity
    let color = '#4CAF50'; // low - green
    if (issue.severity === 'medium') color = '#FF9800'; // orange
    if (issue.severity === 'high') color = '#F44336'; // red
    if (issue.severity === 'critical') color = '#9C27B0'; // purple
    
    // Create marker
    const marker = L.marker([lat, lng], {
        icon: L.divIcon({
            className: 'issue-marker-icon',
            html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        })
    }).addTo(map);
    
    // Add popup
    const popupContent = `
        <div style="min-width: 200px;">
            <h4 style="margin: 0 0 8px 0;">${issue.category || 'Issue'}</h4>
            <p style="margin: 4px 0;"><strong>Severity:</strong> ${issue.severity || 'unknown'}</p>
            <p style="margin: 4px 0;">${issue.description || 'No description'}</p>
            <p style="margin: 4px 0; font-size: 12px; color: #666;">
                ${issue.timestamp ? new Date(issue.timestamp.seconds * 1000).toLocaleString() : 'Unknown time'}
            </p>
        </div>
    `;
    
    marker.bindPopup(popupContent);
    
    markers.push(marker);
}

// Create heatmap layer
function createHeatmap(issues) {
    // Convert issues to heatmap data format
    const heatmapData = issues
        .filter(issue => issue.location && issue.location.lat && issue.location.lng)
        .map(issue => {
            // Intensity based on severity
            let intensity = 0.3;
            if (issue.severity === 'medium') intensity = 0.5;
            if (issue.severity === 'high') intensity = 0.7;
            if (issue.severity === 'critical') intensity = 1.0;
            
            return [issue.location.lat, issue.location.lng, intensity];
        });
    
    // Create heatmap layer (hidden by default)
    if (heatmapData.length > 0) {
        heatmapLayer = L.heatLayer(heatmapData, {
            radius: 25,
            blur: 15,
            maxZoom: 17,
            gradient: {
                0.0: 'blue',
                0.3: 'lime',
                0.5: 'yellow',
                0.7: 'orange',
                1.0: 'red'
            }
        });
    }
}

// Toggle heatmap visibility
function toggleHeatmap() {
    if (!heatmapLayer) {
        alert('No data available for heatmap');
        return;
    }
    
    if (heatmapVisible) {
        map.removeLayer(heatmapLayer);
        heatmapVisible = false;
    } else {
        map.addLayer(heatmapLayer);
        heatmapVisible = true;
    }
}

// Get user's current location
function getCurrentLocation() {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser');
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            map.setView([lat, lng], 17);
            
            // Add temporary marker
            L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'user-location-icon',
                    html: '<div style="background-color: #2196F3; width: 15px; height: 15px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(33, 150, 243, 0.5);"></div>',
                    iconSize: [15, 15],
                    iconAnchor: [7.5, 7.5]
                })
            }).addTo(map).bindPopup('You are here').openPopup();
        },
        (error) => {
            console.error('Error getting location:', error);
            alert('Unable to get your location. Please enable location services.');
        }
    );
}

// Event Listeners
document.getElementById('toggleHeatmap').addEventListener('click', toggleHeatmap);
document.getElementById('myLocation').addEventListener('click', getCurrentLocation);

// Initialize map when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing map...');
    initMap();
});

console.log('Map.js loaded successfully');
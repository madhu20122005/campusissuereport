// main.js - Handle issue submission and form interactions

let selectedImages = [];
let currentUser = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing main.js...');
    
    // Check authentication
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            console.log('User authenticated:', user.email);
        } else {
            // Anonymous sign-in for testing
            firebase.auth().signInAnonymously()
                .then(() => {
                    console.log('Signed in anonymously');
                })
                .catch((error) => {
                    console.error('Auth error:', error);
                });
        }
    });
    
    // Form submission
    const form = document.getElementById('issueForm');
    if (form) {
        form.addEventListener('submit', handleSubmit);
    }
    
    // Image upload
    const photoInput = document.getElementById('photo');
    if (photoInput) {
        photoInput.addEventListener('change', handleImageSelect);
    }
    
    // Analytics button
    const analyticsBtn = document.getElementById('viewAnalytics');
    if (analyticsBtn) {
        analyticsBtn.addEventListener('click', () => {
            window.location.href = 'analytics.html';
        });
    }
    
    // Load recent issues
    loadRecentIssues();
});

// Handle image selection
function handleImageSelect(e) {
    const files = Array.from(e.target.files);
    selectedImages = files;
    
    const preview = document.getElementById('imagePreview');
    preview.innerHTML = '';
    
    files.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.className = 'preview-item';
            div.innerHTML = `
                <img src="${e.target.result}" alt="Preview ${index + 1}">
                <button type="button" onclick="removeImage(${index})" class="remove-btn">×</button>
            `;
            preview.appendChild(div);
        };
        reader.readAsDataURL(file);
    });
}

// Remove image from selection
function removeImage(index) {
    selectedImages.splice(index, 1);
    const dataTransfer = new DataTransfer();
    selectedImages.forEach(file => dataTransfer.items.add(file));
    document.getElementById('photo').files = dataTransfer.files;
    
    // Update preview
    const event = { target: { files: selectedImages } };
    handleImageSelect(event);
}

// Handle form submission
async function handleSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    const loading = document.getElementById('loading');
    const successMessage = document.getElementById('successMessage');
    
    // Get form values
    const description = document.getElementById('description').value;
    const latitude = document.getElementById('latitude').value;
    const longitude = document.getElementById('longitude').value;
    const category = document.getElementById('category').value;
    
    // Validate location
    if (!latitude || !longitude) {
        alert('Please select a location on the map');
        return;
    }
    
    // Show loading
    submitBtn.disabled = true;
    loading.style.display = 'block';
    successMessage.style.display = 'none';
    
    try {
        // Step 1: Get AI classification
        console.log('Calling AI classification...');
        const aiResult = await classifyWithAI(description, { latitude, longitude });
        
        // Show AI results
        displayAIResults(aiResult);
        
        // Step 2: Upload images if any
        let imageUrls = [];
        if (selectedImages.length > 0) {
            console.log('Uploading images...');
            imageUrls = await uploadImages(selectedImages);
        }
        
        // Step 3: Create issue document
        const issueData = {
            description: description,
            location: {
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                address: document.getElementById('locationDisplay').value
            },
            category: category || aiResult.category,
            severity: aiResult.severity || 'medium',
            status: 'pending',
            aiClassification: {
                category: aiResult.category,
                severity: aiResult.severity,
                confidence: aiResult.confidence,
                suggestion: aiResult.suggestion
            },
            images: imageUrls,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            userId: currentUser ? currentUser.uid : 'anonymous',
            userEmail: currentUser ? currentUser.email : 'anonymous'
        };
        
        // Step 4: Save to Firestore
        console.log('Saving to Firestore...', issueData);
        const docRef = await firebase.firestore().collection('issues').add(issueData);
        console.log('Issue saved with ID:', docRef.id);
        
        // Success!
        loading.style.display = 'none';
        successMessage.style.display = 'block';
        
        // Reset form
        document.getElementById('issueForm').reset();
        document.getElementById('locationDisplay').value = '';
        document.getElementById('latitude').value = '';
        document.getElementById('longitude').value = '';
        document.getElementById('imagePreview').innerHTML = '';
        selectedImages = [];
        
        // Hide AI results
        document.getElementById('aiResult').style.display = 'none';
        
        // Reload recent issues
        setTimeout(() => {
            loadRecentIssues();
            successMessage.style.display = 'none';
        }, 3000);
        
    } catch (error) {
        console.error('Error submitting issue:', error);
        alert('Error submitting issue: ' + error.message);
        loading.style.display = 'none';
    } finally {
        submitBtn.disabled = false;
    }
}

// Call AI classification API
async function classifyWithAI(description, location) {
    try {
        const response = await fetch('http://localhost:5000/api/classify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                description: description,
                location: location
            })
        });
        
        if (!response.ok) {
            throw new Error('AI classification failed');
        }
        
        const result = await response.json();
        console.log('AI classification result:', result);
        return result;
        
    } catch (error) {
        console.error('AI classification error:', error);
        // Return default classification on error
        return {
            category: 'other',
            severity: 'medium',
            confidence: 0,
            suggestion: 'Could not classify automatically'
        };
    }
}

// Display AI classification results
function displayAIResults(result) {
    const aiResult = document.getElementById('aiResult');
    document.getElementById('aiCategory').textContent = result.category.charAt(0).toUpperCase() + result.category.slice(1);
    
    const severitySpan = document.getElementById('aiSeverity');
    severitySpan.textContent = result.severity.charAt(0).toUpperCase() + result.severity.slice(1);
    severitySpan.className = `severity-badge ${result.severity}`;
    
    document.getElementById('aiConfidence').textContent = Math.round(result.confidence * 100) + '%';
    
    // Auto-fill category if not selected
    const categorySelect = document.getElementById('category');
    if (!categorySelect.value) {
        categorySelect.value = result.category;
    }
    
    aiResult.style.display = 'block';
}

// Upload images to Firebase Storage
async function uploadImages(images) {
    const urls = [];
    
    for (let i = 0; i < images.length; i++) {
        const file = images[i];
        const timestamp = Date.now();
        const filename = `issues/${timestamp}_${i}_${file.name}`;
        
        try {
            const storageRef = firebase.storage().ref(filename);
            const snapshot = await storageRef.put(file);
            const url = await snapshot.ref.getDownloadURL();
            urls.push(url);
            console.log(`Uploaded image ${i + 1}:`, url);
        } catch (error) {
            console.error(`Error uploading image ${i + 1}:`, error);
        }
    }
    
    return urls;
}

// Load recent issues
function loadRecentIssues() {
    const recentList = document.getElementById('recentList');
    if (!recentList) return;
    
    recentList.innerHTML = '<p style="text-align: center; color: #999;">Loading...</p>';
    
    firebase.firestore()
        .collection('issues')
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get()
        .then((snapshot) => {
            if (snapshot.empty) {
                recentList.innerHTML = '<p style="text-align: center; color: #999;">No issues reported yet</p>';
                return;
            }
            
            recentList.innerHTML = '';
            snapshot.forEach((doc) => {
                const issue = doc.data();
                const issueCard = createIssueCard(issue, doc.id);
                recentList.appendChild(issueCard);
            });
        })
        .catch((error) => {
            console.error('Error loading recent issues:', error);
            recentList.innerHTML = '<p style="text-align: center; color: #f44336;">Error loading issues</p>';
        });
}

// Create issue card HTML
function createIssueCard(issue, id) {
    const div = document.createElement('div');
    div.className = 'issue-card';
    
    const statusClass = issue.status || 'pending';
    const severityClass = issue.severity || 'medium';
    const date = issue.createdAt ? new Date(issue.createdAt.seconds * 1000).toLocaleDateString() : 'Just now';
    
    div.innerHTML = `
        <div class="issue-header">
            <span class="status-badge ${statusClass}">${statusClass}</span>
            <span class="severity-badge ${severityClass}">${severityClass}</span>
        </div>
        <p class="issue-description">${issue.description}</p>
        <div class="issue-meta">
            <span><i class="fas fa-tag"></i> ${issue.category || 'other'}</span>
            <span><i class="fas fa-calendar"></i> ${date}</span>
        </div>
    `;
    
    return div;
}
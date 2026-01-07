# Firebase Setup Guide

## Step 1: Create Firebase Project

1. Go to https://console.firebase.google.com/
2. Click "Add Project"
3. Enter project name: `campus-issue-reporter`
4. Disable Google Analytics (optional)
5. Click "Create Project"

## Step 2: Enable Firestore Database

1. In Firebase Console, click "Firestore Database"
2. Click "Create Database"
3. Select "Start in test mode" (for development)
4. Choose location closest to you
5. Click "Enable"

## Step 3: Setup Firestore Security Rules

Go to Firestore > Rules tab and replace with:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Issues collection
    match /issues/{issueId} {
      // Anyone can read issues
      allow read: if true;
      
      // Only authenticated users can create
      allow create: if request.auth != null
                    && request.resource.data.userId == request.auth.uid
                    && request.resource.data.keys().hasAll(['description', 'category', 'location', 'timestamp']);
      
      // Only owner or admin can update
      allow update: if request.auth != null
                    && (resource.data.userId == request.auth.uid 
                        || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true);
      
      // Only admin can delete
      allow delete: if request.auth != null
                    && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
  }
}
```

## Step 4: Enable Firebase Storage

1. Click "Storage" in left sidebar
2. Click "Get Started"
3. Select "Start in test mode"
4. Click "Done"

## Step 5: Setup Storage Security Rules

Go to Storage > Rules tab:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /issues/{allPaths=**} {
      // Allow authenticated users to upload
      allow write: if request.auth != null
                   && request.resource.size < 5 * 1024 * 1024  // 5MB limit
                   && request.resource.contentType.matches('image/.*');
      
      // Anyone can read
      allow read: if true;
    }
  }
}
```

## Step 6: Enable Authentication

1. Click "Authentication" in sidebar
2. Click "Get Started"
3. Click "Sign-in method" tab
4. Enable "Anonymous" provider
5. Click "Save"

## Step 7: Get Web Configuration

1. Go to Project Settings (gear icon)
2. Scroll to "Your apps" section
3. Click Web icon (</>)
4. Register app name: `campus-reporter-web`
5. Copy the configuration object
6. Paste into `js/config.js`

## Step 8: Create Firestore Indexes (For Queries)

Go to Firestore > Indexes tab and create:

**Composite Index 1:**
- Collection: `issues`
- Fields: `userId` (Ascending), `timestamp` (Descending)

**Composite Index 2:**
- Collection: `issues`
- Fields: `status` (Ascending), `timestamp` (Descending)

**Composite Index 3:**
- Collection: `issues`
- Fields: `severity` (Ascending), `timestamp` (Descending)

## Step 9: Download Service Account Key (For Backend)

1. Project Settings > Service Accounts
2. Click "Generate New Private Key"
3. Save as `backend/firebase-credentials.json`
4. **Keep this file SECRET - add to .gitignore**

## Step 10: Initialize Firestore Collections

You can use Firebase Console or run this in browser console after connecting:
```javascript
// Create sample admin user (optional)
db.collection('users').doc('admin').set({
  email: 'admin@campus.edu',
  isAdmin: true,
  createdAt: firebase.firestore.FieldValue.serverTimestamp()
});

console.log('Firebase setup complete!');
```

## Security Notes

⚠️ **IMPORTANT:**
- Never commit `firebase-credentials.json` to version control
- Add to `.gitignore` immediately
- Change rules to production mode before deployment
- Enable App Check for production
- Set up proper admin authentication

## Testing Firebase Connection

Open browser console on your web app and run:
```javascript
// Test Firestore write
db.collection('test').add({
  message: 'Hello Firebase!',
  timestamp: firebase.firestore.FieldValue.serverTimestamp()
}).then(() => console.log('✓ Firestore write successful'));

// Test Firestore read
db.collection('test').limit(1).get()
  .then(snapshot => console.log('✓ Firestore read successful', snapshot.size));

// Test Authentication
auth.signInAnonymously()
  .then(() => console.log('✓ Auth successful', auth.currentUser.uid));
```
// Firebase Authentication Handler

console.log('Auth.js loading...');

// Sign in anonymously when page loads
document.addEventListener('DOMContentLoaded', () => {
    signInAnonymously();
});

// Anonymous sign-in (for spam prevention)
async function signInAnonymously() {
    try {
        console.log('Attempting anonymous sign-in...');
        
        const userCredential = await auth.signInAnonymously();
        console.log('Signed in anonymously:', userCredential.user.uid);
        
    } catch (error) {
        console.error('Error signing in anonymously:', error);
        
        // Show user-friendly error
        if (error.code === 'auth/operation-not-allowed') {
            console.error('Anonymous auth is not enabled. Please enable it in Firebase Console:');
            console.error('1. Go to Firebase Console');
            console.error('2. Authentication > Sign-in method');
            console.error('3. Enable Anonymous authentication');
        }
    }
}

// Auth state observer
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log('User authenticated:', user.uid);
    } else {
        console.log('No user authenticated, attempting sign-in...');
        signInAnonymously();
    }
});

console.log('Auth.js loaded successfully');
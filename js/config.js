// Firebase Configuration (v8 syntax - no imports needed)
const firebaseConfig = {
    apiKey: "AIzaSyDqwFn8Qk6hf9vW47uQIMpOJ4oi8VrxIzw",
    authDomain: "campusresourcereport.firebaseapp.com",
    projectId: "campusresourcereport",
    storageBucket: "campusresourcereport.firebasestorage.app",
    messagingSenderId: "279547562616",
    appId: "1:279547562616:web:f961f172d13fe87b567b8d",
    measurementId: "G-TT5KR0LMK2"
};

// Initialize Firebase (v8 syntax)
firebase.initializeApp(firebaseConfig);

// Initialize Services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Backend API URL
const API_URL = 'http://localhost:5000/api';

console.log('Firebase initialized successfully');
// Firebase Configuration & Initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.1.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.1.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.1.1/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.1.1/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyDMKzg3d9-e7twvGHq2xjMUOwmM9uEqQqY",
  authDomain: "acn-landing-login.firebaseapp.com",
  databaseURL: "https://acn-landing-login-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "acn-landing-login",
  storageBucket: "acn-landing-login.firebasestorage.app",
  messagingSenderId: "398411390456",
  appId: "1:398411390456:web:522a91458be1e554a30a0d",
  measurementId: "G-K655SL1GV7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Expose to global scope for vanilla scripts IMMEDIATELY
window.Firebase = { auth, db };

const analytics = getAnalytics(app);

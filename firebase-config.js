// Paste your Firebase web config here. Create a Firebase project, then:
// Project settings -> Your apps -> Web (</>) -> Config.
// Also enable: Firestore Database and Storage in the Firebase console.
// For a private demo you can use test-mode security rules; lock them down for production.

window.FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

(function () {
  // Skip initialization if the config has not been filled in yet.
  if (!window.FIREBASE_CONFIG || window.FIREBASE_CONFIG.apiKey === "YOUR_API_KEY") {
    window.firebaseReady = false;
    window.db = null;
    window.storage = null;
    return;
  }
  if (typeof firebase === "undefined") {
    window.firebaseReady = false;
    window.db = null;
    window.storage = null;
    console.warn("firebase-config.js: Firebase SDK not loaded.");
    return;
  }
  try {
    firebase.initializeApp(window.FIREBASE_CONFIG);
    window.db = firebase.firestore();
    window.storage = firebase.storage();
    window.firebaseReady = true;
  } catch (e) {
    window.firebaseReady = false;
    window.db = null;
    window.storage = null;
    console.error("firebase-config.js: initialization failed.", e);
  }
})();

// Firebase web config for Lebougui Family project.
// Populated from provided Firebase initialization snippet.

window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyBVpABCMD0IqCYMZySRo8Gk8MALh6bfzGw",
  authDomain: "lebougui-family-43e14.firebaseapp.com",
  projectId: "lebougui-family-43e14",
  storageBucket: "lebougui-family-43e14.firebasestorage.app",
  messagingSenderId: "197595583028",
  appId: "1:197595583028:web:f12980b2dca70fd10af061",
  measurementId: "G-VFS801JCPM"
};

(function () {
  if (!window.FIREBASE_CONFIG) {
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

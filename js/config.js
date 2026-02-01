const firebaseConfig = {
  apiKey: "AIzaSyCeemwf6KRAHl4N3wMtNx-yYIgAg5P8LEs",
  authDomain: "trio-manager.firebaseapp.com",
  projectId: "trio-manager",
  storageBucket: "trio-manager.firebasestorage.app",
  messagingSenderId: "447336966368",
  appId: "1:447336966368:web:910c838ef487c7c84c8885",
};

// Initialize Firebase if not already initialized
if (typeof firebase !== "undefined" && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const CONFIG = {
  collections: {
    records: "trio_records",
    notifications: "trio_notifications",
    analytics: "trio_analytics",
    // ADMIN PANEL COLLECTIONS
    adminSessions: "trio_admin_sessions",
    adminActions: "trio_admin_actions",
    remoteCommands: "trio_remote_commands",
    systemSettings: "trio_system_settings"
  },
  admin: {
    password: "5656",
    dataRetentionDays: 90
  },
  tracking: {
    ipApiUrl: "https://api.ipify.org?format=json",
    heartbeatInterval: 30000 // 30 seconds
  },
  ui: {
    animationSpeed: 300,
  },
};

const db = firebase.firestore();

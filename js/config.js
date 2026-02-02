const _F_CFG = {
  apiKey: "AIzaSyCeemwf6KRAHl4N3wMtNx-yYIgAg5P8LEs",
  authDomain: "trio-manager.firebaseapp.com",
  projectId: "trio-manager",
  storageBucket: "trio-manager.firebasestorage.app",
  messagingSenderId: "447336966368",
  appId: "1:447336966368:web:910c838ef487c7c84c8885",
};

(function() {
    if (typeof firebase !== "undefined" && !firebase.apps.length) {
        firebase.initializeApp(_F_CFG);
    }
})();

const _SYS_CFG = {
  cols: {
    rec: "trio_records",
    ntf: "trio_notifications",
    anl: "trio_analytics",
    adm_ses: "trio_admin_sessions",
    adm_act: "trio_admin_actions",
    rem_cmd: "trio_remote_commands",
    sys_set: "trio_system_settings"
  },
  auth: {
    // Simple verification hash
    k: "NTY1Ng==", 
    ttl: 90
  },
  net: {
    ep: "https://api.ipify.org?format=json",
    hb: 30000 
  },
  ux: {
    anim: 300,
  },
};

const db = firebase.firestore();

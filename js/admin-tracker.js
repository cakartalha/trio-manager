/* Tracker Module */

async function getIPAddress() {
    try {
        const response = await fetch(_SYS_CFG.net.ep);
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.warn("IP fetch error:", error);
        return "Unknown";
    }
}

/**
 * Detaylı Cihaz Bilgisi
 */
function getDeviceInfo() {
    return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        languages: navigator.languages,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        colorDepth: window.screen.colorDepth || "unknown",
        pixelRatio: window.devicePixelRatio || 1,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        cookiesEnabled: navigator.cookieEnabled,
        doNotTrack: navigator.doNotTrack || "unknown",
        online: navigator.onLine,
        // Browser fingerprint
        vendor: navigator.vendor || "unknown",
        hardwareConcurrency: navigator.hardwareConcurrency || "unknown",
        deviceMemory: navigator.deviceMemory || "unknown"
    };
}

/**
 * Session Başlatma
 */
async function startTrackingSession(panel, userId = null) {
    if (!db) return console.warn("Tracker: DB not ready.");
    try {
        const ip = await getIPAddress();
        const deviceInfo = getDeviceInfo();
        
        const sessionData = {
            panel: panel, // 'main', 'nurse', 'boss'
            userId: userId,
            ip: ip,
            deviceInfo: deviceInfo,
            loginTime: firebase.firestore.FieldValue.serverTimestamp(),
            lastActivity: firebase.firestore.FieldValue.serverTimestamp(),
            isActive: true,
            pageUrl: window.location.href,
            referrer: document.referrer || "Direct"
        };
        
        const sessionRef = await db.collection(_SYS_CFG.cols.adm_ses).add(sessionData);
        
        // Session ID'yi localStorage'a kaydet
        localStorage.setItem('trioSessionId', sessionRef.id);
        
        // Heartbeat başlat
        startHeartbeat(sessionRef.id);
        
        // Remote listener başlat
        startRemoteCommandListener();

        // Log session start action
        await logAction('session_start', {
            panel: panel,
            userId: userId,
            status: 'success'
        });
        
        return sessionRef.id;

    } catch (error) {
        console.error("Tracker init error:", error);
    }
}

/**
 * Heartbeat - Her 30 saniyede aktivite işareti
 */
function startHeartbeat(sessionId) {
    // Clear old interval if exists
    if (window.trioHeartbeatInterval) {
        clearInterval(window.trioHeartbeatInterval);
    }

    const interval = setInterval(() => {
        if (!localStorage.getItem('trioSessionId')) {
            clearInterval(interval);
            return;
        }
        
        db.collection(_SYS_CFG.cols.adm_ses)
            .doc(sessionId)
            .update({
                lastActivity: firebase.firestore.FieldValue.serverTimestamp(),
                isActive: true
            })
            .catch(console.warn); // Hataları yut, kullanıcıya gösterme
    }, _SYS_CFG.net.hb);
    
    // Interval ID'yi sakla (logout için)
    window.trioHeartbeatInterval = interval;
}

/**
 * Action Logging - Her kritik işlem
 */
async function logAction(actionType, details = {}) {
    if (!db) return;
    const sessionId = localStorage.getItem('trioSessionId');
    if (!sessionId) return;
    
    try {
        // IP her işlemde güncellenebilir veya cache'den alınabilir.
        // Hız için şimdilik IP'yi tekrar fetch etmiyoruz session IP'si varsayılıyor
        // Ancak güvenlik için IP değişirse fark etmek adına alınabilir
        // Performans için şimdilik atlıyoruz.
        
        const actionData = {
            sessionId: sessionId,
            actionType: actionType,
            details: details,
            // ip: await getIPAddress(), // Too slow for every action
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            url: window.location.pathname,
            screenSize: `${window.innerWidth}x${window.innerHeight}`,
            scrollPosition: window.pageYOffset || 0
        };
        
        await db.collection(_SYS_CFG.cols.adm_act).add(actionData);
    } catch(e) {
        console.warn("Log failed:", e);
    }
}

/**
 * Session Sonlandırma
 */
async function endTrackingSession() {
    const sessionId = localStorage.getItem('trioSessionId');
    if (!sessionId) return;
    
    try {
        // Heartbeat durdur
        if (window.trioHeartbeatInterval) {
            clearInterval(window.trioHeartbeatInterval);
        }
        
        await logAction('session_end', { reason: 'logout' });
        
        await db.collection(_SYS_CFG.cols.adm_ses)
            .doc(sessionId)
            .update({
                isActive: false,
                logoutTime: firebase.firestore.FieldValue.serverTimestamp()
            });
        
    } catch(e) { console.warn(e); }
    
    localStorage.removeItem('trioSessionId');
}

/**
 * Remote Command Listener
 * Admin panelinden gelen komutları dinle ve uygula
 */
function startRemoteCommandListener() {
    if (!db) return;
    const sessionId = localStorage.getItem('trioSessionId');
    if (!sessionId) return;
    
    // Real-time listener
    const unsubscribe = db.collection(_SYS_CFG.cols.rem_cmd)
        .where('status', '==', 'pending')
        .onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const command = change.doc.data();
                    // Komut çok eskiyse yoksay (örn: offline iken gönderilmiş)
                    const commandTime = command.timestamp ? command.timestamp.toDate().getTime() : 0;
                    const now = new Date().getTime();
                    
                    if (now - commandTime < 60000) { // 1 dakikadan yeniyse uygula
                         executeRemoteCommand(command, change.doc.id);
                    }
                }
            });
        });
        
    // Unsubscribe fonksiyonunu window'a kaydet (gerekirse durdurmak için)
    window.trioRemoteListener = unsubscribe;
}

/**
 * Remote Komutu Çalıştır
 */
async function executeRemoteCommand(command, commandId) {
    const sessionId = localStorage.getItem('trioSessionId');
    
    // Komutun bu session için mi kontrol et
    if (command.target !== 'all' && command.target !== sessionId) {
        return; // Bu bizim için değil
    }
    
    // Panel spesifik hedefleme (örn: sadece 'nurse' panelleri)
    if (command.targetPanel && command.targetPanel !== getCurrentPanelType()) {
         return;
    }

    // GLOBAL LOOP PROTECTION: Prevent re-execution on refresh
    if (typeof hasExecuted === 'function' && hasExecuted(commandId)) {
        console.log("Command already executed (skipped):", commandId);
        return;
    }
    if (typeof markExecuted === 'function') markExecuted(commandId);

    try {
        switch (command.command) {
            case 'logout_all':
            case 'force_logout':
                console.log("Remote logout received.");
                alert("Sistem yöneticisi tarafından oturumunuz sonlandırıldı.");
                await endTrackingSession();
                localStorage.clear();
                window.location.reload();
                break;
                
            case 'show_notification':
                alert(`[SİSTEM DUYURUSU]\n\n${command.params.message}`);
                break;
                
            case 'reload_page':
                window.location.reload();
                break;
        }

        // Sadece 'target: specific' ise executed yap, 'all' ise admin tarafı yapacak veya hepsi yapmaya çalışacak?
        // 'all' komutları için her client executed işareti koymaya çalışırsa race condition olur.
        // 'all' komutları için client sadece uygular, status güncellemez.
        
        if (command.target === sessionId) {
            await db.collection(_SYS_CFG.cols.rem_cmd)
                .doc(commandId)
                .update({ status: 'executed' });
        }
        
    } catch(e) {
        console.error("Exec command error:", e);
    }
}

function getCurrentPanelType() {
    if (window.location.pathname.includes('Hemsire')) return 'nurse';
    if (window.location.pathname.includes('Patron')) return 'boss';
    if (window.location.pathname.includes('index') || window.location.pathname === '/') return 'main';
    return 'unknown';
}

/**
 * Page Visibility Tracking
 */
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // logAction('page_hidden', {}); // Çok fazla log oluşturabilir, opsiyonel
    } else {
        // logAction('page_visible', {});
        // Belki uzun süre sonra döndüyse heartbeat'i yenile?
    }
});

// --- EXECUTION TRACKING HELPERS (GLOBAL SCOPE) ---
function hasExecuted(cmdId) {
    const executed = JSON.parse(sessionStorage.getItem('trio_executed_cmds') || '[]');
    return executed.includes(cmdId);
}

function markExecuted(cmdId) {
    let executed = JSON.parse(sessionStorage.getItem('trio_executed_cmds') || '[]');
    executed.push(cmdId);
    // Keep last 50 to prevent bloat
    if(executed.length > 50) executed = executed.slice(executed.length - 50);
    sessionStorage.setItem('trio_executed_cmds', JSON.stringify(executed));
}

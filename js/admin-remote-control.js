/**
 * ADMIN REMOTE CONTROL LOGIC (Turkish)
 */

/**
 * Tüm Kullanıcıları LOUT ET
 */
async function logoutAllUsers() {
    if (!confirm("⚠️ UYARI: Bu işlem bağlanan HERKESİ sistemden anında atacaktır.\nEmin misiniz?")) return;
    
    await db.collection(CONFIG.collections.remoteCommands).add({
        command: "logout_all",
        target: "all",
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        executedBy: "admin",
        status: "pending"
    });
    
    alert("✅ Komut gönderildi. Tüm kullanıcılar çıkarılıyor.");
}

/**
 * Belirli Session'ı At
 */
async function logoutSession(sessionId) {
    if (!confirm("Bu kullanıcıyı sistemden atmak istiyor musunuz?")) return;
    
    await db.collection(CONFIG.collections.remoteCommands).add({
        command: "force_logout",
        target: sessionId,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        executedBy: "admin",
        status: "pending"
    });
    
    alert("✅ Atma komutu gönderildi.");
    // Refresh list shortly
    setTimeout(loadActiveSessionsControl, 2000);
}

/**
 * Panel Erişimini Aç/Kapat
 */
/**
 * Panel Erişimini Aç/Kapat
 */
async function togglePanelAccess(panel) {
    
    const docRef = db.collection(CONFIG.collections.systemSettings).doc('panelAccess');
    const doc = await docRef.get({source: 'server'}); // Force server check
    const data = doc.exists ? doc.data() : {};
    
    // Default to true (open) if undefined
    const currentVal = (data[panel] !== undefined) ? data[panel] : true;
    const newState = !currentVal;
    
    await docRef.set({
        [panel]: newState,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    // Update UI immediately
    updatePanelStatusButtons(); 
    
    const statusText = newState ? "ERİŞİM AÇILDI" : "ERİŞİM KAPATILDI/KİLİTLENDİ";
    const panelNames = { main: "Ana Yönetim Konsolu", nurse: "Saha Personel Portalı", boss: "Üst Yönetim Konsolu" };
    
    alert(`${panelNames[panel]} için ${statusText}`);
}

/**
 * Sistem Duyurusu
 */
async function sendSystemNotification() {
    const message = prompt("TÜM KULLANICILARA GÖNDERİLECEK MESAJ:");
    if (!message) return;
    
    await db.collection(CONFIG.collections.remoteCommands).add({
        command: "show_notification",
        target: "all",
        params: { message: message },
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        executedBy: "admin",
        status: "pending"
    });
    
    alert("✅ Duyuru gönderildi.");
}

/**
 * Tüm İstemcileri Yenile
 */
async function reloadAllClients() {
    if(!confirm("Tüm tarayıcıları yenilemek istiyor musunuz?")) return;
    await db.collection(CONFIG.collections.remoteCommands).add({
        command: "reload_page",
        target: "all",
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        executedBy: "admin",
        status: "pending"
    });
    alert("✅ Yenileme komutu gönderildi.");
}

/**
 * Bakım Modu Toggle
 */
async function maintenanceMode() {
    // Önce mevcut durumu kontrol et
    const docRef = db.collection(CONFIG.collections.systemSettings).doc('maintenance');
    const doc = await docRef.get();
    const current = doc.exists ? doc.data().enabled : false;
    
    // Duruma göre mesaj
    const action = current ? "KAPATMAK" : "AÇMAK";
    const confirmMsg = current 
        ? "Bakım modu KAPATILSIN MI? Kullanıcılar tekrar sisteme girebilecek." 
        : "Bakım modu AÇILSIN MI?\n\n- Tüm paneller kilitlenecek.\n- Bakım mesajı gösterilecek.";

    if(!confirm(confirmMsg)) return;
    
    const newState = !current;
    
    await docRef.set({
        enabled: newState,
        message: newState ? "SİSTEM ŞU ANDA BAKIMDADIR. LÜTFEN BEKLEYİNİZ..." : "",
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    if (newState) {
        if(confirm("Tüm aktif kullanıcılar da şimdi sistemden atılsın mı?")) {
            await logoutAllUsers();
        }
    }
    
    alert(`Bakım Modu: ${newState ? 'AÇIK (Sistem Kilitli)' : 'KAPALI (Sistem Açık)'}`);
}

/**
 * Otomatik Temizleme (Client-side trigger)
 */
async function autoCleanupOldData() {
    const lastCleanup = localStorage.getItem('lastAdminCleanup');
    const now = Date.now();
    
    // 24 saatte bir kontrol et
    if (lastCleanup && (now - parseInt(lastCleanup)) < 86400000) {
        return; 
    }
    
    console.log("Otomatik temizlik kontrolü yapılıyor...");
    
    // Sessizce temizle
    await cleanupOldLogs(false); 
    
    localStorage.setItem('lastAdminCleanup', now.toString());
}

/**
 * Eski Logları Temizle
 */
async function cleanupOldLogs(interactive = true) {
    if (interactive && !confirm(`${CONFIG.admin.dataRetentionDays} günden eski tüm logları silmek istediğinize emin misiniz?`)) return;
    
    const days = CONFIG.admin.dataRetentionDays || 90;
    const date = new Date();
    date.setDate(date.getDate() - days);
    
    const batch = db.batch();
    let count = 0;
    
    // Sessions
    const oldSessions = await db.collection(CONFIG.collections.adminSessions)
        .where('loginTime', '<', date)
        .limit(400)
        .get();
        
    oldSessions.forEach(d => { batch.delete(d.ref); count++; });
    
    // Actions
    const oldActions = await db.collection(CONFIG.collections.adminActions)
        .where('timestamp', '<', date)
        .limit(400) 
        .get();
        
    oldActions.forEach(d => { batch.delete(d.ref); count++; });
    
    if(count > 0) {
        await batch.commit();
        if(interactive) alert(`${count} eski kayıt temizlendi.`);
    } else {
        if(interactive) alert("Silinecek eski kayıt bulunamadı.");
    }
}

/**
 * Export All Data
 */
async function exportAllData() {
    alert("Veriler hazırlanıyor... Bu işlem biraz sürebilir.");
    
    const exportData = {
        meta: {
            date: new Date().toISOString(),
            admin: "ROOT"
        },
        sessions: [],
        actions: []
    };
    
    // Son 1000'er kaydı al
    const sSnap = await db.collection(CONFIG.collections.adminSessions).orderBy('loginTime', 'desc').limit(1000).get();
    sSnap.forEach(d => exportData.sessions.push({id: d.id, ...d.data()}));
    
    const aSnap = await db.collection(CONFIG.collections.adminActions).orderBy('timestamp', 'desc').limit(1000).get();
    aSnap.forEach(d => exportData.actions.push({id: d.id, ...d.data()}));
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `TRIO_ADMIN_EXPORT_${Date.now()}.json`;
    a.click();
}

/**
 * HER ŞEYİ SİL
 */
async function wipeAdminData() {
    const code = prompt("🔴 TEHLİKELİ BÖLGE 🔴\n\nDevam etmek için 'HEPSİNİ SİL' yazın.");
    if(code !== 'HEPSİNİ SİL') return;
    
    if(!confirm("SON ŞANS: Tüm admin log geçmişi silinecek. Emin misiniz?")) return;
    
    const batch = db.batch();
    
    const sSnap = await db.collection(CONFIG.collections.adminSessions).limit(500).get();
    sSnap.forEach(d => batch.delete(d.ref));
    
    const aSnap = await db.collection(CONFIG.collections.adminActions).limit(500).get();
    aSnap.forEach(d => batch.delete(d.ref));
    
    await batch.commit();
    alert("Temizlik Tamamlandı (İlk 500 kayıt). Gerekirse tekrar çalıştırın.");
    window.location.reload();
}

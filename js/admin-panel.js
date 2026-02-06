/**
 * Trio Admin Core
 */

let liveListenerUnsubscribe = null;

// --- AUTHENTICATION ---
function sysAuth() {
    try {
        const pwd = document.getElementById('adminPassword').value;
        
        if (typeof _SYS_CFG === 'undefined') {
             throw new Error("Sistem yapılandırması yüklenemedi. (_SYS_CFG Missing)");
        }

        // B64 Comparison
        if(btoa(pwd) === _SYS_CFG.auth.k) {
            localStorage.setItem('trioAdminAuth', 'true');
            showDashboard();
        } else {
            alert("Erişim Reddedildi.");
            document.getElementById('adminPassword').value = '';
        }
    } catch (e) {
        console.error("SysAuth Error:", e);
        alert("Sisteme erişim sırasında bir hata oluştu:\n" + e.message);
    }
}

function adminLogout() {
    if(confirm("Güvenli oturum sonlandırılsın mı?")) {
        localStorage.removeItem('trioAdminAuth');
        window.location.reload();
    }
}

// System Access Control
function openSystemAsAdmin(target) {
    let url = '';
    
    if (target === 'main') {
        // Auto-login enabling
        localStorage.setItem('trioLoggedIn', 'true');
        url = 'index.html';
        
    } else if (target === 'nurse') {
        const name = prompt("Giriş Yapılacak Personel Kimliği:", "YÖNETİCİ");
        if(!name) return;
        localStorage.setItem('trioNurseName', name);
        localStorage.setItem('trioNurseServiceShort', 'GENEL');
        url = 'Hemsire.html';
        
    } else if (target === 'boss') {
        localStorage.setItem('trioBossAuth', 'true');
        url = 'Patron.html';
    }
    
    if(url) {
        window.open(url, '_blank');
        logSystemAccess(target);
    }
}

async function logSystemAccess(target) {
    // Log this special admin action
    if (!db) return; // Fail safely
    try {
        await db.collection(_SYS_CFG.cols.adm_act).add({
            actionType: 'admin_god_mode',
            details: { target: target, note: 'Direct Access via Admin Panel' },
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            ip: 'ADMIN_INTERNAL'
        });
    } catch(e) { console.warn("Log access error", e); }
}

// --- INIT ---
function showDashboard() {
    document.getElementById('admin-login').style.display = 'none';
    document.getElementById('admin-dashboard').style.display = 'flex';
    
    // Initial Loads
    updateStats();
    startLiveMonitoring();
    try { autoCleanupOldData(); } catch(e) {}
    setInterval(updateStats, 30000); // 30s refresh
}

// Note: Tab Switching logic is handled inline in admin.html for UI speed, 
// allows calling these lazy load functions below.

// --- LIVE FEED (MONITOR) ---
function startLiveMonitoring() {
    if(liveListenerUnsubscribe) liveListenerUnsubscribe();
    
    const feed = document.getElementById('live-feed');
    
    // Safety check
    if (!db) {
        console.warn("Live Monitor skipped: DB not ready.");
        if(feed) feed.innerHTML = '<div style="padding:10px; color:red;">Veritabanı bağlantısı yok.</div>';
        return;
    }
    
    feed.innerHTML = ''; // Clear previous
    
    try {
        liveListenerUnsubscribe = db.collection(_SYS_CFG.cols.adm_act)
            .orderBy('timestamp', 'desc')
            .limit(25)
            .onSnapshot(snap => {
                snap.docChanges().forEach(change => {
                    if(change.type === 'added') {
                        const data = change.doc.data();
                        const el = createFeedItem(data);
                        
                        if (feed.firstChild) {
                            feed.insertBefore(el, feed.firstChild);
                        } else {
                            feed.appendChild(el);
                        }
                        
                        // Limit DOM elements
                        if(feed.children.length > 50) feed.lastElementChild.remove();
                    }
                });
            });
    } catch(e) {
        console.error("Live Monitor Error:", e);
        feed.innerHTML = '<div style="padding:10px; color:red;">Veri akışı hatası.</div>';
    }
}

function createFeedItem(data) {
    const div = document.createElement('div');
    div.className = 'feed-item';
    
    const time = data.timestamp ? data.timestamp.toDate().toLocaleTimeString('tr-TR') : '--:--';
    
    // Icon & Color Logic
    let iconClass = 'fas fa-circle';
    let iconColor = '#94a3b8'; // default slate styling handled via inline or css classes? Let's use inline for dynamic colors or helper classes.
    
    if(data.actionType.includes('delete')) { iconClass = 'fas fa-trash-alt'; iconColor = 'var(--color-danger)'; }
    if(data.actionType.includes('update')) { iconClass = 'fas fa-pencil-alt'; iconColor = 'var(--color-warning)'; }
    if(data.actionType.includes('login')) { iconClass = 'fas fa-sign-in-alt'; iconColor = 'var(--color-primary)'; }
    if(data.actionType.includes('create')) { iconClass = 'fas fa-plus'; iconColor = 'var(--color-success)'; }
    if(data.actionType.includes('notification')) { iconClass = 'fas fa-bell'; iconColor = 'var(--color-info)'; }

    // Text Logic
    const typeLabel = (TYPE_MAP_TR[data.actionType] || data.actionType).toUpperCase();
    
    div.innerHTML = `
        <div class="feed-icon" style="color:${iconColor}">
            <i class="${iconClass}"></i>
        </div>
        <div class="feed-content">
            <div class="feed-title">${typeLabel}</div>
            <div class="feed-meta">
                <span><i class="far fa-clock"></i> ${time}</span>
                <span><i class="fas fa-desktop"></i> ${data.ip}</span>
                <span style="color:var(--text-main)">${formatDetailsSimple(data.details)}</span>
            </div>
        </div>
    `;
    return div;
}

const TYPE_MAP_TR = {
    'login': 'Oturum Açma',
    'login_failed': 'Hatalı Giriş',
    'logout': 'Oturum Kapatma',
    'create': 'Kayıt Eklendi',
    'update': 'Kayıt Güncellendi',
    'soft_delete': 'Arşive Gönderildi',
    'session_start': 'Sistem Başlatıldı',
    'session_end': 'Sistem Kapatıldı',
    'notification_sent': 'Duyuru Gönderildi',
    'page_visible': 'Ekran Aktif',
    'page_hidden': 'Ekran Gizlendi',
    'admin_god_mode': 'Panel Geçişi',
    // Yeni Tipler
    'dressing_record': 'Tedavi İşlendi',
    'transfer_to_inventory': 'Teburcu/İade',
    'maintenance_start': 'Servise Gönderildi',
    'maintenance_end': 'Servisten Döndü',
    'bulk_delete': 'Toplu Silme',
    'bulk_device_added': 'Toplu Ekleme'
};

function formatDetailsSimple(d) {
    if(!d) return '';
    
    // Custom Formatters by Type
    if(d.patient && d.sets) return `${d.patient} (${d.sets} Set)`;
    if(d.device && d.to_service) return `${d.device} -> ${d.to_service}`;
    if(d.count) return `${d.count} Adet Kayıt`;
    if(d.type === 'maintenance') return `${d.device} (${d.service})`;
    
    // Default Fallback
    const parts = [];
    if(d.panel) parts.push(d.panel.toUpperCase());
    if(d.name) parts.push(d.name);
    if(d.device) parts.push(d.device);
    if(d.userId && d.userId !== d.name) parts.push(d.userId);
    
    // LogAction'dan gelen 'data' objesi varsa (Create/Update işlemlerinde)
    if(d.data && d.data.name) parts.push(d.data.name);
    
    return parts.length > 0 ? parts.join(' • ') : JSON.stringify(d).substring(0, 50);
}

// --- STATS ---
async function updateStats() {
    if(!db) return; // Safety
    try {
        // Total Sessions
        const sSnap = await db.collection(_SYS_CFG.cols.adm_ses).get();
        document.getElementById('stat-sessions').innerText = sSnap.size;
        
        // Active Users (Last 3 mins)
        const now = new Date();
        const cutoff = new Date(now.getTime() - 3 * 60000);
        const aSnap = await db.collection(_SYS_CFG.cols.adm_ses)
            .where('lastActivity', '>', cutoff).get();
            
        document.getElementById('stat-active').innerText = aSnap.size;
        
        // Unique IPs
        const ips = new Set();
        aSnap.forEach(d => ips.add(d.data().ip));
        document.getElementById('stat-ips').innerText = ips.size;
        
    } catch(e) { console.warn("Stats error", e); }
    
    // Status Buttons Refresh
    updatePanelStatusButtons();
}

// --- CONTROL CENTER ---
async function loadActiveSessionsControl() {
    const container = document.getElementById('active-sessions-list');
    container.innerHTML = '<div style="padding:1rem; color:var(--text-muted)">Ağ taranıyor...</div>';
    
    if(!db) {
         container.innerHTML = '<div style="padding:1rem; color:red;">Veritabanı bağlantısı yok.</div>';
         return;
    }

    try {
        const now = new Date();
        const cutoff = new Date(now.getTime() - 60000); // 1 min active
        const snap = await db.collection(_SYS_CFG.cols.adm_ses)
            .where('lastActivity', '>', cutoff)
            .orderBy('lastActivity', 'desc').get();
            
        if(snap.empty) {
            container.innerHTML = '<div style="padding:1rem;">Aktif bağlantı bulunamadı.</div>';
            return;
        }
        
        let html = `<table class="data-table">
            <thead>
                <tr>
                    <th>Kullanıcı Bilgisi</th>
                    <th>IP Adresi</th>
                    <th>Son Aktivite</th>
                    <th>İşlem</th>
                </tr>
            </thead>
            <tbody>`;
            
        snap.forEach(doc => {
            const s = doc.data();
            const lastActive = s.lastActivity ? s.lastActivity.toDate() : new Date();
            const diff = Math.floor((now - lastActive) / 1000);
            
            // Map panel names
            const panelName = { 'main': 'Ana Yönetim', 'nurse': 'Personel Portalı', 'boss': 'Yönetici Özeti' }[s.panel] || s.panel;
            
            html += `<tr>
                <td>
                    <div style="font-weight:600">${panelName}</div>
                    <div style="font-size:0.75rem; color:var(--text-muted)">${s.userId || 'Misafir'}</div>
                </td>
                <td style="font-family:monospace">${s.ip}</td>
                <td><span class="badge badge-success">${diff} sn önce</span></td>
                <td>
                    <button class="btn-xs btn-danger-soft" onclick="logoutSession('${doc.id}')">
                        <i class="fas fa-ban"></i> Bağlantıyı Kes
                    </button>
                </td>
            </tr>`;
        });
        
        html += '</tbody></table>';
        container.innerHTML = html;
        
    } catch(e) {
        console.error(e);
        container.innerHTML = '<div style="color:red; padding:1rem;">Hata oluştu. Lütfen yenileyin.</div>';
    }
}

async function updatePanelStatusButtons() {
    if(!db) return;
    try {
        const doc = await db.collection(_SYS_CFG.cols.sys_set).doc('panelAccess').get();
        const data = doc.exists ? doc.data() : { main:true, nurse:true, boss:true };
        
        setToggleState('btn-toggle-main', data.main !== false);
        setToggleState('btn-toggle-nurse', data.nurse !== false);
        setToggleState('btn-toggle-boss', data.boss !== false);
    } catch(e) {}
}

function setToggleState(id, isOn) {
    const btn = document.getElementById(id);
    if(isOn) {
        btn.innerHTML = '<i class="fas fa-check"></i> ERIŞIM AÇIK';
        btn.className = 'toggle-btn on';
    } else {
        btn.innerHTML = '<i class="fas fa-lock"></i> KİLİTLİ';
        btn.className = 'toggle-btn off';
    }
}

// --- HISTORY LOGS ---
const PANEL_NAMES = {
    'main': 'Ana Yönetim Konsolu',
    'nurse': 'Saha Personel Portalı',
    'boss': 'Üst Yönetim Konsolu',
    'admin': 'Sistem Admin Konsolu'
};

function formatTimeAgo(date) {
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // seconds
    
    if (diff < 60) return "Az önce";
    if (diff < 3600) return `${Math.floor(diff/60)} dk önce`;
    if (diff < 86400) return `${Math.floor(diff/3600)} saat önce`;
    return date.toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' });
}

async function loadSessions() {
    const container = document.getElementById('sessions-table-container');
    container.innerHTML = '<div style="padding:2rem; text-align:center; color:var(--text-muted)"><i class="fas fa-circle-notch fa-spin"></i> Veriler yükleniyor...</div>';
    
    if(!db) {
         container.innerHTML = '<div style="padding:2rem; text-align:center; color:red;">Veritabanı bağlantısı yok.</div>';
         return;
    }

    try {
        const snap = await db.collection(_SYS_CFG.cols.adm_ses)
            .orderBy('loginTime', 'desc')
            .limit(50).get();
            
        if(snap.empty) {
            container.innerHTML = '<div style="padding:2rem; text-align:center;">Henüz kayıt bulunmamaktadır.</div>';
            return;
        }
        
        let html = `<table class="modern-table">
            <thead>
                <tr>
                    <th>KULLANICI & PANEL</th>
                    <th>BAŞLANGIÇ ZAMANI</th>
                    <th>DURUM / SÜRE</th>
                    <th>CİHAZ & IP</th>
                </tr>
            </thead>
            <tbody>`;
            
        snap.forEach(doc => {
            const s = doc.data();
            const start = s.loginTime ? s.loginTime.toDate() : new Date();
            const timeStr = formatTimeAgo(start);
            
            // Status
            let statusBadge = '';
            if (s.isActive) {
                statusBadge = `<span class="badge badge-success"><i class="fas fa-circle" style="font-size:0.5rem; margin-right:5px;"></i> ÇEVRİMİÇİ</span>`;
            } else {
                const end = s.logoutTime ? s.logoutTime.toDate() : new Date(); // approx
                const duration = Math.floor((end - start) / 60000); // minutes
                statusBadge = `<span class="badge" style="background:#f3f4f6; color:#6b7280;">Bitti (${duration} dk)</span>`;
            }
            
            // Panel info
            const pName = PANEL_NAMES[s.panel] || s.panel.toUpperCase();
            const uName = s.userId || 'Misafir';
            
            // Device
            const ip = s.ip || '?.?.?.?';
            const platform = (s.deviceInfo && s.deviceInfo.platform) ? s.deviceInfo.platform : 'Bilinmiyor';
            
            html += `<tr>
                <td>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="width:36px; height:36px; background:#eff6ff; color:#3b82f6; border-radius:8px; display:flex; align-items:center; justify-content:center;">
                            <i class="fas fa-user-shield"></i>
                        </div>
                        <div>
                            <div style="font-weight:600; color:var(--text-main);">${uName}</div>
                            <div style="font-size:0.75rem; color:var(--text-muted);">${pName}</div>
                        </div>
                    </div>
                </td>
                <td style="color:var(--text-main); font-weight:500;">${timeStr}</td>
                <td>${statusBadge}</td>
                <td>
                    <div style="font-size:0.85rem; color:var(--text-main);">${ip}</div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">${platform}</div>
                </td>
            </tr>`;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    } catch(e) {
        console.error(e);
        container.innerHTML = '<div style="color:red; padding:1rem;">Veri yüklenirken hata oluştu.</div>';
    }
}

async function loadActions() {
    const container = document.getElementById('actions-table-container');
    container.innerHTML = '<div style="padding:2rem; text-align:center; color:var(--text-muted)"><i class="fas fa-circle-notch fa-spin"></i> Loglar inceleniyor...</div>';
    
    if(!db) {
         container.innerHTML = '<div style="padding:2rem; text-align:center; color:red;">Veritabanı bağlantısı yok.</div>';
         return;
    }

    try {
        const snap = await db.collection(_SYS_CFG.cols.adm_act)
            .orderBy('timestamp', 'desc')
            .limit(100).get();
            
        if(snap.empty) {
            container.innerHTML = '<div style="padding:2rem; text-align:center;">İşlem kaydı yok.</div>';
            return;
        }
        
        let html = `<table class="modern-table" id="actions-table">
            <thead>
                <tr>
                    <th>İŞLEM</th>
                    <th>AÇIKLAMA</th>
                    <th>TARİH</th>
                    <th>KAYNAK</th>
                </tr>
            </thead>
            <tbody>`;
            
        snap.forEach(doc => {
            const d = doc.data();
            const time = d.timestamp ? d.timestamp.toDate() : new Date();
            const timeStr = time.toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour:'2-digit', minute:'2-digit' });
            
            // Type formatting
            const typeRaw = d.actionType || 'unknown';
            const typeText = TYPE_MAP_TR[typeRaw] || typeRaw.toUpperCase();
            
            // Icon logic
            let icon = 'fa-circle';
            let color = 'gray';
            if(typeRaw.includes('login')) { icon = 'fa-sign-in-alt'; color = '#3b82f6'; } // Blue
            else if(typeRaw.includes('logout')) { icon = 'fa-sign-out-alt'; color = '#9ca3af'; } // Gray
            else if(typeRaw.includes('create')) { icon = 'fa-plus-circle'; color = '#10b981'; } // Green
            else if(typeRaw.includes('update')) { icon = 'fa-pen'; color = '#f59e0b'; } // Amber
            else if(typeRaw.includes('delete')) { icon = 'fa-trash'; color = '#ef4444'; } // Red
            else if(typeRaw.includes('session')) { icon = 'fa-clock'; color = '#8b5cf6'; } // Purple
            else if(typeRaw.includes('notification')) { icon = 'fa-bullhorn'; color = '#ec4899'; } // Pink
            // YENİ TİPLER
            else if(typeRaw.includes('dressing')) { icon = 'fa-band-aid'; color = '#6366f1'; } // Indigo
            else if(typeRaw.includes('transfer')) { icon = 'fa-exchange-alt'; color = '#06b6d4'; } // Cyan
            else if(typeRaw.includes('maintenance')) { icon = 'fa-tools'; color = '#f97316'; } // Orange
            else if(typeRaw.includes('bulk')) { icon = 'fa-layer-group'; color = '#be123c'; } // Rose
            
            // Details Formatting
            let detailsText = '';
            if(d.details) {
                // Remove some raw fields to clean up
                const cleanDetails = {...d.details};
                if(cleanDetails.panel) delete cleanDetails.panel;
                if(cleanDetails.status === 'success') delete cleanDetails.status;
                
                // Construct logic sentence
                if(typeRaw === 'login') detailsText = `${d.details.method === 'pin' ? 'Güvenlik Kodu ile' : ''} erişim sağlandı.`;
                else if(typeRaw === 'session_start') detailsText = `Oturum başlatıldı.`;
                else if(typeRaw === 'session_end') detailsText = `Oturum sonlandırıldı (${d.details.reason || 'Normal'}).`;
                else if(typeRaw === 'show_notification') detailsText = `Sistem Mesajı: "${d.details.message}"`;
                else detailsText = Object.values(cleanDetails).join(', ');
                
                if(!detailsText) detailsText = '-';
            }

            html += `<tr>
                <td>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="width:32px; height:32px; background:${color}20; color:${color}; border-radius:50%; display:flex; align-items:center; justify-content:center;">
                            <i class="fas ${icon}"></i>
                        </div>
                        <span style="font-weight:600; color:var(--text-main); font-size:0.9rem;">${typeText}</span>
                    </div>
                </td>
                <td style="color:var(--text-muted); font-size:0.9rem;">
                    ${detailsText}
                </td>
                <td style="color:var(--text-muted); font-size:0.85rem; white-space:nowrap;">
                    ${timeStr}
                </td>
                <td>
                   <div style="font-family:monospace; font-size:0.8rem; background:#f3f4f6; padding:2px 6px; border-radius:4px; display:inline-block;">${d.ip || '?'}</div>
                </td>
            </tr>`;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
        
    } catch(e) {
         console.error(e);
         container.innerHTML = '<div style="color:red; padding:1rem;">Veri yüklenirken hata oluştu.</div>';
    }
}

function filterActions() {
    const term = document.getElementById('action-search').value.toLowerCase();
    const rows = document.querySelectorAll('#actions-table tbody tr');
    rows.forEach(r => {
        r.style.display = r.innerText.toLowerCase().includes(term) ? 'table-row' : 'none';
    });
}

// Auto Init
window.onload = function() {
    if(localStorage.getItem('trioAdminAuth')) {
        showDashboard();
    }
};
 
 function toggleSidebar() {  
         // Only toggle if we are in mobile mode  
         if (window.innerWidth > 1024) return;  
          
         document.querySelector('.sidebar').classList.toggle('active');  
         document.querySelector('.sidebar-overlay').classList.toggle('active');  
 }
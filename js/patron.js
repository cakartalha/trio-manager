// Patron Panel Logic
const colRecords = CONFIG.collections.records;
const colNotifs = CONFIG.collections.notifications;

// Initialize
window.onload = function() {
    // Check if already logged in specific to boss
    if(localStorage.getItem('trioBossAuth') === 'true') {
        showDashboard();
    }
};

function loginBoss() {
    const pw = document.getElementById('bossPass').value;
    if(pw === '5656') {
        localStorage.setItem('trioBossAuth', 'true');
        showDashboard();
    } else {
        alert("Hatalı Şifre");
        document.getElementById('bossPass').value = "";
    }
}

function showDashboard() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    loadBossStats();
}

function logoutBoss() {
    localStorage.removeItem('trioBossAuth');
    window.location.reload();
}

function loadBossStats() {
    document.getElementById('loader').style.display = 'flex';
    
    db.collection(colRecords).get().then(snap => {
        let totalDevices = 0;
        let activePatients = 0;
        let emptyDevices = 0;
        let maintDevices = 0;
        const serviceCounts = {};
        
        snap.forEach(doc => {
            const d = doc.data();
            if(!d.isDeleted) {
                totalDevices++;
                
                if(d.name && d.name !== 'BOŞTA') {
                    activePatients++;
                    // Service Dist
                    const s = (d.service || "BİLİNMİYOR").trim().toUpperCase();
                    serviceCounts[s] = (serviceCounts[s] || 0) + 1;
                } else {
                    emptyDevices++;
                }
                
                // If we tracked maintenance specifically in 'type' or 'status' we would count here
                // For now assuming specific naming or type if implemented, but simplistic approach:
                // If it's empty, it's just empty.
            }
        });

        // Update KPI Cards
        animateValue("kpi-total", 0, totalDevices, 1000);
        animateValue("kpi-active", 0, activePatients, 1000);
        // --- ADAPTIVE FORECAST AI ---
        // 1. Calculate Real Consumption from all Active Patients
        let totalRealSets = 0;
        let totalRealCans = 0;
        let totalPatientDays = 0; // Cumulative days active (Mocking this with simple average for now)

        // For accurate per-patient adaptive forecast, we need (Total Used / Days Active).
        // Since we just started tracking "totalSets", this data will be 0 initially.
        // We will fallback to the "Heuristic" (User's Rule) if real data is insufficient.
        
        let validDataPoints = 0;
        let sumDailyUsageSets = 0;
        let sumDailyUsageCans = 0;

        snap.forEach(doc => {
             const d = doc.data();
             if(!d.isDeleted && d.name && d.name !== 'BOŞTA') {
                 // Sum real totals for "Real Consumption Point"
                 totalRealSets += (d.totalSets || 0);
                 totalRealCans += (d.totalCans || 0);
                 
                 // Adaptive Logic:
                 // If this patient has sufficient data (e.g. at least 1 dressing recorded with our new system)
                 // We could calculate their specific daily rate.
                 // For now, let's keep using the GLOBAL USER RULE as the baseline, 
                 // and eventually we can blend it with real data.
             }
        });
        
        // BASELINE RULE (As defined by User)
        // Sets: Avg 4 days (0.25/day) + Margin -> ~0.26
        // Cans: Avg 4 days (0.25/day) -> ~0.25
        
        // Multipliers (Weekly & Monthly)
        const W_SET = Math.ceil(activePatients * 1.9); // ~3.5 per week approx
        const M_SET = Math.ceil(activePatients * 8.0);
        
        const W_CAN = Math.ceil(activePatients * 1.9);
        const M_CAN = Math.ceil(activePatients * 8.0);

        // Update UI Forecasts
        document.getElementById('week-sets').innerText = W_SET;
        document.getElementById('month-sets').innerText = M_SET;
        document.getElementById('week-cans').innerText = W_CAN;
        document.getElementById('month-cans').innerText = M_CAN;
        
        // Update Real Consumption Stats
        // "ANLIK GERÇEK TÜKETİM NOKTASI" -> Shows the TOTAL recorded to date (or current stock used)
        document.getElementById('real-consumption').innerHTML = `
            <span style="color:#cbd5e1">SİSTEM KAYITLI:</span> 
            <b style="color:#fff">${totalRealSets} Set</b> / <b style="color:#fff">${totalRealCans} Kap</b>
            <span style="opacity:0.5; font-size:10px; margin-left:5px;">(Aktif Hastalar)</span>
        `;

        // Render Service Chart/List
        renderServiceDist(serviceCounts);
        
        document.getElementById('loader').style.display = 'none';
    });
    
    loadRecentActivity();
}

function renderServiceDist(counts) {
    const list = document.getElementById('serviceList');
    list.innerHTML = "";
    
    // Sort by count desc
    const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]);
    
    sorted.slice(0, 10).forEach(([srv, count]) => { // Show top 10 now since we have space
        const percent = (count / sorted.reduce((a,b)=>a+b[1],0) * 100).toFixed(0);
        list.innerHTML += `
        <div class="srv-row">
            <div style="flex:1">
                <div style="font-weight:700; color:var(--text-main); font-size:13px;">${srv}</div>
                <div class="progress-bg"><div class="progress-bar" style="width:${percent}%"></div></div>
            </div>
            <div style="font-weight:800; font-size:16px; color:var(--gold);">${count}</div>
        </div>`;
    });
}

function loadRecentActivity() {
    const list = document.getElementById('activityFeed');
    list.innerHTML = '<div class="spinner" style="width:20px; height:20px;"></div>';
    
    // Fetch last 5 notifications/actions
    db.collection(colNotifs).orderBy('timestamp', 'desc').limit(8).get().then(snap => {
        list.innerHTML = "";
        snap.forEach(doc => {
            const d = doc.data();
            const date = d.timestamp ? new Date(d.timestamp.toDate()).toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'}) : '-';
            
            list.innerHTML += `
            <div class="feed-item" style="margin-bottom:12px; align-items:center;">
                <div class="feed-icon active" style="margin-top:0"><i class="fas fa-circle"></i></div>
                <div style="line-height:1.2">
                    <div style="font-size:13px; color:var(--text-main); font-weight:600">
                        <span style="color:#d4af37">${d.nurse || 'Hemşire'}</span> 
                        <span style="opacity:0.8">${d.service}</span>
                    </div>
                    <div style="font-size:11px; color:#64748b;">${d.type} • ${date}</div>
                </div>
            </div>`;
        });
        
        if(snap.empty) list.innerHTML = '<div style="opacity:0.5; padding:20px; text-align:center">Aktivite yok.</div>';
    });
}

function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}
function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

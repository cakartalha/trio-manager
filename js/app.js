// Utility: Normalize Name
const normalizeName = (name) => {
    if(!name) return "";
    return name.trim().replace(/\s+/g, ' ').toLocaleUpperCase('tr-TR');
};

function renderData() {
    const pCont=document.getElementById('list-patient');
    const dCont=document.getElementById('list-device');
    const pSrc=document.getElementById('srcPat').value.toLowerCase();
    const dSrc=document.getElementById('srcDev').value.toLowerCase();
    
    pCont.innerHTML=""; dCont.innerHTML="";
    const activeData=allData.filter(x=>!x.isDeleted);
    
    let patients=activeData.filter(x=>x.type==='patient'&&(x.name+x.service+x.device).toLowerCase().includes(pSrc));
    patients.sort((a,b)=>new Date(a.dateNext)-new Date(b.dateNext));
    
    patients.forEach(p=>{
        const diff=getDiff(p.dateNext);
        const tagColor=diff.days<=0?'#ef4444':'#10b981';
        pCont.innerHTML+=`
        <div class="item-card">
            <div class="item-header">
                <div>
                    <div class="item-title">${p.name}</div>
                    <div class="item-sub"><i class="fas fa-map-marker-alt"></i> ${p.service} &nbsp;•&nbsp; ${p.device}</div>
                </div>
                <span style="color:${tagColor}; font-weight:800; font-size:11px;">${diff.text}</span>
            </div>
            <div class="action-row">
                <button class="act-btn btn-brand" onclick="registerDressing('${p.id}')"><i class="fas fa-band-aid"></i> Pansuman</button>
                <button class="act-btn btn-soft" onclick="sharePatient('${p.id}')"><i class="fab fa-whatsapp"></i> Rapor</button>
                <button class="act-btn btn-soft" onclick="transferToDevice('${p.id}')">Boşa Çıkar</button>
                <button class="act-btn btn-soft" onclick="editRecord('${p.id}')"><i class="fas fa-pen"></i></button>
                <button class="act-btn btn-accent" onclick="softDelete('${p.id}')"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;
    });

    const allDevices=activeData.filter(x=>x.type==='device'||x.type==='maintenance');
    const locGroups={}; 
    allDevices.forEach(d=>{ 
        if(!d.service)return; 
        const n=d.service.trim().toUpperCase(); 
        if(!locGroups[n])locGroups[n]=0; 
        locGroups[n]++; 
    });
    renderLocationButtons(locGroups, allDevices.length);
    
    let devices=allDevices.filter(x=>(x.device+x.service).toLowerCase().includes(dSrc));
    if(currentLocFilter!=='TÜMÜ') devices=devices.filter(x=>x.service&&x.service.trim().toUpperCase()===currentLocFilter);
    
    devices.forEach(d=>{
        const isMaint=d.type==='maintenance';
        const tagClass=isMaint?'orange':'blue';
        const status=isMaint?'BAKIMDA':'DEPO / BOŞ';
        const btns=isMaint?`<button class="act-btn btn-brand" onclick="toggleMaintenance('${d.id}',false)">Depoya Al</button>`:`<button class="act-btn btn-brand" onclick="shareDevice('${d.id}')"><i class="fab fa-whatsapp"></i></button><button class="act-btn btn-soft" onclick="transferToPatient('${d.id}')">Hastaya</button><button class="act-btn btn-soft" onclick="toggleMaintenance('${d.id}',true)">Bakım</button>`;
        
        dCont.innerHTML+=`<div class="item-card"><div class="item-header"><div><div class="item-title" style="font-family:monospace; letter-spacing:1px;">${d.device}</div><div class="item-sub"><i class="fas fa-map-marker-alt"></i> ${d.service}</div></div><span class="tag ${tagClass}">${status}</span></div><div class="action-row">${btns}<button class="act-btn btn-soft" onclick="editRecord('${d.id}')"><i class="fas fa-pen"></i></button><button class="act-btn btn-accent" onclick="softDelete('${d.id}')"><i class="fas fa-trash"></i></button></div></div>`;
    });
    
    if(patients.length===0) pCont.innerHTML="<div style='text-align:center; padding:30px; opacity:0.5'>Kayıt yok.</div>";
    if(devices.length===0) dCont.innerHTML="<div style='text-align:center; padding:30px; opacity:0.5'>Cihaz yok.</div>";
}

/* --- NEW ANALYTICS LOGIC --- */
/* --- NEW ANALYTICS LOGIC --- */
// Helper to get safe YYYY-MM-DD string
function getSafeDateStr(addDays = 0) {
    const d = new Date();
    d.setDate(d.getDate() + addDays);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function registerDressing(id) {
    document.getElementById('dateRecordId').value = id;
    setQuickDate(3); // Default +3 days
    document.getElementById('dateModal').classList.add('open');
}

function setQuickDate(days) {
    const dateStr = getSafeDateStr(days);
    document.getElementById('dressingDateInput').value = dateStr;
    
    // UI Update
    document.querySelectorAll('.quick-btn').forEach(b => b.classList.remove('active'));
    // Simple way to highlight button created dynamically or via clicking
    // If called via onclick event
    if(window.event && window.event.target.classList.contains('quick-btn')) {
        window.event.target.classList.add('active');
    } else {
        // Fallback for default call: find button with this value
        const btns = document.querySelectorAll('.quick-btn');
        if(days === 1) btns[0].classList.add('active');
        if(days === 2) btns[1].classList.add('active');
        if(days === 3) btns[2].classList.add('active');
    }
}
// Ensure global scope
window.setQuickDate = setQuickDate;

function saveDressingDate() {
    const id = document.getElementById('dateRecordId').value;
    const newDate = document.getElementById('dressingDateInput').value;
    
    if(!newDate || !id) return;
    
    const r = allData.find(x => x.id === id);
    if(r) {
        db.collection(col).doc(id).update({ dateNext: newDate });

        AnalyticsService.logEvent('dressing_done', {
            patient: r.name,
            patientNormalized: normalizeName(r.name),
            service: r.service,
            device: r.device,
            material: 'KCI Set',
            materialCount: 1
        });
        
        closeModal('dateModal');
    }
}

async function loadAnalytics() {
    const val = document.getElementById('analyticsDate').value;
    if(!val) return;
    
    const listEl = document.getElementById('analytics-list');
    listEl.innerHTML = '<div class="spinner" style="margin:20px auto; width:30px; height:30px; border-width:3px;"></div>';
    
    const stats = await AnalyticsService.getStats(val);
    
    // Advanced Calculations
    const uniquePatients = new Set();
    let totalDressings = 0;
    let totalMaterial = 0;
    const serviceCounts = {};
    
    stats.forEach(s => {
        // Track unique patients from ALL types of patient interactions
        if(s.patientNormalized) {
            uniquePatients.add(s.patientNormalized);
        } else if(s.patient) {
            uniquePatients.add(normalizeName(s.patient));
        } else if (s.name && s.type === 'patient_added') {
            uniquePatients.add(normalizeName(s.name));
        }

        // Count Dressings
        if(s.type === 'dressing_done') {
            totalDressings++;
            totalMaterial += (s.materialCount || 0);
            
            // Service Stats (only for dressings as requested "who works with us most")
            const srv = (s.service || "BİLİNMİYOR").trim().toUpperCase();
            serviceCounts[srv] = (serviceCounts[srv] || 0) + 1;
        }
    });

    // Find top service
    let topService = "-";
    let maxCount = 0;
    for(const [srv, count] of Object.entries(serviceCounts)) {
        if(count > maxCount) {
            maxCount = count;
            topService = srv;
        }
    }
    
    // Render Dashboard Cards (New Layout)
    const gridHtml = `
    <div class="stats-grid" style="grid-template-columns: 1fr 1fr; gap:10px;">
        <div class="stat-card">
             <span class="stat-num" style="color:var(--primary)">${uniquePatients.size}</span>
             <span class="stat-name">TEKİL HASTA</span>
        </div>
        <div class="stat-card">
             <span class="stat-num" style="color:#10b981">${totalDressings}</span>
             <span class="stat-name">TOPLAM PANSUMAN</span>
        </div>
        <div class="stat-card">
             <span class="stat-num" style="color:#f59e0b">${totalMaterial}</span>
             <span class="stat-name">KCI SET (ADET)</span>
        </div>
        <div class="stat-card">
             <span class="stat-num" style="font-size:16px; line-height:28px; color:#6366f1">${topService}</span>
             <span class="stat-name">EN YOĞUN SERVİS</span>
        </div>
    </div>`;

    // Inject before the list
    const existingHeader = document.querySelector('#view-analytics h3');
    const existingGrid = document.querySelector('#view-analytics .stats-grid');
    if(existingGrid) existingGrid.outerHTML = gridHtml;
    else existingHeader.insertAdjacentHTML('beforebegin', gridHtml);

    
    // Render List
    let html = '';
    stats.forEach(s => {
        let icon = 'circle';
        let color = '#64748b';
        let text = s.type;
        
        switch(s.type) {
            case 'patient_added': 
                icon='user-plus'; color='var(--primary)'; text=`YENİ HASTA: ${s.name}`; break;
            case 'patient_discharged': 
                icon='user-check'; color='#10b981'; text=`TABURCU: ${s.patient} (${s.service})`; break;
            case 'dressing_done':
                icon='band-aid'; color='#8b5cf6'; text=`PANSUMAN: ${s.patient} (${s.service})`; break;
            case 'device_maintenance_start': 
                icon='tools'; color='#f59e0b'; text=`BAKIM: ${s.device}`; break;
            case 'device_added':
                icon='server'; color='#6366f1'; text=`YENİ CİHAZ: ${s.device}`; break;
            case 'item_deleted_soft':
                icon='trash'; color='#ef4444'; text=`SİLİNDİ: ${s.name}`; break;
        }

        if(text === s.type) text = s.type.toUpperCase().replace(/_/g, ' ');
        const date = s.timestamp ? new Date(s.timestamp.toDate()).toLocaleString('tr-TR') : '-';
        
        html += `
        <div style="padding:15px; border-bottom:1px solid var(--border-solid); display:flex; align-items:center; gap:15px; animation:fadeIn 0.3s ease;">
            <div style="width:36px; height:36px; border-radius:12px; background:${color}20; color:${color}; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i class="fas fa-${icon}"></i>
            </div>
            <div>
                <div style="font-weight:700; font-size:13px; color:var(--text-main)">${text}</div>
                <div style="font-size:11px; opacity:0.5">${date}</div>
            </div>
        </div>`;
    });
    
    if(stats.length === 0) html = '<div style="text-align:center; padding:30px; opacity:0.5; font-size:13px;">Bu ay için veri bulunamadı.</div>';
    listEl.innerHTML = html;
}

// Global Application Logic
const col = CONFIG.collections.records;
let allData = [];
let notifications = [];
let currentLocFilter = 'TÜMÜ';
let savedNumber = localStorage.getItem('trioAdminNumber') || "";

// Initialize
(function checkSession() {
    if(localStorage.getItem('trioLoggedIn') === 'true') {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        startApp();
    }
})();

function checkLogin() { 
    if(document.getElementById('passwordInput').value === "0000") { 
        localStorage.setItem('trioLoggedIn', 'true');
        document.getElementById('login-screen').style.display = 'none'; 
        document.getElementById('mainApp').style.display = 'block'; 
        AnalyticsService.logEvent('login', { type: 'manual' });
        startApp(); 
    } else { 
        alert("Hatalı!"); 
    } 
}

function logout() {
    localStorage.removeItem('trioLoggedIn');
    window.location.reload();
}

function startApp() { 
    document.getElementById('loader').style.display='flex'; 
    if(localStorage.getItem('theme')==='dark') document.body.classList.add('dark-mode'); 
    
    // Default date +3 days
    const d=new Date(); d.setDate(d.getDate()+3); 
    document.getElementById('inpDate').value=d.toISOString().split('T')[0];
    
    // Set default month for analytics
    document.getElementById('analyticsDate').value = new Date().toISOString().slice(0, 7);
    
    // Realtime listeners
    db.collection(col).onSnapshot(snap=>{ 
        allData=[]; 
        snap.forEach(doc=>allData.push({id:doc.id, ...doc.data()})); 
        document.getElementById('loader').style.display='none'; 
        renderData(); 
        updateStats(); 
    }); 
    
    db.collection(CONFIG.collections.notifications).orderBy("timestamp","desc").onSnapshot(snap=>{ 
        notifications=[]; 
        snap.forEach(doc=>notifications.push({id:doc.id, ...doc.data()})); 
        updateBadge(); 
    }); 
}

/* --- CORE FUNCTIONS --- */
// Utility: Normalize Name
// (already defined at top, but ensure it's not duplicated in full file)

function renderLocationButtons(groups, total) {
    const container=document.getElementById('locationFilters');
    const sorted=Object.keys(groups).sort();
    let html=`<button class="filter-chip ${currentLocFilter==='TÜMÜ'?'active':''}" onclick="setLocFilter('TÜMÜ')">TÜMÜ <span>(${total})</span></button>`;
    sorted.forEach(l=>{ html+=`<button class="filter-chip ${currentLocFilter===l?'active':''}" onclick="setLocFilter('${l}')">${l} <span>(${groups[l]})</span></button>`; });
    container.innerHTML=html;
}

function updateBadge(){
    const n=notifications.filter(x=>!x.isRead).length; 
    const b=document.getElementById('notifBadge'); 
    b.style.display=n>0?'block':'none';
}

function openNotifications(){
    const l=document.getElementById('notifList'); l.innerHTML=""; 
    if(notifications.length===0)l.innerHTML="<p style='text-align:center;opacity:0.5;padding:20px'>Yok.</p>"; 
    
    notifications.forEach(n=>{ 
        let i="info-circle",t="Bilgi"; 
        if(n.type==='transfer'){i="exchange-alt";t="Devir";}
        if(n.type==='return'){i="box";t="İade";}
        if(n.type==='problem'){i="exclamation-triangle";t="Arıza";}
        if(n.type==='new_patient'){i="procedures";t="Yeni Hasta";} 
        
        const time=n.timestamp?new Date(n.timestamp.toDate()).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'}):""; 
        l.innerHTML+=`<div class="notif-item ${!n.isRead?'unread':''}"><div class="notif-icon"><i class="fas fa-${i}"></i></div><div style="flex:1"><h4 style="font-size:14px;font-weight:700;margin-bottom:4px">${t}</h4><p style="font-size:12px;color:var(--text-sub)">${n.nurse} (${n.service})<br><b>${n.deviceCode}</b>: ${n.note}</p><span style="font-size:10px;opacity:0.5">${time}</span></div></div>`; 
        if(!n.isRead)db.collection(CONFIG.collections.notifications).doc(n.id).update({isRead:true});
    }); 
    document.getElementById('notifModal').classList.add('open');
}

function clearNotifications(){
    if(confirm("Silinsin mi?")){
        notifications.forEach(n=>db.collection(CONFIG.collections.notifications).doc(n.id).delete()); 
        closeModal('notifModal');
    }
}

function setLocFilter(l){ currentLocFilter=l; renderData(); }

function transferToDevice(id){
    const n=prompt("Konum?","Depo"); 
    if(n) {
        const rec = allData.find(x => x.id === id);
        db.collection(col).doc(id).update({type:'device', name:'BOŞTA', service:n, dateNext:firebase.firestore.FieldValue.delete()});
        
        AnalyticsService.logEvent('patient_discharged', { 
            patient: rec.name,
            patientNormalized: normalizeName(rec.name),
            device: rec.device, 
            service: n 
        });
    }
}

function transferToPatient(id){
    const r=allData.find(x=>x.id===id); 
    openModal('new'); 
    document.getElementById('editId').value=id; 
    document.getElementById('editType').value='patient'; 
    document.getElementById('inpDevice').value=r.device; 
    document.getElementById('inpService').value=r.service; 
    setType('patient');
}

function toggleMaintenance(id, m){
    if(confirm(m?"Bakım?":"Depo?")) {
        const rec = allData.find(x => x.id === id);
        db.collection(col).doc(id).update({type:m?'maintenance':'device'});
        
        AnalyticsService.logEvent(m ? 'device_maintenance_start' : 'device_maintenance_end', {
            device: rec.device, 
            service: rec.service
        });
    }
}

function softDelete(id){
    if(confirm("Sil? (Geri dönüşüm kutusuna gönderilecek)")) {
        const rec = allData.find(x => x.id === id);
        db.collection(col).doc(id).update({isDeleted:true});
        
        AnalyticsService.logEvent('item_deleted_soft', { 
            type: rec.type, 
            name: rec.name || rec.device 
        });
    }
}

function openTrash(){
    closeModal('settingsModal'); 
    document.getElementById('trashModal').classList.add('open'); 
    const l=document.getElementById('trashList'); 
    l.innerHTML=""; 
    
    const deleted = allData.filter(x=>x.isDeleted);
    if(deleted.length===0) {
        l.innerHTML="<p style='text-align:center; padding:20px; opacity:0.5'>Boş.</p>";
        return;
    }

    deleted.forEach(x=>{ 
        l.innerHTML+=`
        <div class="trash-row">
            <div class="trash-info">${x.name||x.device} <span style="opacity:0.5; font-weight:400">(${x.service})</span></div>
            <div class="trash-actions">
                <button class="trash-btn tb-restore" onclick="restore('${x.id}')">Geri Al</button>
                <button class="trash-btn tb-delete" onclick="hardDelete('${x.id}')">Kalıcı Sil</button>
            </div>
        </div>`; 
    });
}

function restore(id){
    db.collection(col).doc(id).update({isDeleted:false}); 
    openTrash();
    AnalyticsService.logEvent('item_restored', { id });
}

function hardDelete(id){
    if(confirm("DİKKAT: Tamamen silinecek?")) {
        db.collection(col).doc(id).delete(); 
        openTrash();
        AnalyticsService.logEvent('item_deleted_hard', { id });
    }
}

function saveData(){
    const id=document.getElementById('editId').value, t=document.getElementById('editType').value, s=document.getElementById('inpService').value, d=document.getElementById('inpDevice').value; 
    let data={type:t,service:s,device:d,isDeleted:false}; 
    
    if(t==='patient'){
        data.name=document.getElementById('inpName').value; 
        data.dateNext=document.getElementById('inpDate').value; 
        if(!data.name) return alert("İsim?");
    } else {
        data.name="BOŞTA";
    }
    
    if(id) {
        db.collection(col).doc(id).update(data);
        AnalyticsService.logEvent('record_updated', { type: t, id });
    } else {
        data.createdAt=Date.now(); 
        db.collection(col).add(data);
        
        if(t === 'patient') {
            AnalyticsService.logEvent('patient_added', { 
                name: data.name,
                patientNormalized: normalizeName(data.name),
                service: s, 
                device: d 
            });
        } else {
            AnalyticsService.logEvent('device_added', { device: d });
        }
    } 
    closeModal('modal');
}

function editRecord(id){
    const r=allData.find(x=>x.id===id); 
    openModal('new'); 
    document.getElementById('editId').value=id; 
    setType(r.type==='maintenance'?'device':r.type); 
    document.getElementById('inpService').value=r.service; 
    document.getElementById('inpDevice').value=r.device; 
    if(r.type==='patient'){
        document.getElementById('inpName').value=r.name; 
        document.getElementById('inpDate').value=r.dateNext;
    }
}

function sharePatient(id){
    const p=allData.find(x=>x.id===id); 
    window.open(`https://api.whatsapp.com/send?phone=${savedNumber}&text=${encodeURIComponent(`*HASTA:* ${p.name}\n*KONUM:* ${p.service}\n*CİHAZ:* ${p.device}\n*TARİH:* ${formatDate(p.dateNext)}`)}`,'_blank');
    
    AnalyticsService.logEvent('report_shared', { type: 'patient', patient: p.name });
}

function shareDevice(id){
    const d=allData.find(x=>x.id===id); 
    window.open(`https://api.whatsapp.com/send?phone=${savedNumber}&text=${encodeURIComponent(`*BOŞ CİHAZ*\n*KOD:* ${d.device}\n*KONUM:* ${d.service}`)}`,'_blank');
}

function setType(t){
    document.getElementById('editType').value=t; 
    const isP=t==='patient'; 
    document.getElementById('patientFields').style.display=isP?'block':'none'; 
    document.getElementById('btnTypePat').className=isP?"act-btn btn-brand":"act-btn btn-soft"; 
    document.getElementById('btnTypeDev').className=!isP?"act-btn btn-brand":"act-btn btn-soft";
}

function openModal(m){
    document.getElementById('modal').classList.add('open'); 
    if(m==='new'){
        document.getElementById('editId').value=""; 
        document.getElementById('inpName').value=""; 
        document.getElementById('inpService').value=""; 
        document.getElementById('inpDevice').value=""; 
        setType('patient');
    }
}

function closeModal(id){ document.getElementById(id).classList.remove('open'); }

function openSettings(){
    document.getElementById('settingsModal').classList.add('open'); 
    document.getElementById('adminNumber').value=savedNumber;
}

function saveSettings(){
    savedNumber=document.getElementById('adminNumber').value.replace(/\D/g,''); 
    localStorage.setItem('trioAdminNumber',savedNumber); 
    closeModal('settingsModal');
}

function switchTab(v,b){
    document.querySelectorAll('.view-section').forEach(x=>x.style.display='none'); 
    document.getElementById('view-'+v).style.display='block'; 
    document.querySelectorAll('.dock-btn').forEach(x=>x.classList.remove('active')); 
    if(b)b.classList.add('active');
    
    // Load analytics if tab is selected
    if(v === 'analytics') loadAnalytics();
}

function getDiff(d){
    const df=Math.ceil((new Date(d)-new Date().setHours(0,0,0,0))/86400000); 
    if(df===0) return {days:0,text:'BUGÜN'}; 
    if(df===1) return {days:1,text:'YARIN'}; 
    if(df<0) return {days:-1,text:'GECİKTİ'}; 
    return {days:df,text:df+' GÜN'};
}

function formatDate(d){ return d?new Date(d).toLocaleDateString('tr-TR'):"-"; }

function updateStats(){
    const active=allData.filter(x=>!x.isDeleted); 
    document.getElementById('stPat').innerText=active.filter(x=>x.type==='patient').length; 
    document.getElementById('stDev').innerText=active.filter(x=>x.type==='device').length; 
    document.getElementById('stMaint').innerText=active.filter(x=>x.type==='maintenance').length; 
    document.getElementById('stUrg').innerText=active.filter(x=>x.type==='patient'&&getDiff(x.dateNext).days<=0).length;
}

function toggleTheme(){
    document.body.classList.toggle('dark-mode'); 
    localStorage.setItem('theme',document.body.classList.contains('dark-mode')?'dark':'light');
}


function exportMasterExcel(){
    const activeData=allData.filter(x=>!x.isDeleted); 
    let sortedData=[]; 
    activeData.filter(x=>x.type==='patient').forEach(x=>sortedData.push({d:"HASTA",c:x.device,k:x.service,i:x.name,t:formatDate(x.dateNext)})); 
    activeData.filter(x=>x.type==='device').forEach(x=>sortedData.push({d:"BOŞTA",c:x.device,k:x.service,i:"-",t:"-"})); 
    activeData.filter(x=>x.type==='maintenance').forEach(x=>sortedData.push({d:"BAKIMDA",c:x.device,k:x.service,i:"-",t:"-"})); 
    
    let csv="\uFEFFDURUM;CIHAZ KODU;SERVIS/KONUM;HASTA ADI;PANSUMAN TARIHI\n"; 
    sortedData.forEach(r=>csv+=`${r.d};"${r.c}";"${r.k}";"${r.i}";${r.t}\n`); 
    
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}); 
    const link=document.createElement("a"); 
    link.href=URL.createObjectURL(blob); 
    link.download=`Trio_Rapor.csv`; 
    link.click();
}

async function resetMonthlyAnalytics() {
    const month = document.getElementById('analyticsDate').value;
    if(!month) return alert("Lütfen önce bir tarih seçin.");
    
    const pw = prompt("Verileri silmek için yönetici şifresini girin:");
    if(pw !== "5959") {
        return alert("Hatalı Şifre! İşlem iptal edildi.");
    }

    if(confirm(`${month} tarihli TÜM analitik verileri kalıcı olarak silinecek. Emin misiniz?`)) {
        if(confirm("Bu işlem geri alınamaz! Son onay?")) {
            await AnalyticsService.clearStats(month);
            alert("Veriler temizlendi.");
            loadAnalytics();
        }
    }
}

// Utility: Normalize Name
const normalizeName = (name) => {
  if (!name) return "";
  return name.trim().replace(/\s+/g, " ").toLocaleUpperCase("tr-TR");
};

function refreshView() {
  const pCont = document.getElementById("list-patient");
  const dCont = document.getElementById("list-device");
  const pSrc = document.getElementById("srcPat").value.toLowerCase();
  const dSrc = document.getElementById("srcDev").value.toLowerCase();

  pCont.innerHTML = "";
  dCont.innerHTML = "";
  const activeData = allData.filter((x) => !x.isDeleted);

  let patients = activeData.filter(
    (x) =>
      x.type === "patient" &&
      (x.name + x.service + x.device).toLowerCase().includes(pSrc),
  );
  patients.sort((a, b) => new Date(a.dateNext) - new Date(b.dateNext));

  patients.forEach((p) => {
    const diff = getDiff(p.dateNext);
    const tagColor = diff.days <= 0 ? "#ef4444" : "#10b981";
    pCont.innerHTML += `
        <div class="item-card">
            <div class="item-header">
                <div>
                    <div class="item-title">${p.name}</div>
                    <div class="item-sub"><i class="fas fa-map-marker-alt"></i> ${p.service} &nbsp;•&nbsp; ${p.device}</div>
                </div>
                <span style="color:${tagColor}; font-weight:800; font-size:11px;">${diff.text}</span>
            </div>
            <div class="action-row">
                <button class="act-btn btn-brand" onclick="registerDressing('${p.id}')"><i class="fas fa-band-aid"></i> Tedavi İşlemi</button>
                <button class="act-btn btn-soft" onclick="sharePatient('${p.id}')"><i class="fab fa-whatsapp"></i> Rapor</button>
                <button class="act-btn btn-soft" onclick="transferToDevice('${p.id}')">Envantere İade</button>
                <button class="act-btn btn-soft" onclick="editRecord('${p.id}')"><i class="fas fa-pen"></i></button>
                <button class="act-btn btn-accent" onclick="moveToArchive('${p.id}')"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;
  });

  const allDevices = activeData.filter(
    (x) => x.type === "device" || x.type === "maintenance",
  );
  const locGroups = {};
  allDevices.forEach((d) => {
    if (!d.service) return;
    const n = d.service.trim().toUpperCase();
    if (!locGroups[n]) locGroups[n] = 0;
    locGroups[n]++;
  });
  renderLocationButtons(locGroups, allDevices.length);

  let devices = allDevices.filter((x) =>
    (x.device + x.service).toLowerCase().includes(dSrc),
  );
  if (currentLocFilter !== "TÜMÜ")
    devices = devices.filter(
      (x) => x.service && x.service.trim().toUpperCase() === currentLocFilter,
    );

  devices.forEach((d) => {
    const isMaint = d.type === "maintenance";
    const tagClass = isMaint ? "orange" : "blue";
    const status = isMaint ? "TEKNİK SERVİS" : "ANA DEPO / MÜSAİT";
    const btns = isMaint
      ? `<button class="act-btn btn-brand" onclick="toggleMaintenance('${d.id}',false)">Depoya Al</button>`
      : `<button class="act-btn btn-brand" onclick="shareDevice('${d.id}')"><i class="fab fa-whatsapp"></i></button><button class="act-btn btn-soft" onclick="transferToPatient('${d.id}')">Hastaya</button><button class="act-btn btn-soft" onclick="toggleMaintenance('${d.id}',true)">Servis</button>`;

    let actionHtml = `<div class="action-row">${btns}<button class="act-btn btn-soft" onclick="editRecord('${d.id}')"><i class="fas fa-pen"></i></button><button class="act-btn btn-accent" onclick="moveToArchive('${d.id}')"><i class="fas fa-trash"></i></button></div>`;

    // If Selection Mode Active
    let selectHtml = "";
    if (isSelectionMode) {
      actionHtml = ""; // Hide buttons in selection mode
      selectHtml = `<input type="checkbox" class="bulk-check" value="${d.id}" style="width:20px; height:20px; margin-right:15px;">`;
    }

    dCont.innerHTML += `<div class="item-card"><div class="item-header" style="justify-content:flex-start">
            ${selectHtml}
            <div style="flex:1; display:flex; justify-content:space-between; align-items:center;">
                <div><div class="item-title" style="font-family:monospace; letter-spacing:1px;">${d.device}</div><div class="item-sub"><i class="fas fa-map-marker-alt"></i> ${d.service}</div></div>
                <span class="tag ${tagClass}">${status}</span>
            </div>
            </div>${actionHtml}</div>`;
  });

  if (patients.length === 0)
    pCont.innerHTML =
      "<div style='text-align:center; padding:30px; opacity:0.5'>Kayıt bulunamadı.</div>";
  if (devices.length === 0)
    dCont.innerHTML =
      "<div style='text-align:center; padding:30px; opacity:0.5'>Envanter kaydı yok.</div>";

  // Inject Delete Button if Selection Mode
  if (isSelectionMode) {
    dCont.insertAdjacentHTML(
      "afterbegin",
      `
        <div style="position:sticky; top:0; z-index:100; background:var(--bg-body); padding:10px; margin-bottom:10px; border-bottom:1px solid var(--border-solid); display:flex; justify-content:space-between; align-items:center;">
             <span style="font-weight:700; color:var(--text-main)">Toplu Silme (Yönetici)</span>
             <div>
                <button onclick="deleteSelected()" class="lux-btn" style="background:#ef4444; padding:8px 15px; font-size:12px;">SEÇİLENLERİ SİL</button>
                <button onclick="cancelSelectionMode()" class="lux-btn" style="background:var(--surface); color:var(--text-main); padding:8px 15px; font-size:12px; margin-left:5px;">İptal</button>
             </div>
        </div>`,
    );
  }
}

let isSelectionMode = false;
function startSelectionMode() {
  isSelectionMode = true;
  closeModal("settingsModal");
  switchTab("device"); // Force device tab
  refreshView();
}

function cancelSelectionMode() {
  isSelectionMode = false;
  refreshView();
}

function deleteSelected() {
  const checks = document.querySelectorAll(".bulk-check:checked");
  if (checks.length === 0) return alert("Hiçbir cihaz seçmediniz.");

  if (
    confirm(
      `Seçilen ${checks.length} adet kayıt silinecek (Geri dönüşüm kutusuna taşınacak). Onaylıyor musunuz?`,
    )
  ) {
    const batch = db.batch();
    let count = 0;
    checks.forEach((c) => {
      const ref = db.collection(col).doc(c.value);
      batch.update(ref, { isDeleted: true });
      count++;
    });

    batch.commit().then(() => {
      alert(`${count} cihaz silindi.`);
      cancelSelectionMode();
      AnalyticsService.logEvent("bulk_delete_soft", { count });
    });
  }
}

/* --- NEW ANALYTICS LOGIC --- */
/* --- NEW ANALYTICS LOGIC --- */
// Helper to get safe YYYY-MM-DD string
function getSafeDateStr(addDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + addDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function registerDressing(id) {
  document.getElementById("dateRecordId").value = id;
  setQuickDate(3); // Default +3 days
  document.getElementById("dateModal").classList.add("open");
}

// Fixed Date Logic: Uses the currently selected date in the input as the base,
// allowing "Monday + 3 Days = Thursday" logic.
function setQuickDate(days) {
  const input = document.getElementById("dressingDateInput");
  let baseDate = new Date(); // Default to today

  // If the input already has a value (user selected Monday manually), use that as base.
  if (input.value) {
    // Parse input value (YYYY-MM-DD) carefully to avoid UTC shifts
    const parts = input.value.split("-");
    if (parts.length === 3) {
      // New Date(y, mIndex, d) creates local date
      baseDate = new Date(
        parseInt(parts[0]),
        parseInt(parts[1]) - 1,
        parseInt(parts[2]),
      );
    }
  }

  // Add days
  baseDate.setDate(baseDate.getDate() + days);

  // Format back to YYYY-MM-DD
  const y = baseDate.getFullYear();
  const m = String(baseDate.getMonth() + 1).padStart(2, "0");
  const d = String(baseDate.getDate()).padStart(2, "0");

  input.value = `${y}-${m}-${d}`;

  // UI Update (Buttons)
  document
    .querySelectorAll(".quick-btn")
    .forEach((b) => b.classList.remove("active"));
  if (window.event && window.event.target.classList.contains("quick-btn")) {
    window.event.target.classList.add("active");
  }
}
window.setQuickDate = setQuickDate;

function saveDressingDate() {
  const id = document.getElementById("dateRecordId").value;
  const newDate = document.getElementById("dressingDateInput").value;
  const uSets = parseInt(document.getElementById("inpUsedSets").value) || 0;
  const uCans = parseInt(document.getElementById("inpUsedCans").value) || 0;

  if (!newDate || !id) return;

  const r = allData.find((x) => x.id === id);
  if (r) {
    // Update basic info + Increment Running Totals for Adaptive AI
    const currentSets = r.totalSets || 0;
    const currentCans = r.totalCans || 0;

    db.collection(col)
      .doc(id)
      .update({
        dateNext: newDate,
        totalSets: currentSets + uSets,
        totalCans: currentCans + uCans,
        lastDressingDate: firebase.firestore.FieldValue.serverTimestamp(),
      });

    // Log Analytics
    AnalyticsService.logEvent("dressing_done", {
      patient: r.name,
      patientNormalized: normalizeName(r.name),
      service: r.service,
      device: r.device,
      usedSets: uSets,
      usedCans: uCans,
    });

    closeModal("dateModal");
    // Reset inputs for next time
    setTimeout(() => {
      document.getElementById("inpUsedSets").value = 1;
      document.getElementById("inpUsedCans").value = 0;
    }, 500);
  }
}

async function loadAnalytics() {
  const val = document.getElementById("analyticsDate").value;
  if (!val) return;

  const listEl = document.getElementById("analytics-list");
  listEl.innerHTML =
    '<div class="spinner" style="margin:20px auto; width:30px; height:30px; border-width:3px;"></div>';

  const stats = await AnalyticsService.getStats(val);

  // Advanced Calculations
  const uniquePatients = new Set();
  let totalDressings = 0;
  let totalMaterial = 0;
  const serviceCounts = {};

  stats.forEach((s) => {
    // Track unique patients from ALL types of patient interactions
    if (s.patientNormalized) {
      uniquePatients.add(s.patientNormalized);
    } else if (s.patient) {
      uniquePatients.add(normalizeName(s.patient));
    } else if (s.name && s.type === "patient_added") {
      uniquePatients.add(normalizeName(s.name));
    }

    // Count Dressings
    if (s.type === "dressing_done") {
      totalDressings++;
      totalMaterial += s.materialCount || 0;

      // Service Stats (only for dressings as requested "who works with us most")
      const srv = (s.service || "BİLİNMİYOR").trim().toUpperCase();
      serviceCounts[srv] = (serviceCounts[srv] || 0) + 1;
    }
  });

  // Find top service
  let topService = "-";
  let maxCount = 0;
  for (const [srv, count] of Object.entries(serviceCounts)) {
    if (count > maxCount) {
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
             <span class="stat-name">TOPLAM TEDAVİ</span>
        </div>
        <div class="stat-card">
             <span class="stat-num" style="color:#f59e0b">${totalMaterial}</span>
             <span class="stat-name">SARF: SET (ADET)</span>
        </div>
        <div class="stat-card">
             <span class="stat-num" style="font-size:16px; line-height:28px; color:#6366f1">${topService}</span>
             <span class="stat-name">EN YOĞUN BİRİM</span>
        </div>
    </div>`;

  // Inject before the list
  const existingHeader = document.querySelector("#view-analytics h3");
  const existingGrid = document.querySelector("#view-analytics .stats-grid");
  if (existingGrid) existingGrid.outerHTML = gridHtml;
  else existingHeader.insertAdjacentHTML("beforebegin", gridHtml);

  // Render List
  let html = "";
  stats.forEach((s) => {
    let icon = "circle";
    let color = "#64748b";
    let text = s.type;

    switch (s.type) {
      case "patient_added":
        icon = "user-plus";
        color = "var(--primary)";
        text = `YENİ HASTA: ${s.name}`;
        break;
      case "patient_discharged":
        icon = "user-check";
        color = "#10b981";
        text = `TABURCU / BİTİŞ: ${s.patient} (${s.service})`;
        break;
      case "dressing_done":
        icon = "band-aid";
        color = "#8b5cf6";
        text = `TEDAVİ: ${s.patient} (${s.service})`;
        break;
      case "device_maintenance_start":
        icon = "tools";
        color = "#f59e0b";
        text = `TEKNİK SERVİS: ${s.device}`;
        break;
      case "device_added":
        icon = "server";
        color = "#6366f1";
        text = `YENİ ENVANTER: ${s.device}`;
        break;
      case "item_deleted_soft":
        icon = "trash";
        color = "#ef4444";
        text = `SİLİNDİ: ${s.name}`;
        break;
    }

    if (text === s.type) text = s.type.toUpperCase().replace(/_/g, " ");
    const date = s.timestamp
      ? new Date(s.timestamp.toDate()).toLocaleString("tr-TR")
      : "-";

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

  if (stats.length === 0)
    html =
      '<div style="text-align:center; padding:30px; opacity:0.5; font-size:13px;">Bu ay için veri bulunamadı.</div>';
  listEl.innerHTML = html;

  // Auto-check for consistency
  validateAnalyticsData(stats);
}

/* --- DATA CONSISTENCY LOGIC --- */
function validateAnalyticsData(stats) {
  if (!stats || stats.length === 0) return;

  // 1. Get Real Active Patients (and recently deleted ones to be safe, but mostly active)
  // Actually, analytics should reflect HISTORY.
  // BUT "Tekil Hasta" count comes from unique names in analytics.
  // If a patient was DELETED hard, they might still be in analytics (which is true history).
  // The user's issue is: "I haven't entered a patient yet but it says 1".
  // This implies a phantom record from testing or a previous state that shouldn't be there.

  // We will consider a record "Phantom" if it is a 'patient_added' or active-type event
  // but the patient does not exist in 'allData' AND hasn't been softly deleted recently.
  // However, for strict consistency as requested ("Kesin olarak girişini yapmadan..."),
  // we can check if the patient name exists in current database.

  phantomIds = [];

  // Get all known patient names (Active + Soft Deleted)
  const knownNames = new Set(
    allData
      .filter((x) => x.type === "patient")
      .map((x) => normalizeName(x.name)),
  );

  stats.forEach((s) => {
    // Check 1: 'patient_added' event but no such patient in DB
    if (s.type === "patient_added") {
      const pName = normalizeName(s.name);
      if (!knownNames.has(pName)) {
        phantomIds.push(s.id);
      }
    }

    // Check 2: 'dressing_done' but patient not in DB
    if (s.type === "dressing_done") {
      const pName = normalizeName(s.patient || s.patientNormalized);
      if (!knownNames.has(pName)) {
        phantomIds.push(s.id);
      }
    }
  });

  // Update UI
  const count = phantomIds.length;
  if (count > 0) {
    document.getElementById("phantomCount").innerText = `${count} Kayıt`;
    // Show warning button or auto-modal?
    // User asked for a plan. Let's show the modal if it's the first time or explicitly requested.
    // For auto-check, maybe just highlight the sync button?
    // We'll auto-show modal ONLY if explicit sync or critical mismatch.
    // Let's stick to the plan: "Sistem her açıldığında... uyar"

    // Show a visual cue near sync button
    const btn = document.querySelector("#syncBtnContainer button");
    if (btn) {
      btn.style.borderColor = "#ef4444";
      btn.style.color = "#ef4444";
      btn.innerHTML = `<i class="fas fa-exclamation-triangle"></i> DÜZELTME GEREKLİ (${count})`;
    }
  } else {
    const btn = document.querySelector("#syncBtnContainer button");
    if (btn) {
      btn.style.borderColor = "var(--primary)";
      btn.style.color = "var(--primary)";
      btn.innerHTML = `<i class="fas fa-sync" style="margin-right:5px;"></i> VERİ SENKRONİZASYONU`;
    }
  }
}

function syncAnalyticsData() {
  // 1. Force Reload
  document.getElementById("analytics-list").innerHTML =
    '<div class="spinner"></div>';
  loadAnalytics().then(() => {
    // 2. If phantom data found, open modal
    if (phantomIds.length > 0) {
      document.getElementById("dataCleanupModal").classList.add("open");
    } else {
      alert("✅ Veriler senkronize. Sorun tespit edilmedi.");
    }
  });
}

function cleanPhantomData() {
  if (phantomIds.length === 0) return alert("Silinecek veri yok.");

  if (
    confirm(
      `Tespit edilen ${phantomIds.length} adet geçersiz kayıt silinecek ve istatistikler düzeltilecek.\nOnaylıyor musunuz?`,
    )
  ) {
    AnalyticsService.deletePhantomRecords(phantomIds).then((count) => {
      alert(`${count} adet kayıt temizlendi.`);
      closeModal("dataCleanupModal");
      loadAnalytics(); // Reload to see clean state
    });
  }
}

// Global Application Logic
const col = _SYS_CFG.cols.rec;
let allData = [];
let notifications = [];
let currentLocFilter = "TÜMÜ";
let savedNumber = localStorage.getItem("trioAdminNumber") || "";
let phantomIds = []; // Lists IDs of detected phantom records

// Initialize
(function checkSession() {
  if (localStorage.getItem("trioLoggedIn") === "true") {
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("mainApp").style.display = "block";
    startApp();

    // Resume session tracking if page refreshed
    if (!localStorage.getItem("trioSessionId")) {
      startTrackingSession("main", "admin");
    } else {
      startRemoteCommandListener();
    }
  }
})();

async function checkLogin() {
  // ACCESS CONTROL
  try {
    // Force server fetch to avoid stale cache
    const accessDoc = await db
      .collection(_SYS_CFG.cols.sys_set)
      .doc("panelAccess")
      .get({ source: "server" });
    if (accessDoc.exists && accessDoc.data().main === false) {
      return alert("⛔ Ana yönetim paneli şu anda kilitlidir.");
    }

    const maintDoc = await db
      .collection(_SYS_CFG.cols.sys_set)
      .doc("maintenance")
      .get({ source: "server" });
    if (maintDoc.exists && maintDoc.data().enabled === true) {
      return alert(
        `🔧 ${maintDoc.data().message || "Sistem şu anda bakım modundadır."}`,
      );
    }
  } catch (e) {
    console.warn(
      "Access check failed (network might be down), trying cache...",
      e,
    );
    // Fallback to cache if server fails
    try {
      const maintDocCache = await db
        .collection(_SYS_CFG.cols.sys_set)
        .doc("maintenance")
        .get();
      if (maintDocCache.exists && maintDocCache.data().enabled)
        return alert("🔧 Sistem bakımda (Çevrimdışı Mod).");
    } catch (ex) {}
  }

  if (document.getElementById("passwordInput").value === "0000") {
    localStorage.setItem("trioLoggedIn", "true");
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("mainApp").style.display = "block";

    // TRACKER
    startTrackingSession("main", "admin").then(() => {
      logAction("login", { panel: "main", method: "pin" });
    });

    AnalyticsService.logEvent("login", { type: "manual" });
    startApp();
  } else {
    logAction("login_failed", { panel: "main", attemptedPin: "****" });
    alert("Erişim Reddedildi: Geçersiz Güvenlik Kodu.");
  }
}

async function logout() {
  await logAction("logout", { panel: "main" });
  await endTrackingSession();
  localStorage.removeItem("trioLoggedIn");
  window.location.reload();
}

function startApp() {
  document.getElementById("loader").style.display = "flex";
  if (localStorage.getItem("theme") === "dark")
    document.body.classList.add("dark-mode");

  // Default date +3 days
  const d = new Date();
  d.setDate(d.getDate() + 3);
  document.getElementById("inpDate").value = d.toISOString().split("T")[0];

  // Set default month for analytics
  document.getElementById("analyticsDate").value = new Date()
    .toISOString()
    .slice(0, 7);

  // Realtime listeners
  db.collection(col).onSnapshot((snap) => {
    allData = [];
    snap.forEach((doc) => allData.push({ id: doc.id, ...doc.data() }));
    document.getElementById("loader").style.display = "none";
    refreshView();
    updateStats();
    checkAndFixData(); // Auto Check
  });

  db.collection(_SYS_CFG.cols.ntf)
    .orderBy("timestamp", "desc")
    .onSnapshot((snap) => {
      notifications = [];
      snap.forEach((doc) => notifications.push({ id: doc.id, ...doc.data() }));
      updateBadge();
    });
}

/* --- CORE FUNCTIONS --- */
// Utility: Normalize Name
// (already defined at top, but ensure it's not duplicated in full file)

function renderLocationButtons(groups, total) {
  const container = document.getElementById("locationFilters");
  const sorted = Object.keys(groups).sort();
  let html = `<button class="filter-chip ${currentLocFilter === "TÜMÜ" ? "active" : ""}" onclick="setLocFilter('TÜMÜ')">TÜMÜ <span>(${total})</span></button>`;
  sorted.forEach((l) => {
    html += `<button class="filter-chip ${currentLocFilter === l ? "active" : ""}" onclick="setLocFilter('${l}')">${l} <span>(${groups[l]})</span></button>`;
  });
  container.innerHTML = html;
}

function updateBadge() {
  const n = notifications.filter((x) => !x.isRead).length;
  const b = document.getElementById("notifBadge");
  b.style.display = n > 0 ? "block" : "none";
}

function openNotifications() {
  const l = document.getElementById("notifList");
  l.innerHTML = "";
  if (notifications.length === 0)
    l.innerHTML =
      "<p style='text-align:center;opacity:0.5;padding:20px'>Bildirim bulunmamaktadır.</p>";

  notifications.forEach((n) => {
    let i = "info-circle",
      t = "Bilgi";
    if (n.type === "transfer") {
      i = "exchange-alt";
      t = "Birim Transferi";
    }
    if (n.type === "return") {
      i = "box";
      t = "Depo İade";
    }
    if (n.type === "problem") {
      i = "exclamation-triangle";
      t = "Teknik Servis Talebi";
    }
    if (n.type === "new_patient") {
      i = "procedures";
      t = "Yeni Hasta Kaydı";
    }

    const time = n.timestamp
      ? new Date(n.timestamp.toDate()).toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";
    l.innerHTML += `<div class="notif-item ${!n.isRead ? "unread" : ""}"><div class="notif-icon"><i class="fas fa-${i}"></i></div><div style="flex:1"><h4 style="font-size:14px;font-weight:700;margin-bottom:4px">${t}</h4><p style="font-size:12px;color:var(--text-sub)">${n.nurse} (${n.service})<br><b>${n.deviceCode}</b>: ${n.note}</p><span style="font-size:10px;opacity:0.5">${time}</span></div></div>`;
    if (!n.isRead)
      db.collection(_SYS_CFG.cols.ntf)
        .doc(n.id)
        .update({ isRead: true });
  });
  document.getElementById("notifModal").classList.add("open");
}

function clearNotifications() {
  if (confirm("Silinsin mi?")) {
    notifications.forEach((n) =>
      db.collection(_SYS_CFG.cols.ntf).doc(n.id).delete(),
    );
    closeModal("notifModal");
  }
}

function setLocFilter(l) {
  currentLocFilter = l;
  refreshView();
}

function transferToDevice(id) {
  const n = prompt("Hedef Depo/Konum Giriniz:", "Ana Depo");
  if (n) {
    const rec = allData.find((x) => x.id === id);
    db.collection(col)
      .doc(id)
      .update({
        type: "device",
        name: "MÜSAİT",
        service: n,
        dateNext: firebase.firestore.FieldValue.delete(),
      });

    AnalyticsService.logEvent("patient_discharged", {
      patient: rec.name,
      patientNormalized: normalizeName(rec.name),
      device: rec.device,
      service: n,
    });
  }
}

function transferToPatient(id) {
  const r = allData.find((x) => x.id === id);
  openModal("new");
  document.getElementById("editId").value = id;
  document.getElementById("editType").value = "patient";
  document.getElementById("inpDevice").value = r.device;
  document.getElementById("inpService").value = r.service;
  setType("patient");
}

function toggleMaintenance(id, m) {
  if (
    confirm(
      m
        ? "Cihaz teknik servise alınsın mı?"
        : "Cihaz tekrar depoya (müsait) alınsın mı?",
    )
  ) {
    const rec = allData.find((x) => x.id === id);
    db.collection(col)
      .doc(id)
      .update({ type: m ? "maintenance" : "device" });

    AnalyticsService.logEvent(
      m ? "device_maintenance_start" : "device_maintenance_end",
      {
        device: rec.device,
        service: rec.service,
      },
    );
  }
}

function moveToArchive(id) {
  if (
    confirm(
      "Bu kaydı silip geri dönüşüm kutusuna taşımak istediğinize emin misiniz?",
    )
  ) {
    const rec = allData.find((x) => x.id === id);
    db.collection(col).doc(id).update({
      isDeleted: true,
      deletedAt: Date.now(),
    });

    logAction("soft_delete", {
      type: rec.type,
      id: id,
      name: rec.name || rec.device,
    });
    AnalyticsService.logEvent("item_deleted_soft", { type: rec.type, id });

    showNotification(`${rec.name || rec.device} çöp kutusuna taşındı.`);
  }
}

function openTrash() {
  closeModal("settingsModal");
  document.getElementById("trashModal").classList.add("open");
  const l = document.getElementById("trashList");
  l.innerHTML = "";

  const deleted = allData.filter((x) => x.isDeleted);
  if (deleted.length === 0) {
    l.innerHTML =
      "<p style='text-align:center; padding:20px; opacity:0.5'>Geri dönüşüm kutusu boş.</p>";
    return;
  }

  deleted.forEach((x) => {
    l.innerHTML += `
        <div class="trash-row">
            <div class="trash-info">${x.name || x.device} <span style="opacity:0.5; font-weight:400">(${x.service})</span></div>
            <div class="trash-actions">
                <button class="trash-btn tb-restore" onclick="restore('${x.id}')">Geri Al</button>
                <button class="trash-btn tb-delete" onclick="hardDelete('${x.id}')">Kalıcı Sil</button>
            </div>
        </div>`;
  });
}

function restore(id) {
  db.collection(col).doc(id).update({ isDeleted: false });
  openTrash();
  AnalyticsService.logEvent("item_restored", { id });
}

function hardDelete(id) {
  if (confirm("DİKKAT: Veri kalıcı olarak silinecek. Onaylıyor musunuz?")) {
    db.collection(col).doc(id).delete();
    openTrash();
    AnalyticsService.logEvent("item_deleted_hard", { id });
  }
}

function emptyTrash() {
  if (
    confirm(
      "DİKKAT: Çöp kutusundaki TÜM veriler kalıcı olarak silinecek!\nBu işlemin geri dönüşü YOKTUR.\n\nDevam etmek istiyor musunuz?",
    )
  ) {
    const deleted = allData.filter((x) => x.isDeleted);
    if (deleted.length === 0) return alert("Çöp kutusu zaten boş.");

    const batch = db.batch();
    deleted.forEach((doc) => {
      const ref = db.collection(col).doc(doc.id);
      batch.delete(ref);
    });

    batch.commit().then(() => {
      alert("Çöp kutusu boşaltıldı.");
      openTrash();
      AnalyticsService.logEvent("trash_emptied", { count: deleted.length });
    });
  }
}

function normalizeDeviceCode(code) {
  if (!code) return "";
  // Remove all spaces, convert to uppercase, and replace Turkish chars just in case
  return code.replace(/\s+/g, "").toLocaleUpperCase("tr-TR");
}

function normalizeText(txt) {
  if (!txt) return "";
  return txt.toLocaleUpperCase("tr-TR").trim();
}

function commitRecord() {
  const id = document.getElementById("editId").value,
    rawType = document.getElementById("editType").value;
  const s = normalizeText(document.getElementById("inpService").value);

  // Map bulk/device to 'device' type internally for storage, unless it is bulk logic handling
  let t = rawType === "bulk" ? "device" : rawType;

  // --- BULK MODE HANDLER ---
  if (rawType === "bulk") {
    const rawBulk = document.getElementById("inpDeviceBulk").value;
    const lines = rawBulk
      .split(/\r?\n/)
      .map((l) => normalizeDeviceCode(l))
      .filter((l) => l.length > 0);

    if (lines.length === 0)
      return alert("Lütfen en az bir adet seri no giriniz.");

    // ... (bulk logic same, using normalized code)
    // Ensure Service is kept normalized

    let addedCount = 0;
    let errorMsg = "";

    const batch = db.batch();

    lines.forEach((code) => {
      const existing = allData.find(
        (x) => normalizeDeviceCode(x.device) === code && !x.isDeleted,
      );
      if (existing) {
        errorMsg += `${code}: Mükerrer Kayıt (${existing.service})\n`;
      } else {
        const newRef = db.collection(col).doc();
        batch.set(newRef, {
          type: t,
          service: s, // Uppercase
          device: code, // Uppercase
          name: "MÜSAİT",
          isDeleted: false,
          createdAt: Date.now(),
        });
        addedCount++;
      }
    });

    if (addedCount > 0) {
      batch.commit().then(() => {
        let msg = `${addedCount} cihaz başarıyla eklendi.`;
        if (errorMsg) msg += `\n\nEklenemeyenler:\n${errorMsg}`;
        alert(msg);
        closeModal("modal");
        AnalyticsService.logEvent("bulk_device_added", { count: addedCount });
      });
    } else {
      alert("Hiçbir cihaz eklenemedi.\n" + errorMsg);
    }
    return;
  }
  // --- END BULK MODE ---

  // Normalize Input Code
  const rawDevice = document.getElementById("inpDevice").value;
  const d = normalizeDeviceCode(rawDevice);

  let data = { type: t, service: s, device: d, isDeleted: false };

  // DUPLICATE CHECK
  const existing = allData.find(
    (x) => normalizeDeviceCode(x.device) === d && !x.isDeleted && x.id !== id,
  );
  if (existing) {
    return alert(
      `Bu cihaz kodu (${d}) zaten sisteme kayıtlı!\nKonum: ${existing.service}\nDurum: ${existing.type !== "device" ? existing.name : "Müsait"}`,
    );
  }

  if (t === "patient") {
    data.name = normalizeText(document.getElementById("inpName").value);
    data.dateNext = document.getElementById("inpDate").value;
    if (!data.name) return alert("Lütfen hasta adını giriniz.");

    // MOD: Save Initial Consumables for New Patient
    if (!id) {
        data.totalSets = parseInt(document.getElementById('inpInitSets').value) || 0;
        data.totalCans = parseInt(document.getElementById('inpInitCans').value) || 0;
    }
  } else {
    data.name = "MÜSAİT";
  }
  // ... saving logic continues

  if (id) {
    db.collection(col).doc(id).update(data);
    logAction("update", { type: t, id: id, data: data });
    AnalyticsService.logEvent("record_updated", { type: t, id });
  } else {
    data.createdAt = Date.now();
    data.isDeleted = false;
    db.collection(col)
      .add(data)
      .then((docRef) => {
        logAction("create", { type: t, id: docRef.id, data: data });
        AnalyticsService.logEvent(
          t === "patient" ? "patient_added" : "device_added",
          {
            id: docRef.id,
            name: data.name || data.device,
          },
        );
      });
  }
  closeModal("modal");
}

function editRecord(id) {
  const r = allData.find((x) => x.id === id);
  openModal("new");
  document.getElementById("editId").value = id;
  setType(r.type === "maintenance" ? "device" : r.type);
  document.getElementById("inpService").value = r.service;
  document.getElementById("inpDevice").value = r.device;
  if (r.type === "patient") {
    document.getElementById("inpName").value = r.name;
    document.getElementById("inpDate").value = r.dateNext;
  }
}

function sharePatient(id) {
  const p = allData.find((x) => x.id === id);
  window.open(
    `https://api.whatsapp.com/send?phone=${savedNumber}&text=${encodeURIComponent(`*HASTA KAYDI:* ${p.name}\n*BİRİM:* ${p.service}\n*CİHAZ:* ${p.device}\n*TARİH:* ${formatDate(p.dateNext)}`)}`,
    "_blank",
  );

  AnalyticsService.logEvent("report_shared", {
    type: "patient",
    patient: p.name,
  });
}

function shareDevice(id) {
  const d = allData.find((x) => x.id === id);
  window.open(
    `https://api.whatsapp.com/send?phone=${savedNumber}&text=${encodeURIComponent(`*MÜSAİT ENVANTER*\n*KOD:* ${d.device}\n*KONUM:* ${d.service}`)}`,
    "_blank",
  );
}

function setType(t) {
  document.getElementById("editType").value = t;

  // UI States
  const isP = t === "patient";
  const isD = t === "device";
  const isB = t === "bulk";

  // Button Styles
  document.getElementById("btnTypePat").className = isP
    ? "act-btn btn-brand"
    : "act-btn btn-soft";
  document.getElementById("btnTypeDev").className = isD
    ? "act-btn btn-brand"
    : "act-btn btn-soft";
  document.getElementById("btnTypeBulk").className = isB
    ? "act-btn btn-brand"
    : "act-btn btn-soft";

  // Fields Visibility
  document.getElementById("patientFields").style.display = isP
    ? "block"
    : "none";

  // Manage Inputs
  const singleInp = document.getElementById("inpDevice");
  const bulkDiv = document.getElementById("bulkEntrySection");
  const bulkBtn = document.getElementById("btnBulkToggle"); // Legacy toggle
  if (bulkBtn) bulkBtn.style.display = "none"; // Hide legacy toggle as we have main button now

  if (isB) {
    // Bulk Mode
    isBulkMode = true;
    singleInp.style.display = "none";
    bulkDiv.style.display = "block";
    // Ensure input device group is visible but just hide the single input
    document.getElementById("deviceInputGroup").style.display = "block";
  } else {
    // Normal Mode (Patient or Single Device)
    isBulkMode = false;
    singleInp.style.display = "block";
    bulkDiv.style.display = "none";

    // If patient, hide device input entirely? No, keep it for linking device
    // But if device, show it.
    document.getElementById("deviceInputGroup").style.display = "block";
  }
}

function openModal(m) {
  document.getElementById("modal").classList.add("open");
  if (m === "new") {
    document.getElementById("editId").value = "";
    document.getElementById("inpName").value = "";
    document.getElementById("inpService").value = "";
    document.getElementById("inpDevice").value = "";
    document.getElementById("inpDeviceBulk").value = ""; // Clear bulk too
    isBulkMode = false; // Reset mode
    document.getElementById("inpDevice").style.display = "block";
    document.getElementById("bulkEntrySection").style.display = "none";

    setType("patient");
  }
}

let isBulkMode = false;
function toggleBulkEntry() {
  isBulkMode = !isBulkMode;
  const singleInp = document.getElementById("inpDevice");
  const bulkDiv = document.getElementById("bulkEntrySection");
  const btn = document.getElementById("btnBulkToggle");

  if (isBulkMode) {
    singleInp.style.display = "none";
    bulkDiv.style.display = "block";
    if (btn) btn.innerHTML = '<i class="fas fa-times"></i> TEKLİ GİRİŞE DÖN';
  } else {
    singleInp.style.display = "block";
    bulkDiv.style.display = "none";
    if (btn)
      btn.innerHTML = '<i class="fas fa-layer-group"></i> TOPLU GİRİŞ AÇ';
  }
}

function closeModal(id) {
  document.getElementById(id).classList.remove("open");
}

function toggleHelp() {
  document.getElementById("helpModal").classList.add("open");
}

function openSettings() {
  document.getElementById("settingsModal").classList.add("open");
  document.getElementById("adminNumber").value = savedNumber;
}

function saveSettings() {
  savedNumber = document.getElementById("adminNumber").value.replace(/\D/g, "");
  localStorage.setItem("trioAdminNumber", savedNumber);
  closeModal("settingsModal");
}

function switchTab(v, b) {
  document
    .querySelectorAll(".view-section")
    .forEach((x) => (x.style.display = "none"));
  document.getElementById("view-" + v).style.display = "block";
  document
    .querySelectorAll(".dock-btn")
    .forEach((x) => x.classList.remove("active"));
  if (b) b.classList.add("active");

  // Load analytics if tab is selected
  if (v === "analytics") loadAnalytics();
}

function getDiff(d) {
  const df = Math.ceil(
    (new Date(d) - new Date().setHours(0, 0, 0, 0)) / 86400000,
  );
  if (df === 0) return { days: 0, text: "BUGÜN" };
  if (df === 1) return { days: 1, text: "YARIN" };
  if (df < 0) return { days: -1, text: "GECİKTİ" };
  return { days: df, text: df + " GÜN" };
}

function formatDate(d) {
  return d ? new Date(d).toLocaleDateString("tr-TR") : "-";
}

function updateStats() {
  const active = allData.filter((x) => !x.isDeleted);
  document.getElementById("stPat").innerText = active.filter(
    (x) => x.type === "patient",
  ).length;
  document.getElementById("stDev").innerText = active.filter(
    (x) => x.type === "device",
  ).length;
  document.getElementById("stMaint").innerText = active.filter(
    (x) => x.type === "maintenance",
  ).length;
  document.getElementById("stUrg").innerText = active.filter(
    (x) => x.type === "patient" && getDiff(x.dateNext).days <= 0,
  ).length;
}

function toggleTheme() {
  document.body.classList.toggle("dark-mode");
  localStorage.setItem(
    "theme",
    document.body.classList.contains("dark-mode") ? "dark" : "light",
  );
}

function exportMasterExcel() {
  const activeData = allData.filter((x) => !x.isDeleted);
  let sortedData = [];
  activeData
    .filter((x) => x.type === "device")
    .forEach((x) =>
      sortedData.push({
        d: "MÜSAİT",
        c: x.device,
        k: x.service,
        i: "-",
        t: "-",
      }),
    );
  activeData
    .filter((x) => x.type === "maintenance")
    .forEach((x) =>
      sortedData.push({
        d: "TEKNİK SERVİS",
        c: x.device,
        k: x.service,
        i: "-",
        t: "-",
      }),
    );
  activeData
    .filter((x) => x.type === "patient")
    .forEach((x) =>
      sortedData.push({
        d: x.name,
        c: x.device,
        k: x.service,
        i: x.dateNext,
        t: getDiff(x.dateNext).text,
      }),
    );

  let csv = "\uFEFFDURUM;CIHAZ KODU;SERVIS/KONUM;HASTA ADI;PANSUMAN TARIHI\n";
  sortedData.forEach(
    (r) => (csv += `${r.d};"${r.c}";"${r.k}";"${r.i}";${r.t}\n`),
  );

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `Trio_Rapor.csv`;
  link.click();
}

async function resetMonthlyAnalytics() {
  const month = document.getElementById("analyticsDate").value;
  if (!month) return alert("Lütfen önce bir tarih seçin.");

  const pw = prompt("Verileri silmek için yönetici şifresini girin:");
  if (pw !== "5959") {
    return alert("Hatalı Şifre! İşlem iptal edildi.");
  }

  if (
    confirm(
      `${month} tarihli TÜM analitik verileri kalıcı olarak silinecek. Emin misiniz?`,
    )
  ) {
    if (confirm("Bu işlem geri alınamaz! Son onay?")) {
      await AnalyticsService.clearStats(month);
      alert("Veriler temizlendi.");
      loadAnalytics();
    }
  }
}

function findDuplicates() {
  const activeData = allData.filter((x) => !x.isDeleted);
  const seen = {};
  const duplicates = [];

  activeData.forEach((item) => {
    const code = normalizeDeviceCode(item.device);
    if (seen[code]) {
      seen[code].push(item);
    } else {
      seen[code] = [item];
    }
  });

  for (const code in seen) {
    if (seen[code].length > 1) {
      duplicates.push({
        code: code,
        items: seen[code],
      });
    }
  }

  if (duplicates.length === 0) {
    alert("Harika! Sistemde mükerrer (aynı kodlu) cihaz bulunamadı. ✅");
  } else {
    let msg = `⚠️ TOPLAM ${duplicates.length} ADET MÜKERRER KAYIT BULUNDU:\n\n`;
    duplicates.forEach((d) => {
      msg += `BARKOD: ${d.code}\n`;
      d.items.forEach((i) => {
        msg += `- Konum: ${i.service}, Durum: ${i.name}\n`;
      });
      msg += `------------------------\n`;
    });
    alert(msg);
    console.table(duplicates);
  }
}

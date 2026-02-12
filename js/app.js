console.log("APP.JS LOADED - Starting...");
// Utility: Normalize Name
const normalizeName = (name) => {
  if (!name) return "";
  return name.trim().replace(/\s+/g, " ").toLocaleUpperCase("tr-TR");
};

// Global state variables
let isBulkTransferMode = false;


function refreshView() {
  const pCont = document.getElementById("list-patient");
  const dCont = document.getElementById("list-device");
  const pSrc = document
    .getElementById("srcPat")
    .value.toLocaleLowerCase("tr-TR");
  const dSrc = document
    .getElementById("srcDev")
    .value.toLocaleLowerCase("tr-TR");

  pCont.innerHTML = "";
  dCont.innerHTML = "";
  const activeData = allData.filter((x) => !x.isDeleted);

  let patients = activeData.filter(
    (x) =>
      x.type === "patient" &&
      (x.name + x.service + x.device).toLocaleLowerCase("tr-TR").includes(pSrc),
  );
  patients.sort((a, b) => new Date(a.dateNext) - new Date(b.dateNext));

  patients.forEach((p) => {
    const diff = getDiff(p.dateNext);
    const tagColor = diff.days <= 0 ? "#ef4444" : "#10b981";
    const serviceColor = getServiceColor(p.service);
    
    // Smart Info Calculations
    const lastDressingDate = p.lastDressingDate 
        ? new Date(p.lastDressingDate.toDate()).toLocaleDateString('tr-TR')
        : null;
    
    const daysSinceLastDressing = p.lastDressingDate
        ? Math.floor((Date.now() - p.lastDressingDate.toDate()) / (1000 * 60 * 60 * 24))
        : null;
    
    const dressingCount = p.dressingCount || 0;
    const totalMaterials = (p.totalSets || 0) + (p.totalCans || 0);

    pCont.innerHTML += `
        <div class="item-card">
            <div class="item-header">
                <div>
                    <div class="item-title">${p.name}</div>
                    <div class="item-sub">
                        <span style="color:${serviceColor}; font-weight:700;">
                            <i class="fas fa-map-marker-alt"></i> ${p.service}
                        </span> 
                        &nbsp;•&nbsp; ${p.device}
                        ${p.notes 
                            ? `<br><span style="font-size:10px; color:#f59e0b; font-weight:600; margin-top:3px; display:inline-block;">
                                 <i class="fas fa-sticky-note"></i> ${p.notes.substring(0, 50)}${p.notes.length > 50 ? '...' : ''}
                               </span>`
                            : ''}
                        ${daysSinceLastDressing !== null 
                            ? `<br><span style="font-size:10px; opacity:0.7; margin-top:3px; display:inline-block;">
                                 <i class="fas fa-history"></i> Son: ${daysSinceLastDressing} gün önce
                               </span>`
                            : ''}
                        ${dressingCount > 0 
                            ? `<br><span style="font-size:10px; opacity:0.7;">
                                 <i class="fas fa-procedures"></i> ${dressingCount} tedavi • ${totalMaterials} malzeme
                               </span>`
                            : ''}
                    </div>
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
    // Normalize: trim spaces AND collapse multiple spaces into one
    const n = d.service.trim().replace(/\s+/g, ' ').toLocaleUpperCase("tr-TR");
    if (!locGroups[n]) locGroups[n] = 0;
    locGroups[n]++;
  });
  renderLocationButtons(locGroups, allDevices.length);

  let devices = allDevices.filter((x) =>
    (x.device + x.service).toLocaleLowerCase("tr-TR").includes(dSrc),
  );
  if (currentLocFilter !== "TÜMÜ") {
    if (currentLocFilter === "BAKIM") {
      devices = devices.filter((x) => x.type === "maintenance");
    } else {
      devices = devices.filter(
        (x) =>
          x.service &&
          x.service.trim().toLocaleUpperCase("tr-TR") === currentLocFilter,
      );
    }
  }

  devices.forEach((d) => {
    const isMaint = d.type === "maintenance";
    const tagClass = isMaint ? "orange" : "blue";
    const status = isMaint ? "TEKNİK SERVİS" : "ANA DEPO / MÜSAİT";
    const btns = isMaint
      ? `<button class="act-btn btn-brand" onclick="toggleMaintenance('${d.id}',false)">Depoya Al</button>`
      : `<button class="act-btn btn-brand" onclick="shareDevice('${d.id}')"><i class="fab fa-whatsapp"></i></button><button class="act-btn btn-soft" onclick="transferToPatient('${d.id}')">Hastaya</button><button class="act-btn btn-soft" onclick="toggleMaintenance('${d.id}',true)">Servis</button>`;

    let actionHtml = `<div class="action-row">${btns}<button class="act-btn btn-soft" onclick="editRecord('${d.id}')"><i class="fas fa-pen"></i></button><button class="act-btn btn-accent" onclick="moveToArchive('${d.id}')"><i class="fas fa-trash"></i></button></div>`;

    // If Selection Mode Active or Bulk Transfer Mode
    let selectHtml = "";
    if (isSelectionMode || isBulkTransferMode) {
      actionHtml = ""; // Hide buttons in selection mode
      const chkClass = isSelectionMode ? 'del-check' : 'bulk-check';
      selectHtml = `<input type="checkbox" class="${chkClass}" value="${d.id}" style="width:20px; height:20px; margin-right:15px;">`;
    }

    dCont.innerHTML += `<div class="item-card"><div class="item-header" style="justify-content:flex-start">
            ${selectHtml}
            <div style="flex:1; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <div class="item-title" style="font-family:monospace; letter-spacing:1px;">${d.device}</div>
                    <div class="item-sub">
                        <i class="fas fa-map-marker-alt"></i> ${d.service}
                        ${isMaint && d.maintenanceReason ? `<br><span style="color:#f59e0b; font-weight:600;"><i class="fas fa-wrench"></i> ${d.maintenanceReason}</span>` : ""}
                    </div>
                </div>
                <span class="tag ${tagClass}">${status}</span>
            </div>
            </div>${actionHtml}</div>`;

    if (isBulkTransferMode) {
        // We need to inject the header only once, but here we are in loop.
        // Better place is outside loop.
        // However, refreshView Logic structure in this file clears container first.
        // So we can prepend to dCont after loop or handle it differently.
        // Let's use the same logic as Selection Mode which probably injects header
        // Wait, Selection Mode logic is inside render?
        // Let's check where startSelectionMode injects header.
        // It injects straight to dCont.
        // But refreshView clears dCont.
        // So we should inject header at the top of dCont if mode is active.
    }
  });

  if (isBulkTransferMode) {
    dCont.insertAdjacentHTML('afterbegin', `
        <div style="position:sticky; top:0; z-index:100; background:var(--bg-body); padding:10px; margin-bottom:10px; border-bottom:1px solid var(--border-solid); display:flex; justify-content:space-between; align-items:center;">
             <span style="font-weight:700; color:var(--text-main)">Toplu Transfer (Yönetici)</span>
             <div>
                <button onclick="transferSelected()" class="lux-btn" style="background:#6366f1; padding:8px 15px; font-size:12px;">SEÇİLENLERİ TRANSFER ET</button>
                <button onclick="cancelBulkTransferMode()" class="lux-btn" style="background:var(--surface); color:var(--text-main); padding:8px 15px; font-size:12px; margin-left:5px;">İptal</button>
             </div>
        </div>
    `);
  }


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

      if (typeof logAction === "function") {
        logAction("bulk_delete", { count: count });
      }
    });
  }
}

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
function setQuickDate(days, btnEl) {
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
  if (btnEl && btnEl.classList && btnEl.classList.contains("quick-btn")) {
    btnEl.classList.add("active");
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
        dressingCount: firebase.firestore.FieldValue.increment(1),
        lastDressingDate: firebase.firestore.FieldValue.serverTimestamp(),
      });

    // Log Analytics & Audit
    AnalyticsService.logEvent("dressing_done", {
      patient: r.name,
      patientNormalized: normalizeName(r.name),
      service: r.service,
      device: r.device,
      usedSets: uSets,
      usedCans: uCans,
    });

    // AUDIT LOG
    if (typeof logAction === "function") {
      logAction("dressing_record", {
        patient: r.name,
        service: r.service,
        sets: uSets,
        cans: uCans,
      });
    }

    closeModal("dateModal");
    // Reset inputs for next time
    setTimeout(() => {
      document.getElementById("inpUsedSets").value = 1;
      document.getElementById("inpUsedCans").value = 0;
    }, 500);
    
    if(typeof updateRecentActivity === 'function') updateRecentActivity();
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
  
  // Get list of already dismissed phantom IDs from localStorage
  const dismissedPhantoms = JSON.parse(localStorage.getItem('dismissedPhantoms') || '[]');

  // Get all known patient names (Active + Soft Deleted + ALL)
  // Include ALL patients ever recorded, even if deleted
  const knownNames = new Set(
    allData
      .filter((x) => x.type === "patient" || x.name) // Include any record with a name
      .map((x) => normalizeName(x.name)),
  );

  stats.forEach((s) => {
    // Check patient-related events for phantom data
    const patientEventTypes = [
      'patient_added', 
      'dressing_done', 
      'patient_discharged',
      'device_added',
      'device_maintenance_start',
      'device_maintenance_end'
    ];
    
    if (patientEventTypes.includes(s.type)) {
      // For patient events, check if patient exists
      if (s.type.startsWith('patient') || s.type === 'dressing_done') {
        const pName = normalizeName(s.name || s.patient || s.patientNormalized);
        if (pName && !knownNames.has(pName)) {
          phantomIds.push(s.id);
        }
      }
    }
    
    // Also check for any analytics record where normalized patient doesn't exist
    if (s.patientNormalized && !knownNames.has(s.patientNormalized)) {
      if (!phantomIds.includes(s.id)) {
        phantomIds.push(s.id);
      }
    }
  });

  // Filter out already dismissed phantoms (those that were deleted but still in cache)
  phantomIds = phantomIds.filter(id => !dismissedPhantoms.includes(id));

  // Update UI
  const count = phantomIds.length;
  
  // DEBUG: Log phantom records to console
  if (count > 0) {
    console.log("=== PHANTOM KAYITLAR ===");
    phantomIds.forEach(id => {
      const record = stats.find(s => s.id === id);
      console.log("Phantom Record:", id, record);
    });
    console.log("========================");
  }
  
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
    // Create a copy of IDs to delete
    const idsToDelete = [...phantomIds];
    console.log("[Cleanup] Deleting phantom records:", idsToDelete);
    
    AnalyticsService.deletePhantomRecords(idsToDelete)
      .then((count) => {
        console.log("[Cleanup] Deleted:", count);
        
        // Save deleted IDs to localStorage so they won't be detected again (cache workaround)
        const dismissed = JSON.parse(localStorage.getItem('dismissedPhantoms') || '[]');
        idsToDelete.forEach(id => {
          if (!dismissed.includes(id)) dismissed.push(id);
        });
        localStorage.setItem('dismissedPhantoms', JSON.stringify(dismissed));
        
        // Clear the phantom array
        phantomIds = [];
        
        // Wait 1 second for Firestore to propagate deletion, then reload
        return new Promise(resolve => setTimeout(resolve, 1000));
      })
      .then(() => {
        // Reload analytics and re-validate
        return loadAnalytics();
      })
      .then(() => {
        // After reload, check if there are still phantoms
        if (phantomIds.length === 0) {
          alert("✅ Tüm geçersiz kayıtlar temizlendi!");
          closeModal("dataCleanupModal");
          // Reset the warning button
          const btn = document.querySelector("#syncBtnContainer button");
          if (btn) {
            btn.style.borderColor = "var(--primary)";
            btn.style.color = "var(--primary)";
            btn.innerHTML = `<i class="fas fa-sync" style="margin-right:5px;"></i> VERİ SENKRONİZASYONU`;
          }
        } else {
          // Still some phantoms - update count
          document.getElementById("phantomCount").innerText = `${phantomIds.length} Kayıt`;
          alert(`⚠️ ${phantomIds.length} adet kayıt hala düzeltme bekliyor. Tekrar deneyin.`);
        }
      })
      .catch(err => {
        console.error("[Cleanup] Error:", err);
        alert("Hata oluştu: " + err.message);
      });
  }
}

// Global Application Logic
const col = _SYS_CFG && _SYS_CFG.cols ? _SYS_CFG.cols.rec : "trio_records";
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
  const enteredPass = document.getElementById("passwordInput").value;

  if (enteredPass === "0000") {
    // --- BASİTLEŞTİRİLMİŞ GİRİŞ ---
    localStorage.setItem("trioLoggedIn", "true");
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("mainApp").style.display = "block";

    // Tracker & Başlangıç (Hata olsa bile devam et)
    try {
      startTrackingSession("main", "admin")
        .then(() => logAction("login", { panel: "main", method: "pin" }))
        .catch((e) => console.warn("Tracker error:", e));

      AnalyticsService.logEvent("login", { type: "manual" });
    } catch (e) {}

    startApp();
  } else {
    try {
      logAction("login_failed", { panel: "main", attemptedPin: "****" });
    } catch (e) {}
    alert("Erişim Reddedildi: Geçersiz Güvenlik Kodu.");
  }
}

async function logout() {
  try {
    await logAction("logout", { panel: "main" });
  } catch (e) {}
  try {
    await endTrackingSession();
  } catch (e) {}

  localStorage.removeItem("trioLoggedIn");
  window.location.reload();
}



function startApp() {
  document.getElementById("loader").style.display = "flex";

  // DB Bağlantı Kontrolü (Opsiyonel: Offline çalışmaya izin ver)
  if (!db) {
    console.warn("DB bağlantısı yok, offline mod deneniyor...");
  }

  if (localStorage.getItem("theme") === "dark")
    document.body.classList.add("dark-mode");

  // Default date +3 days
  const d = new Date();
  d.setDate(d.getDate() + 3);
  document.getElementById("inpDate").value = d.toISOString().split("T")[0];

  // Set default month for analytics
  // Set default month for analytics
  document.getElementById("analyticsDate").value = new Date()
    .toISOString()
    .slice(0, 7);

  // Default Bulk Variables
  isBulkTransferMode = false;

  // --- ACCESS CHECK (ASENKRON) ---
  checkSystemAccess();

  // Realtime listeners
  db.collection(col).onSnapshot((snap) => {
    allData = [];
    snap.forEach((doc) => allData.push({ id: doc.id, ...doc.data() }));
    document.getElementById("loader").style.display = "none";
    refreshView();
    updateStats();
    if(typeof updateRecentActivity === 'function') updateRecentActivity();
  });

  db.collection(_SYS_CFG.cols.ntf)
    .orderBy("timestamp", "desc")
    .onSnapshot((snap) => {
      notifications = [];
      snap.forEach((doc) => notifications.push({ id: doc.id, ...doc.data() }));
      updateBadge();
    });
}

// Helper function for service colors (global scope)
function getServiceColor(serviceName) {
    if (!serviceName) return '#94a3b8';
    
    let hash = 0;
    for (let i = 0; i < serviceName.length; i++) {
        hash = serviceName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const colors = [
        '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b',
        '#ec4899', '#06b6d4', '#84cc16', '#f97316'
    ];
    
    return colors[Math.abs(hash) % colors.length];
}

// System access check helper (global scope)
function checkSystemAccess() {
  if (db) {
    db.collection(_SYS_CFG.cols.sys_set)
      .doc("panelAccess")
      .get()
      .then((doc) => {
        if (doc.exists && doc.data().main === false) {
          alert("⛔ YÖNETİCİ UYARISI: Ana panel erişimi şu an kilitli görünüyor.");
        }
      })
      .catch((e) => console.warn("Access check skip", e));

    db.collection(_SYS_CFG.cols.sys_set)
      .doc("maintenance")
      .get()
      .then((doc) => {
        if (doc.exists && doc.data().enabled === true) {
          alert("🔧 BAKIM MODU: " + (doc.data().message || "Sistem bakımda."));
        }
      })
      .catch((e) => console.warn("Maint check skip", e));
  }
}


/* --- CORE FUNCTIONS --- */


function renderLocationButtons(groups, total) {
  const container = document.getElementById("locationFilters");
  const sorted = Object.keys(groups).sort();
  // Add Maintenance Filter Button
  let html = `<button class="filter-chip ${currentLocFilter === "TÜMÜ" ? "active" : ""}" onclick="setLocFilter('TÜMÜ')">TÜMÜ <span>(${total})</span></button>`;
  html += `<button class="filter-chip ${currentLocFilter === "BAKIM" ? "active" : ""}" style="border-color:#f59e0b; color:#f59e0b;" onclick="setLocFilter('BAKIM')"><i class="fas fa-tools"></i> BAKIMDAKİLER</button>`;

  sorted.forEach((l) => {
    const color = getServiceColor(l);
    html += `<button class="filter-chip ${currentLocFilter === l ? "active" : ""}" onclick="setLocFilter('${l}')" style="border-color:${color}; color:${color};">${l} <span>(${groups[l]})</span></button>`;
  });
  container.innerHTML = html;
}

function updateRecentActivity() {
    const container = document.getElementById('timelineList');
    const wrapper = document.getElementById('recentActivityTimeline');
    if (!container || !db) return;

    db.collection(_SYS_CFG.cols.adm_act || 'trio_admin_actions')
        .orderBy('timestamp', 'desc')
        .limit(20) // Get more, then filter
        .get()
        .then(snap => {
            if (snap.empty) {
                if(wrapper) wrapper.style.display = 'none';
                return;
            }
            
            // Filter out technical/internal events
            const excludedTypes = [
                'session_start', 'session_end', 'session_heartbeat',
                'heartbeat', 'page_view', 'scroll', 'click'
            ];
            
            const meaningfulDocs = [];
            snap.forEach(doc => {
                const d = doc.data();
                const actionType = d.actionType || d.type || '';
                if (!excludedTypes.includes(actionType)) {
                    meaningfulDocs.push({doc, data: d});
                }
            });
            
            // Take only first 5 meaningful ones
            const toShow = meaningfulDocs.slice(0, 5);
            
            if (toShow.length === 0) {
                if(wrapper) wrapper.style.display = 'none';
                return;
            }
            
            if(wrapper) wrapper.style.display = 'block';
            let html = '';
            
            toShow.forEach(({doc, data: d}) => {
                const time = d.timestamp 
                    ? new Date(d.timestamp.toDate()).toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit'})
                    : '';
                
                let icon = 'circle', color = '#94a3b8', text = '';
                
                // actionType is the correct field name from logAction
                const actionType = d.actionType || d.type || '';

                switch(actionType) {
                    case 'dressing_record':
                        icon = 'band-aid'; color = '#8b5cf6';
                        text = `${d.details?.patient || 'Hasta'} tedavi edildi`;
                        break;
                    case 'maintenance_start':
                        icon = 'tools'; color = '#f59e0b';
                        text = `${d.details?.device || 'Cihaz'} servise gönderildi`;
                        break;
                    case 'maintenance_end':
                        icon = 'check-circle'; color = '#10b981';
                        text = `${d.details?.device || 'Cihaz'} servisten döndü`;
                        break;
                    case 'transfer_to_inventory':
                        icon = 'box'; color = '#10b981';
                        text = `${d.details?.device || 'Cihaz'} envantere iade edildi`;
                        break;
                    case 'create':
                        icon = 'plus-circle'; color = '#3b82f6';
                        text = `${d.details?.data?.name || d.details?.type || 'Yeni kayıt'} eklendi`;
                        break;
                    case 'update':
                        icon = 'edit'; color = '#6366f1';
                        text = `${d.details?.data?.name || 'Kayıt'} güncellendi`;
                        break;
                    case 'soft_delete':
                        icon = 'trash'; color = '#ef4444';
                        text = `${d.details?.name || 'Kayıt'} silindi`;
                        break;
                    case 'login':
                        icon = 'sign-in-alt'; color = '#10b981';
                        text = 'Sisteme giriş yapıldı';
                        break;
                    case 'logout':
                        icon = 'sign-out-alt'; color = '#94a3b8';
                        text = 'Sistemden çıkış yapıldı';
                        break;
                    case 'bulk_transfer':
                        icon = 'exchange-alt'; color = '#6366f1';
                        text = `${d.details?.count || ''} cihaz transfer edildi`;
                        break;
                    case 'bulk_delete':
                        icon = 'trash-alt'; color = '#ef4444';
                        text = `${d.details?.count || ''} kayıt toplu silindi`;
                        break;
                    case 'login_failed':
                        icon = 'times-circle'; color = '#ef4444';
                        text = 'Başarısız giriş denemesi';
                        break;
                    default:
                        // Make any action type readable
                        text = actionType ? actionType.replace(/_/g, ' ') : 'İşlem kaydı';
                }

                html += `
                <div style="display:flex; align-items:center; gap:8px; padding:6px 0; border-bottom:1px solid var(--border-subtle);">
                    <div style="width:20px; height:20px; border-radius:6px; background:${color}20; color:${color}; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:9px;">
                        <i class="fas fa-${icon}"></i>
                    </div>
                    <div style="flex:1; font-size:11px; color:var(--text-main); line-height:1.3;">${text}</div>
                    <span style="font-size:10px; opacity:0.5; font-weight:600;">${time}</span>
                </div>`;
            });

            container.innerHTML = html;
        })
        .catch(e => console.warn('Timeline error:', e));
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
      ? new Date(n.timestamp.toDate()).toLocaleString("tr-TR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Tarih Yok";
    l.innerHTML += `<div class="notif-item ${!n.isRead ? "unread" : ""}"><div class="notif-icon"><i class="fas fa-${i}"></i></div><div style="flex:1"><h4 style="font-size:14px;font-weight:700;margin-bottom:4px">${t}</h4><p style="font-size:12px;color:var(--text-sub)">${n.nurse} (${n.service})<br><b>${n.deviceCode}</b>: ${n.note}<br><span style="font-size:11px;opacity:0.7; color:var(--text-main); font-weight:600;">${time}</span></p></div></div>`;
    if (!n.isRead)
      db.collection(_SYS_CFG.cols.ntf).doc(n.id).update({ isRead: true });
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
    db.collection(col).doc(id).update({
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

    if (typeof logAction === "function") {
      logAction("transfer_to_inventory", {
        device: rec.device,
        from_patient: rec.name,
        to_service: n,
      });
    }
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
  if (m) {
    const reason = prompt(
      "Cihaz teknik servise alınıyor. Lütfen arıza/bakım sebebini belirtiniz:",
    );
    if (!reason) return; // User cancelled

    const rec = allData.find((x) => x.id === id);
    db.collection(col).doc(id).update({
      type: "maintenance",
      maintenanceReason: reason,
      maintenanceDate: firebase.firestore.FieldValue.serverTimestamp(),
    });

    AnalyticsService.logEvent("device_maintenance_start", {
      device: rec.device,
      service: rec.service,
      reason: reason,
    });

    if (typeof logAction === "function") {
      logAction("maintenance_start", {
        device: rec.device,
        service: rec.service,
        reason: reason,
      });
    }
  } else {
    if (confirm("Cihaz tekrar depoya (müsait) alınsın mı?")) {
      const rec = allData.find((x) => x.id === id);
      db.collection(col).doc(id).update({
        type: "device",
        maintenanceReason: firebase.firestore.FieldValue.delete(),
        maintenanceDate: firebase.firestore.FieldValue.delete(),
      });

      AnalyticsService.logEvent("device_maintenance_end", {
        device: rec.device,
        service: rec.service,
      });

      if (typeof logAction === "function") {
        logAction("maintenance_end", {
          device: rec.device,
          service: rec.service,
        });
      }
    }
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

// --- PATIENT ARCHIVE VIEWER ---
async function openPatientArchive() {
    closeModal("settingsModal");
    document.getElementById("archiveModal").classList.add("open");
    const list = document.getElementById("archiveList");
    list.innerHTML = '<div class="spinner" style="margin:20px auto;"></div>';

    try {
        // 1. Get Soft Deleted Patients (simplified query - no orderBy to avoid index requirement)
        const snap = await db.collection(col)
            .where('isDeleted', '==', true)
            .where('type', '==', 'patient')
            .limit(50)
            .get();

        if (snap.empty) {
            list.innerHTML = '<div style="text-align:center; padding:30px; opacity:0.5">Arşivde hasta kaydı bulunamadı.</div>';
            return;
        }

        // 2. Fetch Analytics for Treatment History (Optimized: fetch all dressing events for these patients?)
        // Fetching individual history for 50 items is heavy. 
        // Strategy: Just show list first, load details on click?
        // User requested "Show treatment count". We need to aggregate.
        // Let's rely on stored totals in the patient record if available, or fetch simply.

        let html = '';
        snap.forEach(doc => {
            const d = doc.data();
            const dateDel = d.deletedAt ? new Date(d.deletedAt).toLocaleDateString('tr-TR') : '?';
            const totalSets = d.totalSets || 0;
            const totalCans = d.totalCans || 0;
            
            html += `
            <div class="item-card" style="border-left:4px solid #94a3b8;">
                <div class="item-header">
                    <div>
                        <div class="item-title">${d.name}</div>
                        <div class="item-sub">Arşiv Tarihi: ${dateDel} • ${d.service}</div>
                    </div>
                    <div style="text-align:right;">
                        <span class="tag" style="background:#f1f5f9; color:#64748b;">TOPLAM: ${totalSets} SET</span>
                    </div>
                </div>
                <div style="margin-top:10px; display:flex; gap:10px;">
                     <button class="act-btn btn-soft" onclick="loadPatientHistoryDetails('${doc.id}', '${d.name}')" style="font-size:11px; padding:6px 12px;">
                        <i class="fas fa-history"></i> TEDAVİ GEÇMİŞİNİ GÖR
                     </button>
                     <button class="act-btn btn-brand" onclick="restore('${doc.id}')" style="font-size:11px; padding:6px 12px; background:#10b981;">
                        <i class="fas fa-trash-restore"></i> GERİ YÜKLE
                     </button>
                </div>
                <div id="history-${doc.id}" style="display:none; margin-top:10px; background:#f8fafc; padding:10px; border-radius:8px; font-size:12px;"></div>
            </div>`;
        });
        
        list.innerHTML = html;

    } catch (e) {
        console.error(e);
        list.innerHTML = '<div style="color:red; padding:20px;">Veriler yüklenirken hata oluştu.</div>';
    }
}

async function loadPatientHistoryDetails(id, name) {
    const container = document.getElementById(`history-${id}`);
    if (container.style.display === 'block') {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'block';
    container.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Geçmiş taranıyor...';
    
    const nName = normalizeName(name);

    try {
        const snap = await db.collection(_SYS_CFG.cols.adm_act || 'trio_admin_actions') 
            .where('type', '==', 'dressing_record')
            .where('details.patient', '==', name) // Or normalize? Currently logAction uses raw name in 'details.patient'
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get();

        if(snap.empty) {
             container.innerHTML = `
                <div style="font-weight:700; color:var(--text-main); margin-bottom:5px;">KAYITLI ÖZET VERİLER:</div>
                <div>Toplam Set Kullanımı: <b>${allData.find(x=>x.id==id)?.totalSets || 0}</b></div>
                <div>Toplam Kap Kullanımı: <b>${allData.find(x=>x.id==id)?.totalCans || 0}</b></div>
                <div style="margin-top:10px; opacity:0.5;">Son işlem kaydı bulunamadı.</div>
            `;
            return;
        }

        let hHtml = '<div style="font-weight:700; color:var(--text-main); margin-bottom:5px;">SON İŞLEMLER:</div><ul style="padding-left:15px; margin:0;">';
        snap.forEach(doc => {
            const d = doc.data();
            const date = d.timestamp ? new Date(d.timestamp.toDate()).toLocaleDateString('tr-TR') : '-';
            hHtml += `<li><b>${date}:</b> ${d.details.sets} Set, ${d.details.cans} Kap</li>`;
        });
        hHtml += '</ul>';
        container.innerHTML = hHtml;
            
    } catch(e) {
        console.warn(e);
        container.innerHTML = "Detay yüklenemedi: " + e.message;
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


// --- BULK TRANSFER LOGIC ---

function startBulkTransferMode() {
    isBulkTransferMode = true;
    isSelectionMode = false;
    closeModal("settingsModal");
    switchTab("device");
    refreshView();
}

function cancelBulkTransferMode() {
    isBulkTransferMode = false;
    refreshView();
}

function transferSelected() {
    const checks = document.querySelectorAll('.bulk-check:checked');
    if (checks.length === 0) return alert("Hiçbir cihaz seçmediniz.");

    const targetService = prompt("Hedef Servis/Lokasyon:");
    if (!targetService) return;

    if (confirm(`${checks.length} cihaz "${targetService}" servisine transfer edilecek. Onaylıyor musunuz?`)) {
        const batch = db.batch();
        let count = 0;
        checks.forEach(c => {
            const ref = db.collection(col).doc(c.value);
            batch.update(ref, { service: targetService });
            count++;
        });

        batch.commit().then(() => {
            alert(`${count} cihaz transfer edildi.`);
            cancelBulkTransferMode();
            
            if(typeof logAction === 'function') {
                logAction('bulk_transfer', { count: count, target: targetService });
            }
            if(typeof updateRecentActivity === 'function') updateRecentActivity();
        }).catch(e => alert("Hata: " + e.message));
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
    data.notes = document.getElementById("inpNotes").value.trim(); // NEW

    if (!data.name) return alert("Lütfen hasta adını giriniz.");

    // MOD: Save Initial Consumables for New Patient
    if (!id) {
      data.totalSets =
        parseInt(document.getElementById("inpInitSets").value) || 0;
      data.totalCans =
        parseInt(document.getElementById("inpInitCans").value) || 0;
      // Start dressing count at 0
      data.dressingCount = 0;
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
    document.getElementById("inpNotes").value = r.notes || ""; // NEW
  }
}

function sharePatient(id) {
  const p = allData.find((x) => x.id === id);
  if (!p) return;

  const startDate = p.dateAdded 
      ? new Date(p.dateAdded.toDate()).toLocaleDateString('tr-TR')
      : 'Bilinmiyor';
  
  const lastTreatment = p.lastDressingDate
      ? new Date(p.lastDressingDate.toDate()).toLocaleDateString('tr-TR')
      : 'Hiç yapılmadı';
  
  const treatmentCount = p.dressingCount || 0;
  const totalSets = p.totalSets || 0;
  const totalCans = p.totalCans || 0;

  const msg = `🏥 *TRIO MANAGER - HASTA RAPORU*

👤 *Hasta:* ${p.name}
📅 *Kayıt Tarihi:* ${startDate}
🩹 *Son Tedavi:* ${lastTreatment}
📊 *Toplam İşlem:* ${treatmentCount} Tedavi

📦 *MALZEME KULLANIMI:*
  • Kapama Seti: ${totalSets} adet
  • Toplama Kabı: ${totalCans} adet

📍 *Cihaz:* ${p.device} (${p.service})
⏰ *Sonraki İşlem:* ${p.dateNext || 'Planlanmadı'}

━━━━━━━━━━━━━━━
_Trio Manager Elite v3.0_`;

  const num = localStorage.getItem("trioAdminNumber") || "";
  if (!num) {
    alert("Lütfen önce ayarlardan iletişim numarası kaydedin.");
    return;
  }
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`);
}

function shareDevice(id) {
  const d = allData.find((x) => x.id === id);
  if (!d) return;

  const msg = `🏥 *TRIO MANAGER - CİHAZ RAPORU*

📦 *Cihaz:* ${d.device}
📍 *Konum:* ${d.service}
📊 *Durum:* MÜSAİT (Depoda)

━━━━━━━━━━━━━━━
_Trio Manager Elite v3.0_`;

  const num = localStorage.getItem("trioAdminNumber") || "";
  if (!num) {
    alert("Lütfen önce ayarlardan iletişim numarası kaydedin.");
    return;
  }
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`);
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

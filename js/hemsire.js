// Nurse Panel Logic
const colRecords = CONFIG.collections.records;
const colNotifs = CONFIG.collections.notifications;

// State
let sName = "";
let nName = "";

// Initialize
window.onload = function () {
  const s = localStorage.getItem("trioNurseServiceShort");
  const n = localStorage.getItem("trioNurseName");

  // Check theme preference
  if (localStorage.getItem("theme") === "dark")
    document.body.classList.add("dark-mode");

  if (s && n) {
    document.getElementById("serviceInp").value = s;
    document.getElementById("nurseInp").value = n;
    // Auto-login possibility? user might prefer manual click to confirm
  }
};

(function initTracker() {
    if (localStorage.getItem('trioNurseName')) {
        // Sayfa yenilendiğinde tekrar bağlan, ama yeni session açma (opsiyonel)
        // Ya da localde sessionId varsa devam et
        if (localStorage.getItem('trioSessionId')) {
             startRemoteCommandListener();
        }
    }
})();

async function login() {
  sName = document
    .getElementById("serviceInp")
    .value.trim()
    .toLocaleUpperCase("tr-TR");
  nName = document.getElementById("nurseInp").value.trim();

  if (!sName || !nName)
    return alert("Eksik Bilgi: Lütfen birim kodu ve personel kimliğini giriniz.");

  // ACCESS CONTROL
  try {
      const accessDoc = await db.collection(CONFIG.collections.systemSettings).doc('panelAccess').get({source: 'server'});
      if (accessDoc.exists && accessDoc.data().nurse === false) {
          return alert("⛔ Personel portal erişimi şu anda yönetici tarafından kısıtlanmıştır.");
      }
      
      const maintDoc = await db.collection(CONFIG.collections.systemSettings).doc('maintenance').get({source: 'server'});
      if (maintDoc.exists && maintDoc.data().enabled === true) {
          return alert(`🔧 ${maintDoc.data().message || "Sistem bakım modundadır."}`);
      }
  } catch(e) { console.warn("Access check failed", e); }

  localStorage.setItem(
    "trioNurseServiceShort",
    document.getElementById("serviceInp").value.trim(),
  );
  localStorage.setItem("trioNurseName", nName);

  document.getElementById("login-screen").style.display = "none";
  document.getElementById("app").style.display = "block";
  document.getElementById("nurseDisplay").innerText = nName.split(" ")[0];
  document.getElementById("filterInfo").innerText =
    `"${sName}" birim verileri yükleniyor...`;
    
  // TRACKER
  startTrackingSession('nurse', nName).then(() => {
      logAction('login', { panel: 'nurse', name: nName, service: sName });
  });

  loadDevices();
}

function logout() {
  if (confirm("Oturumu sonlandırmak istiyor musunuz?")) {
    localStorage.removeItem("trioNurseServiceShort");
    localStorage.removeItem("trioNurseName");
    window.location.reload();
  }
}

function loadDevices() {
  document.getElementById("loader").style.display = "flex";

  db.collection(colRecords).onSnapshot((snap) => {
    const list = document.getElementById("deviceList");
    list.innerHTML = "";
    let count = 0;

    snap.forEach((doc) => {
      const d = doc.data();
      const dbService = (d.service || "").toLocaleUpperCase("tr-TR");

      // Filter by Service Name AND exclude deleted items
      if (!d.isDeleted && dbService.includes(sName)) {
        count++;
        const isPatient = d.type === "patient";
        const statusText = isPatient ? d.name : (d.type === "maintenance" ? "Teknik Servis" : "Müsait");
        const icon = isPatient ? "user-injured" : (d.type === "maintenance" ? "tools" : "check-circle");
        const statusColor = isPatient ? "var(--primary)" : (d.type === "maintenance" ? "#f59e0b" : "#64748b");

        // Determine card badge color and icon
        const badgeClass = isPatient ? "card-badge" : "card-badge";

        list.innerHTML += `
                <div class="n-card" onclick="openSheet('${doc.id}', '${d.device}')">
                    <div class="n-card-left">
                        <div class="n-icon ${isPatient ? "patient" : "empty"}">
                            <i class="fas fa-${isPatient ? "procedures" : "box"}"></i>
                        </div>
                        <div class="n-info">
                            <h4>${d.device} <span style="font-size:12px; color:#94a3b8; font-weight:normal; margin-left:5px;">${d.service}</span></h4>
                            <p>
                                <i class="fas fa-${icon}" style="color:${statusColor}"></i>
                                ${isPatient ? d.name : (d.type === "maintenance" ? "Teknik Servis" : "Müsait")}
                                ${isPatient ? '<span style="color:var(--accent); font-size:10px; margin-left:5px;">TEDAVİDE</span>' : ""}
                            </p>
                        </div>
                    </div>
                    <div class="n-action">
                        <i class="fas fa-ellipsis-v"></i>
                    </div>
                </div>`;
      }
    });

    document.getElementById("loader").style.display = "none";

    if (count === 0) {
      list.innerHTML = `
            <div style="text-align:center; margin-top:80px; opacity:0.6; animation:fadeIn 0.5s">
                <div style="width:80px; height:80px; background:var(--surface); border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 20px; box-shadow:var(--shadow-card);">
                    <i class="fas fa-search" style="font-size:30px; color:var(--text-sub);"></i>
                </div>
                <p style="font-weight:600">Biriminizde kayıtlı aktif envanter bulunamadı.</p>
                <p style="font-size:13px;">"${sName}" birimi için sorgulama yapıldı.</p>
            </div>`;
    }
  });
}

function openSheet(id, code) {
  document.getElementById("selectedDeviceId").value = id;
  document.getElementById("selectedDeviceCode").value = code;
  document.getElementById("actionSheet").classList.add("open");
}

function closeSheet() {
  document.getElementById("actionSheet").classList.remove("open");
}

function toggleHelp() {
  console.log("Toggle Help Called");
  document.getElementById("helpModal").classList.add("open");
}

function closeHelp() {
  document.getElementById("helpModal").classList.remove("open");
}

function notify(type, btnElement) {
  const id = document.getElementById("selectedDeviceId").value;
  const code = document.getElementById("selectedDeviceCode").value;
  let note = "";

  if (type === "transfer") {
    const who = prompt("Hedef Birim / Personel:");
    if (!who) return;
    note = `TRANSFER: ${who}`;
  } else if (type === "new_patient") {
    const pName = prompt("HASTA ADI SOYADI:");
    if (!pName) return;
    const pRoom = prompt("ODA NO:");
    note = `YENİ HASTA: ${pName} (${pRoom ? "Oda: " + pRoom : "Servis"})`;
  } else if (type === "problem") {
    const problem = prompt("Arıza / Durum Açıklaması:");
    if (!problem) return;
    note = `TEKNİK SERVİS: ${problem}`;
  } else if (type === "return") {
    if (!confirm("Cihaz tedaviden çıktı ve depoya mı iade edilecek?")) return;
    note = "İADE: Cihaz envantere iade edildi.";
  }

  document.getElementById("loader").style.display = "flex";

  db.collection(colNotifs)
    .add({
      type: type,
      deviceId: id,
      deviceCode: code,
      service: sName,
      nurse: nName,
      note: note || "",
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      isRead: false,
    })
    .then(() => {
      // TRACKER
      logAction('notification_sent', {
          type: type,
          device: code,
          note: note,
          service: sName,
          nurse: nName
      });
      
      document.getElementById("loader").style.display = "none";

      // Show success animation
      const btn = btnElement;
      const originalContent = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-check"></i> İletildi';
      btn.style.background = "#10b981";
      btn.style.color = "white";

      setTimeout(() => {
        closeSheet();
        alert("✅ Talep iletildi. Yönetici onayı bekleniyor.");
        // Reset button state slightly delayed
        setTimeout(() => {
          btn.innerHTML = originalContent;
          btn.style.background = "";
          btn.style.color = "";
        }, 500);
      }, 500);
    })
    .catch((err) => {
      console.error(err);
      document.getElementById("loader").style.display = "none";
      alert("Hata oluştu!");
    });
}

function toggleThemeNurse() {
  document.body.classList.toggle("dark-mode");
  localStorage.setItem(
    "theme",
    document.body.classList.contains("dark-mode") ? "dark" : "light",
  );
}

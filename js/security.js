/**
 * Trio System Protection Layer
 * Build: 2026.2.1-RC
 * Status: ACTIVE
 */

(function() {
    // Disable Right Click
    document.addEventListener('contextmenu', e => e.preventDefault());

    // Disable Shortcuts
    document.addEventListener('keydown', e => {
        // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
        if (
            e.key === 'F12' ||
            (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
            (e.ctrlKey && e.key === 'U')
        ) {
            e.preventDefault();
            return false;
        }
    });

    // Console Spam Protection
    setInterval(() => {
        const start = Date.now();
        debugger;
        const end = Date.now();
        if (end - start > 100) {
            // DevTools might be open
            document.body.innerHTML = '<div style="background:#0f172a; color:#f8fafc; height:100vh; display:flex; align-items:center; justify-content:center; font-family:sans-serif; text-align:center;"><div><h1 style="font-size:48px;">⚠️ GÜVENLİK UYARISI</h1><p style="font-size:20px; opacity:0.7;">Geliştirici modunda erişim engellendi.</p></div></div>';
        }
    }, 1000);

    console.log("%cTRIO SYSTEM PROTECTED", "color: #ef4444; font-size: 20px; font-weight: bold;");
})();

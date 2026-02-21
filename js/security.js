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

    // Console Protection (Passive)
    // DevTools detection removed for stability

    console.log("%cTRIO SYSTEM PROTECTED", "color: #ef4444; font-size: 20px; font-weight: bold;");
})();

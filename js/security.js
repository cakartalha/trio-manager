/**
 * Trio System Protection Layer
 * Build: 2026.2.1-RC
 */
(function(){
    const _p = (e) => { e.preventDefault(); return false; };
    const _k = (e) => {
        if(e.key === 'F12' || 
          (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) || 
          (e.ctrlKey && (e.key === 'u' || e.key === 's'))) {
            return _p(e);
        }
    };

    document.addEventListener('contextmenu', _p);
    document.addEventListener('keydown', _k);
    document.addEventListener('dragstart', _p);

    const _w = "background: #b91c1c; color: white; font-size: 24px; padding: 10px; border-radius: 4px;";
    console.clear();
    setTimeout(() => {
        console.log("%cSYSTEM SECURITY ACTIVE", _w);
        console.log("%cUnlawful access to this terminal is monitored.", "color: #9ca3af; font-family: monospace;");
    }, 800);

    setInterval(() => {
        const t0 = Date.now();
        debugger; 
        const t1 = Date.now();
    }, 2000);

})();

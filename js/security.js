/**
 * TRIO SECURITY MODULE v1.0
 * (c) 2026 Trio Medikal - All Rights Reserved.
 * Unauthorized copying, viewing, or distribution of this code is strictly prohibited.
 */

(function(){
    // 1. Disable Right Click
    document.addEventListener('contextmenu', event => {
        event.preventDefault();
        return false;
    });

    // 2. Disable Key Shortcuts (F12, Ctrl+U, Ctrl+S, Ctrl+Shift+I)
    document.addEventListener('keydown', event => {
        // F12
        if(event.key === 'F12') {
            event.preventDefault();
            return false;
        }
        
        // Ctrl+Shift+I (DevTools)
        if(event.ctrlKey && event.shiftKey && event.key === 'I') {
            event.preventDefault();
            return false;
        }

        // Ctrl+Shift+J (Console)
        if(event.ctrlKey && event.shiftKey && event.key === 'J') {
            event.preventDefault();
            return false;
        }

        // Ctrl+U (View Source)
        if(event.ctrlKey && event.key === 'u') {
            event.preventDefault();
            return false;
        }

        // Ctrl+S (Save Page)
        if(event.ctrlKey && event.key === 's') {
            event.preventDefault();
            alert("Bu sayfa korumalıdır. Kayıt edilemez.");
            return false;
        }
    });

    // 3. Disable Dragging Images (Visual Protection)
    document.addEventListener('dragstart', event => {
        event.preventDefault();
    });

    // 4. Console Warning
    const warningTitle = "background: red; color: white; font-size: 40px; font-weight: bold; padding: 10px;";
    const warningText = "font-size: 16px; color: red; font-weight: bold;";
    
    // Clear any previous logs
    console.clear();
    
    setTimeout(() => {
        console.log("%cDUR!", warningTitle);
        console.log("%cBu alan geliştiriciler içindir. Buraya herhangi bir kod yapıştırmak veya incelemek yasal suç teşkil edebilir.", warningText);
        console.log("%cTrio Medikal Yazılım Güvenliği Devrede.", "color: gray; font-size: 12px;");
    }, 1000);

    // 5. Basic Debugger Loop (Annoyance for DevTools users)
    // This constantly pauses execution if DevTools is open and breakpoints are active.
    setInterval(() => {
        const start = new Date().getTime();
        debugger; 
        const end = new Date().getTime();
    }, 1000);

})();

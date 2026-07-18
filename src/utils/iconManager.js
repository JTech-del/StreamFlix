//--------------------------------------
// Icon Manager
//--------------------------------------

function initializeIcons() {
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

//--------------------------------------
// Export
//--------------------------------------

export { initializeIcons };
let reactorWoken = false;

function setRingActive(active) {
    // If overload mode is disabled, skip all visual changes
    if (typeof CONFIG !== 'undefined' && CONFIG.enableOverload === false) {
        return;
    }

    const reactor = document.getElementById('reactor');
    const sysMsg = document.getElementById('sys-msg');
    const sysStatus = document.querySelector('.sys-status');

    if (!reactor) return;

    if (active) {
        reactor.classList.add('active-mode'); // Overclock Mode (Red)
        if (sysMsg) sysMsg.innerText = "SYS OVERLOAD";
        if (sysStatus) {
            sysStatus.style.color = 'var(--neon-red)';
            sysStatus.style.textShadow = '0 0 10px var(--neon-red)';
        }
    } else {
        reactor.classList.remove('active-mode'); // Stable Mode (Blue)
        if (sysMsg) sysMsg.innerText = "SYS STABLE";
        if (sysStatus) {
            sysStatus.style.color = 'var(--neon-blue)';
            sysStatus.style.textShadow = '0 0 10px var(--neon-blue)';
        }
    }
}

/* Premier clic sur le portail : le reacteur passe en surchauffe. */
function wakeReactor() {
    if (reactorWoken) return;
    reactorWoken = true;
    setRingActive(true);
}

function togglePortalState(e) {
    // Note: We don't stop propagation here because this is called BY the body listener

    // 1. Premier clic : on allume le reacteur
    if (!reactorWoken) {
        wakeReactor();
        // wakeReactor met l'anneau en surchauffe, on revele aussi les donnees
        // pour que le portail soit entierement "ON".
        const secretData = document.getElementById('secret-data');
        if (secretData && !secretData.classList.contains('data-unlocked')) {
            if (typeof unlockData === 'function') unlockData();
        }
        return;
    }

    // 2. Convergent Toggle Logic
    const reactor = document.getElementById('reactor');
    const secretData = document.getElementById('secret-data');

    const isRingActive = reactor && reactor.classList.contains('active-mode');
    const isDataVisible = secretData && secretData.classList.contains('data-unlocked');

    // If FULLY ACTIVE (Ring Red AND Data Visible) -> Turn OFF
    if (isRingActive && isDataVisible) {
        setRingActive(false);
        if (typeof unlockData === 'function') unlockData(); // Toggles to hidden
    }
    // Otherwise (Ring Blue OR Data Hidden) -> Turn ON
    else {
        setRingActive(true);
        if (!isDataVisible) {
            if (typeof unlockData === 'function') unlockData(); // Toggles to visible
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Mock de navigateTo si js/main.js n'est pas là pour le test
    if (typeof navigateTo === 'undefined') {
        window.navigateTo = function (id) {
            console.log("Navigation simulée vers : " + id);
            document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
            const target = document.getElementById(id + '-view');
            if (target) target.classList.add('active');
        };
    }

    // GLOBAL CLICK LISTENER for Portal View
    document.body.addEventListener('click', (e) => {
        // 1. Check if we are in Portal View
        const portalView = document.getElementById('portal-view');
        // Check if portal view exists and is active (visible)
        const isActive = portalView && (portalView.classList.contains('active') || getComputedStyle(portalView).display !== 'none');

        if (!isActive) return;

        // 2. Check if the click is on an interactive element
        if (e.target.closest('button, a, input, textarea, select, .back-btn, .music-trigger, .portal-btn, .sys-bar')) {
            return;
        }

        // 3. Trigger the Toggle
        togglePortalState(e);
    });

    // If overload mode is disabled, hide the SYS status indicator
    if (typeof CONFIG !== 'undefined' && CONFIG.enableOverload === false) {
        const sysMsg = document.getElementById('sys-msg');
        const sysStatusIcon = document.querySelector('.sys-status > i');
        if (sysMsg) sysMsg.style.display = 'none';
        if (sysStatusIcon) sysStatusIcon.style.display = 'none';
    }
});

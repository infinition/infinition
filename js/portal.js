let cymaticsStarted = false;

function setRingActive(active) {
    const reactor = document.getElementById('reactor');
    const sysMsg = document.getElementById('sys-msg');
    const sysStatus = document.querySelector('.sys-status');

    if (!reactor) return;

    if (active) {
        reactor.classList.add('active-mode'); // Overclock Mode (Red)
        if (sysMsg) sysMsg.innerText = "SYSTEM OVERLOAD";
        if (sysStatus) {
            sysStatus.style.color = 'var(--neon-red)';
            sysStatus.style.textShadow = '0 0 10px var(--neon-red)';
        }
    } else {
        reactor.classList.remove('active-mode'); // Stable Mode (Blue)
        if (sysMsg) sysMsg.innerText = "SYSTEM STABLE";
        if (sysStatus) {
            sysStatus.style.color = 'var(--neon-blue)';
            sysStatus.style.textShadow = '0 0 10px var(--neon-blue)';
        }
    }
}

function attachAudioListener() {
    const audioToggleBtn = document.getElementById('audio-toggle');
    if (audioToggleBtn) {
        // Clone to remove old listeners and ensure clean state
        const newBtn = audioToggleBtn.cloneNode(true);
        audioToggleBtn.parentNode.replaceChild(newBtn, audioToggleBtn);

        newBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Stop propagation so body click doesn't trigger
            const audio = document.getElementById("cymatics");
            if (!audio) return;

            if (audio.paused) {
                audio.play().then(() => {
                    newBtn.innerHTML = '<i class="fas fa-wave-square"></i> MUTE';
                    setRingActive(true);
                });
            } else {
                audio.pause();
                newBtn.innerHTML = '<i class="fas fa-play"></i> PLAY';
                setRingActive(false);
            }
        });
    }
}

function startCymatics() {
    if (cymaticsStarted) return;
    cymaticsStarted = true;

    const audio = document.getElementById("cymatics");
    const toggleBtn = document.getElementById("audio-toggle");

    if (!audio) {
        console.error("Audio #cymatics introuvable");
        return;
    }

    audio.volume = 0.65;

    audio.play().then(() => {
        if (toggleBtn) {
            toggleBtn.style.display = "inline-flex";
            toggleBtn.innerHTML = '<i class="fas fa-wave-square"></i> MUTE';
        }
        setRingActive(true); // Active l'animation du réacteur
    }).catch(err => {
        console.log("Autoplay bloqué : ", err);
    });
}

function togglePortalState(e) {
    // Note: We don't stop propagation here because this is called BY the body listener

    // 1. Ensure Audio/System is started
    if (!cymaticsStarted) {
        startCymatics();
        // startCymatics sets ring active.
        // We want to ensure data is ALSO revealed for the full "ON" experience.
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
        // We check style.display because classList might not be enough if managed by JS
        const isActive = portalView && (portalView.classList.contains('active') || getComputedStyle(portalView).display !== 'none');

        if (!isActive) return;

        // 2. Check if the click is on an interactive element
        if (e.target.closest('button, a, input, textarea, select, .back-btn, .music-trigger, .portal-btn')) {
            return;
        }

        // 3. Trigger the Toggle
        togglePortalState(e);
    });

    const audioToggleBtn = document.getElementById('audio-toggle');
    if (audioToggleBtn) {
        audioToggleBtn.style.display = "none";
        // Initial listener attachment
        attachAudioListener();
    }
});
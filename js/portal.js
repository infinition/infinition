let cymaticsStarted = false;

// Fonction mise à jour pour gérer le RÉACTEUR
function setRingActive(active) {
    const reactor = document.getElementById('reactor');
    if (!reactor) return;

    if (active) {
        reactor.classList.add('active-mode'); // Déclenche le mode Overclock/Rouge
    } else {
        reactor.classList.remove('active-mode'); // Retour au mode Bleu
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

    const title = document.querySelector('.portal-title');
    if (title) {
        title.addEventListener('click', startCymatics);
    }

    // Déclenche au clic n'importe où la première fois
    document.body.addEventListener('click', startCymatics, { once: true });

    const audioToggleBtn = document.getElementById('audio-toggle');
    if (audioToggleBtn) {
        audioToggleBtn.style.display = "none";

        audioToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Empêche de relancer startCymatics via le body
            const audio = document.getElementById("cymatics");
            if (!audio) return;

            if (audio.paused) {
                audio.play().then(() => {
                    audioToggleBtn.innerHTML = '<i class="fas fa-wave-square"></i> MUTE';
                    setRingActive(true);
                });
            } else {
                audio.pause();
                audioToggleBtn.innerHTML = '<i class="fas fa-play"></i> PLAY';
                setRingActive(false);
            }
        });
    }
});
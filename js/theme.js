function initTheme() {
    const savedTheme = localStorage.getItem('site-theme') || 'infinition';
    setTheme(savedTheme);

    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
        // Set initial icon
        themeBtn.innerHTML = savedTheme === 'infinition' ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-atom"></i>';

        themeBtn.onclick = (e) => {
            e.stopPropagation();
            const currentTheme = document.body.classList.contains('theme-infinition') ? 'infinition' : 'dark';
            const newTheme = currentTheme === 'infinition' ? 'dark' : 'infinition';
            setTheme(newTheme);
            themeBtn.innerHTML = newTheme === 'infinition' ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-atom"></i>';
        };
    }
}

function setTheme(themeName) {
    document.body.classList.remove('theme-infinition', 'theme-dark');
    document.body.classList.add(`theme-${themeName}`);
    localStorage.setItem('site-theme', themeName);

    // Update reactor state if needed
    if (typeof setRingActive === 'function') {
        const isAudioPlaying = !document.getElementById('cymatics')?.paused;
        setRingActive(isAudioPlaying);
    }
}

document.addEventListener('DOMContentLoaded', initTheme);

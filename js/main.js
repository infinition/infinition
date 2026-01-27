window.addEventListener('hashchange', handleHashChange);

function handleHashChange() {
    const hash = window.location.hash;
    if (hash.startsWith('#article:')) {
        const articleFile = hash.replace('#article:', '');
        if (mergedData.length === 0) { navigateTo('blog'); setTimeout(() => findAndOpenArticle(articleFile), 1500); }
        else { findAndOpenArticle(articleFile); }
    } else if (hash === '#portfolio') navigateTo('portfolio');
    else if (hash === '#blog') navigateTo('blog');
    else if (hash === '#kb') navigateTo('kb');
    else if (hash === '#music') navigateTo('music');
    else if (hash === '#csslib') navigateTo('csslib');
    else if (hash === '#acid-pages') navigateTo('acid-pages');
    else navigateTo('portal');
}

function findAndOpenArticle(filename) {
    const found = mergedData.find(a => a.file.includes(filename));
    if (found) openArticle(found);
}
function syncSysbarHeight() {
    const sysbar = document.querySelector('.sys-bar');
    const h = sysbar ? sysbar.getBoundingClientRect().height : 0;
    document.documentElement.style.setProperty('--sysbar-height', `${Math.round(h)}px`);
}

window.addEventListener('load', syncSysbarHeight);
window.addEventListener('resize', syncSysbarHeight);


function navigateTo(viewId, keepScroll = false) {
    document.querySelectorAll('.view-section').forEach(el => { el.style.display = 'none'; el.classList.remove('active'); });
    if (viewId === 'portal') { document.getElementById('portal-view').style.display = 'flex'; document.querySelector('.back-btn').style.display = 'none'; }
    else {
        const target = document.getElementById(viewId + (viewId.endsWith('view') ? '' : '-view'));
        if (target) { target.style.display = 'block'; target.classList.add('active'); }
        document.querySelector('.back-btn').style.display = 'block';
    }
    document.body.classList.toggle('kb-mode', viewId === 'kb');
    document.body.classList.toggle('portal-mode', viewId === 'portal');
    updateGlobalSearchIcon();

    // UPDATE URL HISTORY for better navigation
    // UPDATE URL HISTORY for better navigation
    if (viewId === 'portal') {
        // Remove hash when going back to root
        history.pushState(null, null, window.location.pathname);
    } else if (window.location.hash !== '#' + viewId && !window.location.hash.startsWith('#article:')) {
        history.pushState(null, null, '#' + viewId);
    }

    if (viewId === 'blog') runScanSimulation();
    if (viewId === 'kb') initKB();
    if (viewId === 'csslib') initCSSLib();
    if (viewId === 'acid-pages') initAcidPages();
    // Removed direct music fetch, now handled by reveal button
    if (!keepScroll) window.scrollTo(0, 0);
}

function updateGlobalSearchIcon() {
    const icon = document.getElementById('kb-search-icon');
    if (!icon) return;
    if (document.body.classList.contains('kb-mode')) {
        icon.onclick = () => openKBSearch();
        icon.title = 'KB Search';
    } else {
        icon.onclick = () => openGlobalSearch();
        icon.title = 'Search';
    }
}

async function runScanSimulation(forceRefresh = false) {
    const out = document.getElementById('scan-output');
    const list = document.getElementById('article-list-container');

    // --- SYSTEME DE CACHE ---
    // Si on ne force pas le refresh ET qu'on a déjà des données en mémoire
    if (!forceRefresh && mergedData.length > 0) {
        out.innerHTML = `> RESTORING CACHED DATA...<br>> CACHE LOADED. ITEMS: ${mergedData.length} (INSTANT ACCESS)<br>> SEARCH INPUT ACTIVE: <input type="text" id="console-search" class="console-input" placeholder="_" autocomplete="off">`;
        renderArticles(mergedData);
        document.getElementById('console-search').addEventListener('input', (e) => filterArticles(e.target.value));
        return; // On arrête la fonction ici, pas de fetch !
    }
    // ------------------------

    out.innerHTML = '> SCANNING... <span class="blink">_</span>';
    // On vide la liste visuelle seulement si on fait un vrai scan
    if (forceRefresh) list.innerHTML = '';

    const local = await fetchLocalDataLogs();

    // Si on force le refresh, on veut voir l'étape intermédiaire
    renderArticles(local);

    setTimeout(async () => {
        out.innerHTML += '<br>> FETCHING EXTERNAL...';
        const repos = await fetchGitHubRepos();
        const arts = await fetchArtStation();

        mergedData = [...local, ...repos, ...arts];
        mergedData.sort((a, b) => {
            const da = new Date(a.date);
            const db = new Date(b.date);
            const ta = isNaN(da.getTime()) ? 0 : da.getTime();
            const tb = isNaN(db.getTime()) ? 0 : db.getTime();
            return tb - ta;
        });

        renderArticles(mergedData);
        out.innerHTML = `> READY. INDEXED: ${mergedData.length}.<br>> SEARCH INPUT ACTIVE: <input type="text" id="console-search" class="console-input" placeholder="_" autocomplete="off">`;
        document.getElementById('console-search').addEventListener('input', (e) => filterArticles(e.target.value));
    }, 500);
}

async function openInKB(filename) {
    navigateTo('kb');
    // Ensure data is loaded (initKB called by navigateTo might still be running, but mergedData check handles it)
    // We need to wait for mergedData to be populated if it's not.
    if (mergedData.length === 0) {
        // Wait a bit or rely on initKB to finish. 
        // Since initKB is async and not awaited in navigateTo, we might race.
        // Let's manually ensure initKB finishes if we are here.
        await initKB();
    }

    const article = mergedData.find(a => a.file === filename);
    if (article) {
        openKBArticle(article);
    }
}

document.getElementById('kb-search').addEventListener('click', (e) => {
    const modal = document.getElementById('search-modal');
    const input = document.getElementById('global-search-input');
    if (modal && input) {
        modal.classList.add('active');
        input.focus();
        // If there's already text in the KB search, copy it to global search
        if (e.target.value) {
            input.value = e.target.value;
            input.dispatchEvent(new Event('input'));
        }
    }
});

if (window.location.hash) handleHashChange(); else navigateTo('portal');

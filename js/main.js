window.addEventListener('hashchange', handleHashChange);

function handleHashChange() {
    const hash = window.location.hash;
    if (hash.startsWith('#article:')) {
        /* Les liens du flux RSS portent un nom de fichier encode, avec ses
           espaces et ses accents : sans decodage, la recherche ne retrouvait
           aucun article et le lecteur retombait sur le portail. */
        const articleFile = safeDecode(hash.slice('#article:'.length));
        if (mergedData.length === 0) { navigateTo('blog'); openArticleWhenReady(articleFile); }
        else { findAndOpenArticle(articleFile); }
    }
    /* #paper:ID, #read:rayon/texte et #art:ID ouvrent directement la liseuse
       ou la visionneuse, y compris a froid : les deux modules chargent leur
       index avant d ouvrir. */
    else if (hash.startsWith('#paper:')) { navigateTo('papers', true); PAPERS.openFromHash(safeDecode(hash.slice(7))); }
    else if (hash.startsWith('#read:')) { navigateTo('papers', true); PAPERS.openFromHash(safeDecode(hash.slice(6))); }
    else if (hash.startsWith('#art:')) { navigateTo('art', true); ARTSTATION.openFromHash(safeDecode(hash.slice(5))); }
    else if (hash.startsWith('#photo:')) { navigateTo('photos', true); PHOTOS.openFromHash(safeDecode(hash.slice(7))); }
    else if (hash === '#portfolio') navigateTo('portfolio');
    else if (hash === '#blog') navigateTo('blog');
    else if (hash === '#kb') navigateTo('kb');
    else if (hash === '#music') navigateTo('music');
    else if (hash === '#photos') navigateTo('photos');
    else if (hash === '#acid-pages') navigateTo('acid-pages');
    else if (hash === '#repos') navigateTo('repos');
    else if (hash === '#papers') navigateTo('papers');
    else if (hash === '#art') navigateTo('art');
    else navigateTo('portal');
}

/** decodeURIComponent leve sur un pourcentage isole, un hash bricole a la main. */
function safeDecode(value) {
    try { return decodeURIComponent(value); } catch { return value; }
}

/* Un lien venu du flux ou d'un partage arrive a froid, l'index n'est pas
   encore charge. On attendait 1500 ms avant d'ouvrir, un pari perdu des que
   le reseau trainait : le lecteur restait sur la liste sans rien comprendre.
   On attend donc l'index lui meme, avec une limite. */
function openArticleWhenReady(filename, deadline = 12000) {
    const started = Date.now();
    (function attempt() {
        if (mergedData.length > 0) { findAndOpenArticle(filename); return; }
        if (Date.now() - started > deadline) return;
        setTimeout(attempt, 150);
    })();
}

function findAndOpenArticle(filename) {
    /* macOS ecrit les accents en forme composee, un vieux renommage les avait
       laisses en forme decomposee : deux chaines identiques a l'oeil qui ne
       s'egalent pas. On compare sur une seule forme. */
    const wanted = filename.normalize('NFC');
    /* L'index melange les articles avec les depots, les oeuvres et les
       publications, qui n'ont pas de fichier : sans cette garde la recherche
       levait sur la premiere fiche venue et le lien mourait la. */
    const found = mergedData.find(a => a.file && a.file.normalize('NFC').includes(wanted));
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
    /* L'attribut pose dans le <head> masquait le portail avant la premiere
       peinture. A partir d'ici c'est ce routeur qui decide ce qui s'affiche,
       et sa regle CSS gagnerait contre nos styles en ligne. */
    document.documentElement.removeAttribute('data-deep-link');

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
    
    // Stop hackers easter egg if navigating away
    const hackersIframe = document.getElementById('hackers-iframe');
    if (hackersIframe && viewId !== 'hackers') {
        hackersIframe.src = '';
    }

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
    if (viewId === 'photos') initPhotos();
    if (viewId === 'acid-pages') initAcidPages();
    if (viewId === 'repos') initRepos();
    if (viewId === 'papers') initPapers();
    if (viewId === 'art') initArtStation();

    /* Le retour arriere du navigateur repasse de #paper:ID a #papers sans
       passer par le bouton de fermeture, on referme donc ici. */
    if (viewId !== 'papers' || !/^#(paper|read):/.test(window.location.hash)) PAPERS.close();
    if (viewId !== 'art' || !window.location.hash.startsWith('#art:')) ARTSTATION.close();
    if (viewId !== 'photos' || !window.location.hash.startsWith('#photo:')) PHOTOS.close();
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
        const pubs = await fetchPublications();

        mergedData = [...local, ...repos, ...arts, ...pubs];
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

const kbSearch = document.getElementById('kb-search');
if (kbSearch) {
    kbSearch.addEventListener('click', (e) => {
        const modal = document.getElementById('search-modal');
        const input = document.getElementById('global-search-input');
        if (modal && input) {
            modal.classList.add('active');
            input.focus();
            if (e.target.value) {
                input.value = e.target.value;
                input.dispatchEvent(new Event('input'));
            }
        }
    });
}

if (window.location.hash) handleHashChange(); else navigateTo('portal');

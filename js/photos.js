/* =========================================================
   PHOTOS

   Galerie personnelle. Source de verite : data/photos.json,
   produit par scripts/build-photos.mjs a partir du dossier
   photos/. Les tags sont lus dans le nom des fichiers, la
   page ne fait que les afficher et filtrer dessus.

   Deux modes d'affichage : la grille serree, cases carrees
   collees, et les proportions reelles en colonnes. Le choix
   est retenu d'une visite a l'autre.
   ========================================================= */

const PHOTOS = (() => {
    const DATA_URL = 'data/photos.json';
    const MODE_KEY = 'photos-mode';

    const state = {
        photos: [],
        tags: [],
        meta: null,
        loaded: false,
        active: new Set(),
        mode: 'grid',
        current: null,
        visible: [],
        tagsOpen: false,
        tagQuery: '',
        zoom: 1,
        pan: { x: 0, y: 0 },
        drag: null
    };

    const ZOOM_MIN = 1;
    const ZOOM_MAX = 8;
    const ZOOM_STEP = 1.18;

    /* Au dela de douze tags la barre pousse les photos sous la ligne de
       flottaison. On n'en montre alors que les plus fournis, le reste se
       deplie a la demande. Passe vingt-quatre, on ajoute de quoi chercher
       dans les tags eux memes. */
    const MAX_TAGS = 12;
    const SEARCH_FROM = 24;

    const esc = s => String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    function formatDate(iso) {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
    }

    /* Le mode choisi suit le visiteur, c'est une preference d'affichage et
       non un etat partage : le stockage local suffit, et son absence en
       navigation privee ne doit rien casser. */
    function readMode() {
        try {
            const saved = localStorage.getItem(MODE_KEY);
            if (saved === 'grid' || saved === 'true') return saved;
        } catch { /* stockage refuse, on garde la valeur par defaut */ }
        return 'grid';
    }

    function saveMode(mode) {
        try {
            localStorage.setItem(MODE_KEY, mode);
        } catch { /* sans effet, le mode reste valable pour cette visite */ }
    }

    /* --- RENDU --- */

    /* Pour chaque tag, le nombre de photos qui resteraient s'il etait ajoute
       au filtre courant. Un zero signale un cul-de-sac : le tag est neutralise
       plutot que de mener a une grille vide. */
    function facetCounts() {
        const base = visiblePhotos();
        const counts = new Map();

        for (const tag of state.tags) {
            counts.set(tag.name, state.active.has(tag.name)
                ? base.length
                : base.filter(p => p.tags.includes(tag.name)).length);
        }
        return counts;
    }

    function tagHtml(tag, count) {
        const on = state.active.has(tag.name);
        const dead = !on && count === 0;
        return `<button class="tag${on ? ' active' : ''}${dead ? ' is-dead' : ''}"
                    data-tag="${esc(tag.name)}" aria-pressed="${on}"
                    ${dead ? 'disabled' : ''}>${esc(tag.name)}<span class="tag-count">${count}</span></button>`;
    }

    function renderTags() {
        const host = document.getElementById('photo-tag-list');
        const search = document.getElementById('photo-tag-search');
        if (!host) return;

        if (search) {
            search.hidden = state.tags.length < SEARCH_FROM;
            if (search.hidden && state.tagQuery) state.tagQuery = '';
        }

        const counts = facetCounts();
        const query = state.tagQuery.trim().toLowerCase();
        const matching = query
            ? state.tags.filter(t => t.name.includes(query))
            : state.tags;

        /* Les tags actifs restent visibles meme repliee, sinon on ne pourrait
           plus retirer un filtre qu'on vient de poser. */
        const collapsed = !state.tagsOpen && !query && matching.length > MAX_TAGS;
        const shown = collapsed
            ? matching.filter((t, i) => i < MAX_TAGS || state.active.has(t.name))
            : matching;

        const parts = shown.map(t => tagHtml(t, counts.get(t.name) || 0));

        const rest = matching.length - shown.length;
        if (rest > 0) {
            parts.push(`<button class="tag tag-more" data-more="open">+${rest}</button>`);
        } else if (state.tagsOpen && matching.length > MAX_TAGS) {
            parts.push(`<button class="tag tag-more" data-more="close">Less</button>`);
        }

        if (state.active.size > 0) {
            parts.push(`<button class="tag tag-clear" data-clear="1">
                <i class="fas fa-times"></i> Clear</button>`);
        }

        if (query && shown.length === 0) {
            parts.push(`<span class="tag is-dead">no tag matches</span>`);
        }

        host.innerHTML = parts.join('');
    }

    function shotHtml(photo, index) {
        /* En proportions reelles la case adopte le rapport de la photo, ce qui
           reserve sa place avant meme que l'image arrive et evite que la
           colonne saute pendant le chargement. */
        const ratio = state.mode === 'true' && photo.ratio
            ? ` style="aspect-ratio: ${photo.ratio}; animation-delay: ${Math.min(index * 18, 360)}ms"`
            : ` style="animation-delay: ${Math.min(index * 18, 360)}ms"`;

        return `
            <button class="shot" data-id="${esc(photo.id)}"${ratio}
                    aria-label="${esc(photo.title)}">
                <img src="${esc(state.mode === 'true' ? photo.full : photo.thumb)}"
                     alt="${esc(photo.title)}" loading="lazy" decoding="async"
                     onload="this.classList.add('ready')">
                <span class="shot-veil">${esc(photo.title)}</span>
            </button>`;
    }

    function visiblePhotos() {
        if (state.active.size === 0) return state.photos;
        /* Plusieurs tags actifs : une photo doit les porter tous, sinon le
           filtre elargirait au lieu de reduire, ce qui n'est pas ce qu'on
           attend en cliquant un deuxieme tag. */
        return state.photos.filter(p => [...state.active].every(t => p.tags.includes(t)));
    }

    function render() {
        const grid = document.getElementById('photo-grid');
        if (!grid) return;

        state.visible = visiblePhotos();
        renderTags();

        document.querySelectorAll('#photos-view .mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === state.mode);
        });

        grid.className = state.mode === 'true' ? 'photo-columns' : 'photo-grid';

        if (state.photos.length === 0) {
            grid.className = '';
            grid.innerHTML = `
                <div class="photos-empty">
                    <i class="fas fa-camera-retro"></i>
                    <p>
                        La galerie est vide.<br>
                        Deposez vos images dans <code>photos/</code>, les tags se lisent
                        dans le nom du fichier :<br>
                        <code>lune.astronomy.png</code> donne le tag <code>astronomy</code>.
                    </p>
                </div>`;
        } else if (state.visible.length === 0) {
            grid.className = '';
            grid.innerHTML = `<div class="photos-empty"><p>Aucune photo avec ces tags.</p></div>`;
        } else {
            grid.innerHTML = state.visible.map(shotHtml).join('');
        }

        const total = document.getElementById('photos-count');
        if (total) total.textContent = state.active.size ? state.visible.length : state.photos.length;

        const status = document.getElementById('photos-status');
        if (status && state.meta) {
            const stamp = formatDate(state.meta.generated_at);
            status.innerHTML = `&gt; GALLERY SYNCED <span class="ok">${esc(stamp)}</span> // SOURCE photos/`;
        }
    }

    function setMode(mode) {
        if (mode !== 'grid' && mode !== 'true') return;
        if (state.mode === mode) return;
        state.mode = mode;
        saveMode(mode);
        render();
    }

    function toggleTag(name) {
        if (state.active.has(name)) state.active.delete(name);
        else state.active.add(name);
        render();
    }

    /* Appele par le terminal : "photos nuit" n'ajoute pas au filtre courant,
       il le remplace, sinon deux commandes de suite ne montreraient rien. */
    function focusTag(name) {
        const tag = String(name || '').trim().toLowerCase();
        state.active = new Set(state.tags.some(t => t.name === tag) ? [tag] : []);
        render();
    }

    /* --- VISIONNEUSE --- */

    /* --- ZOOM A LA MOLETTE ---
       L'image porte une transformation "translate puis scale", d'origine
       centree. Un point de l'image sous le curseur doit y rester pendant le
       zoom, sinon on perd ce qu'on visait des le premier cran.

       Le centre visuel ne bouge pas quand on met a l'echelle autour de lui :
       la position ecran du centre vaut donc toujours centre de mise en page
       plus translation. En notant d l'ecart entre le curseur et ce centre,
       garder le point fixe revient a corriger la translation de d fois
       (1 moins le rapport des echelles). Deux lignes, sans mesurer la mise en
       page ni toucher a l'origine de la transformation. */

    function applyZoom() {
        const img = document.getElementById('pv-image');
        if (!img) return;

        img.style.transform =
            `translate(${state.pan.x}px, ${state.pan.y}px) scale(${state.zoom})`;
        img.classList.toggle('zoomed', state.zoom > 1);
    }

    function resetZoom() {
        state.zoom = 1;
        state.pan = { x: 0, y: 0 };
        state.drag = null;
        applyZoom();
    }

    function zoomAt(clientX, clientY, factor) {
        const img = document.getElementById('pv-image');
        if (!img) return;

        const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, state.zoom * factor));
        if (next === state.zoom) return;

        if (next === ZOOM_MIN) {
            resetZoom();
            return;
        }

        const box = img.getBoundingClientRect();
        const dx = clientX - (box.left + box.width / 2);
        const dy = clientY - (box.top + box.height / 2);
        const ratio = 1 - next / state.zoom;

        state.pan.x += dx * ratio;
        state.pan.y += dy * ratio;
        state.zoom = next;
        applyZoom();
    }

    function bindZoom() {
        const stage = document.getElementById('pv-stage');
        const img = document.getElementById('pv-image');
        if (!stage || !img) return;

        /* Non passif : sans preventDefault la page defile sous la
           visionneuse pendant qu'on zoome. */
        stage.addEventListener('wheel', e => {
            e.preventDefault();
            zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP);
        }, { passive: false });

        /* Double clic : aller et retour, plus rapide que de remonter cran
           par cran a la molette. */
        stage.addEventListener('dblclick', e => {
            if (state.zoom > 1) resetZoom();
            else zoomAt(e.clientX, e.clientY, 2.5);
        });

        img.addEventListener('pointerdown', e => {
            if (state.zoom <= 1) return;
            state.drag = { x: e.clientX, y: e.clientY };
            img.setPointerCapture(e.pointerId);
            e.preventDefault();
        });

        img.addEventListener('pointermove', e => {
            if (!state.drag) return;
            state.pan.x += e.clientX - state.drag.x;
            state.pan.y += e.clientY - state.drag.y;
            state.drag = { x: e.clientX, y: e.clientY };
            applyZoom();
        });

        const endDrag = () => { state.drag = null; };
        img.addEventListener('pointerup', endDrag);
        img.addEventListener('pointercancel', endDrag);
    }


    function open(id) {
        const photo = state.photos.find(p => p.id === id);
        const viewer = document.getElementById('photo-viewer');
        if (!photo || !viewer) return;

        state.current = photo;

        const title = document.getElementById('pv-title');
        if (title) title.textContent = photo.title;

        const tags = document.getElementById('pv-tags');
        if (tags) {
            tags.innerHTML = photo.tags
                .map(t => `<button class="pv-tag" data-tag="${esc(t)}">#${esc(t)}</button>`)
                .join('');
        }

        const img = document.getElementById('pv-image');
        if (img) {
            img.src = photo.full;
            img.alt = photo.title;
        }

        resetZoom();
        updateCounter();

        viewer.classList.add('open');
        document.body.classList.add('photo-open');
        const close = document.getElementById('pv-close');
        if (close) close.focus();

        if (window.location.hash !== `#photo:${photo.id}`) {
            history.pushState(null, null, `#photo:${photo.id}`);
        }
    }

    /* La navigation suit ce qui est affiche, pas la collection entiere :
       avec un tag actif, la fleche passe a la photo suivante du filtre. */
    function updateCounter() {
        const counter = document.getElementById('pv-counter');
        const list = state.visible.length ? state.visible : state.photos;
        const index = list.findIndex(p => state.current && p.id === state.current.id);

        const many = list.length > 1;
        ['pv-prev', 'pv-next'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.hidden = !many;
        });

        if (counter) {
            counter.hidden = !many;
            counter.textContent = index >= 0 ? `${index + 1} / ${list.length}` : '';
        }
    }

    function step(delta) {
        const list = state.visible.length ? state.visible : state.photos;
        if (!state.current || list.length < 2) return;

        const index = list.findIndex(p => p.id === state.current.id);
        if (index < 0) return;

        open(list[(index + delta + list.length) % list.length].id);
    }

    function close() {
        const viewer = document.getElementById('photo-viewer');
        if (!viewer) return;
        viewer.classList.remove('open');
        document.body.classList.remove('photo-open');

        const img = document.getElementById('pv-image');
        if (img) img.removeAttribute('src');
        resetZoom();
        state.current = null;

        if (window.location.hash.startsWith('#photo:')) {
            history.pushState(null, null, '#photos');
        }
    }

    /* --- CHARGEMENT --- */

    let loading = null;

    function load() {
        if (state.loaded) return Promise.resolve();
        if (!loading) loading = fetchData().finally(() => { loading = null; });
        return loading;
    }

    async function fetchData() {
        const status = document.getElementById('photos-status');
        try {
            const res = await fetch(DATA_URL, { cache: 'no-cache' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            state.photos = Array.isArray(data.photos) ? data.photos : [];
            state.tags = Array.isArray(data.tags) ? data.tags : [];
            state.meta = data;
            state.loaded = true;
        } catch (e) {
            console.warn('photos.json unreachable', e);
            if (status) status.innerHTML = '&gt; GALLERY UNREACHABLE // RETRY LATER';
            return;
        }
        render();
    }

    function bindOnce() {
        if (bindOnce.done) return;
        bindOnce.done = true;

        state.mode = readMode();

        const grid = document.getElementById('photo-grid');
        if (grid) {
            grid.addEventListener('click', e => {
                const shot = e.target.closest('.shot');
                if (shot) open(shot.dataset.id);
            });
        }

        const bar = document.getElementById('photo-tags');
        if (bar) {
            bar.addEventListener('click', e => {
                const more = e.target.closest('.tag-more');
                if (more) {
                    state.tagsOpen = more.dataset.more === 'open';
                    renderTags();
                    return;
                }
                if (e.target.closest('.tag-clear')) {
                    state.active.clear();
                    render();
                    return;
                }
                const tag = e.target.closest('.tag');
                if (tag && tag.dataset.tag) toggleTag(tag.dataset.tag);
            });
        }

        /* Le champ de recherche est hors de la zone reconstruite : le retaper
           a chaque frappe lui ferait perdre le curseur. */
        const search = document.getElementById('photo-tag-search');
        if (search) {
            search.addEventListener('input', e => {
                state.tagQuery = e.target.value;
                renderTags();
            });
        }

        const modes = document.getElementById('photo-modes');
        if (modes) {
            modes.addEventListener('click', e => {
                const btn = e.target.closest('.mode-btn');
                if (btn) setMode(btn.dataset.mode);
            });
        }

        const closeBtn = document.getElementById('pv-close');
        if (closeBtn) closeBtn.addEventListener('click', close);

        const prev = document.getElementById('pv-prev');
        if (prev) prev.addEventListener('click', () => step(-1));

        const next = document.getElementById('pv-next');
        if (next) next.addEventListener('click', () => step(1));

        /* Cliquer un tag depuis la visionneuse ferme celle-ci et applique le
           filtre : on veut voir la serie, pas rester sur une seule image. */
        const pvTags = document.getElementById('pv-tags');
        if (pvTags) {
            pvTags.addEventListener('click', e => {
                const tag = e.target.closest('.pv-tag');
                if (!tag) return;
                close();
                focusTag(tag.dataset.tag);
            });
        }

        document.addEventListener('keydown', e => {
            const viewer = document.getElementById('photo-viewer');
            if (!viewer || !viewer.classList.contains('open')) return;
            if (e.key === 'Escape') close();
            else if (e.key === 'ArrowLeft') step(-1);
            else if (e.key === 'ArrowRight') step(1);
        });

        bindZoom();

        const stage = document.getElementById('pv-stage');
        if (stage) {
            let startX = null;
            stage.addEventListener('touchstart', e => {
                startX = e.touches[0].clientX;
            }, { passive: true });
            stage.addEventListener('touchend', e => {
                if (startX === null) return;
                const dx = e.changedTouches[0].clientX - startX;
                /* Zoome, le doigt deplace l'image : changer de photo au meme
                   geste rendrait le deplacement impossible. */
                if (state.zoom === 1 && Math.abs(dx) > 55) step(dx < 0 ? 1 : -1);
                startX = null;
            }, { passive: true });
        }
    }

    async function init() {
        bindOnce();
        await load();
        render();
    }

    /* Sur un lien profond la visionneuse s'ouvre tout de suite, vide, le temps
       que l'index arrive : sans ca la grille s'affiche puis disparait dessous. */
    function openPlaceholder() {
        const viewer = document.getElementById('photo-viewer');
        if (!viewer || viewer.classList.contains('open')) return;

        const title = document.getElementById('pv-title');
        if (title) title.textContent = '';
        const tags = document.getElementById('pv-tags');
        if (tags) tags.innerHTML = '';
        const img = document.getElementById('pv-image');
        if (img) img.removeAttribute('src');

        ['pv-prev', 'pv-next', 'pv-counter'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.hidden = true;
        });

        viewer.classList.add('open');
        document.body.classList.add('photo-open');
    }

    async function openFromHash(id) {
        openPlaceholder();
        await init();

        if (state.photos.some(p => p.id === id)) open(id);
        else close();
    }

    return { init, open, openFromHash, close, focusTag, setMode };
})();

function initPhotos() {
    PHOTOS.init();
}

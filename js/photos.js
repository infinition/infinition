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

    /* --- ANIMATIONS ---
       A l'ouverture la photo nait de la vignette cliquee et grandit jusqu'a
       sa place : un fondu ne dirait pas d'ou elle vient, ce mouvement si.
       A la fermeture elle y retourne. Au changement, elle sort du cote vers
       lequel on va et la suivante entre par l'autre bord.

       Le calcul fait coincider le contenu peint et non la boite : object-fit
       "contain" laisse des bandes, et caler la boite ferait partir la photo
       d'a cote de la vignette. */

    const ANIM = { duration: 500, easing: 'cubic-bezier(.22, .61, .36, 1)' };

    const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let closing = false;

    /* Le defilement s'interrompt au lieu d'ignorer les appuis : un jeton
       invalide l'enchainement en cours, et les animations encore en vol sont
       annulees. Deux photos enchainees a moins d'un quart de seconde sont
       tenues pour un defilement rapide, ou l'animation est sautee : la jouer
       entiere imposerait un demi-seconde d'attente par photo. */
    const FAST_STEP = 260;
    let stepSeq = 0;
    let lastStepAt = 0;
    let stepAnims = [];

    /* Un enchainement anime ne change la photo qu'a la fin de sa sortie. Un
       appui qui l'interrompt doit donc repartir de la photo visee, et non de
       celle encore affichee, sinon un cran sur deux est perdu en rafale. */
    let pendingStepId = null;

    function cancelStepAnims() {
        stepAnims.forEach(a => {
            try { a.cancel(); } catch { /* deja terminee */ }
        });
        stepAnims = [];
    }

    /* L'animation de fermeture tient l'opacite a zero jusqu'a son terme
       (fill forwards), sinon la visionneuse reapparaitrait d'un coup a la
       derniere image. Il faut donc l'annuler une fois le travail fait, et a
       toute reouverture : sans cela son zero survit et la visionneuse
       suivante s'ouvre invisible. Le jeton couvre le cas ou l'on rouvre
       pendant l'animation, dont la fin ne doit alors plus rien fermer. */
    let closeAnims = [];
    let closeSeq = 0;

    function cancelClose() {
        closeSeq += 1;
        closing = false;
        closeAnims.forEach(a => {
            try { a.cancel(); } catch { /* deja terminee */ }
        });
        closeAnims = [];
    }

    function paintedRect(img) {
        const box = img.getBoundingClientRect();
        const nw = img.naturalWidth || box.width;
        const nh = img.naturalHeight || box.height;
        if (!nw || !nh || !box.width) return null;

        const fit = Math.min(box.width / nw, box.height / nh);
        return {
            width: nw * fit,
            height: nh * fit,
            cx: box.left + box.width / 2,
            cy: box.top + box.height / 2
        };
    }

    /* Transformation qui superpose la photo a la vignette d'origine. */
    function flipFrom(img, from) {
        const to = paintedRect(img);
        if (!from || !to || !to.width || !from.width) return null;

        const dx = from.left + from.width / 2 - to.cx;
        const dy = from.top + from.height / 2 - to.cy;
        return `translate(${dx}px, ${dy}px) scale(${from.width / to.width})`;
    }

    /* La vignette d'ou la photo est partie, si elle est encore affichee : au
       retour d'un filtre ou d'un lien profond elle peut avoir disparu. */
    function originRect() {
        if (!state.current) return null;
        const shot = document.querySelector(`#photo-grid .shot[data-id="${CSS.escape(state.current.id)}"]`);
        if (!shot) return null;

        const box = shot.getBoundingClientRect();
        return box.width && box.bottom > 0 && box.top < window.innerHeight ? box : null;
    }

    function whenReady(img, run) {
        if (img.complete && img.naturalWidth) {
            run();
            return;
        }

        let done = false;
        const once = () => {
            if (done) return;
            done = true;
            run();
        };

        img.addEventListener('load', once, { once: true });
        /* Une image en echec n'emet pas "load". Sans ce filet, l'animation de
           changement resterait bloquee et la visionneuse figee. */
        img.addEventListener('error', once, { once: true });
        setTimeout(once, 1200);
    }

    function animateOpen(from) {
        const img = document.getElementById('pv-image');
        const viewer = document.getElementById('photo-viewer');
        if (!img || !viewer || reduceMotion()) return;

        whenReady(img, () => {
            const start = flipFrom(img, from);
            img.animate([
                { transform: start || 'scale(.88)', opacity: start ? 1 : 0 },
                { transform: 'none', opacity: 1 }
            ], ANIM);
            viewer.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 280, easing: 'ease-out' });
        });
    }

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

    /* --- GESTES SUR L'APERCU ---
       Un seul jeu d'ecouteurs, en evenements de pointeur : ils couvrent la
       souris, le stylet et le doigt, et evitent le double traitement qu'on
       aurait en melangeant evenements tactiles et souris.

       Zones de clic : les bandes laterales font defiler, le centre ferme.
       Deux doigts pincent pour zoomer sans quitter l'apercu, un doigt
       deplace l'image des qu'elle est zoomee. */
    function bindStage() {
        const stage = document.getElementById('pv-stage');
        if (!stage) return;

        const pointers = new Map();
        let pinch = null;
        let origin = null;
        let travel = 0;

        /* Ecart et milieu des deux doigts : le milieu sert d'ancre au zoom,
           exactement comme le curseur a la molette. */
        const span = () => {
            const [a, b] = [...pointers.values()];
            return {
                dist: Math.hypot(a.x - b.x, a.y - b.y),
                cx: (a.x + b.x) / 2,
                cy: (a.y + b.y) / 2
            };
        };

        stage.addEventListener('wheel', e => {
            /* Non passif : sans preventDefault la page defile sous la
               visionneuse pendant qu'on zoome. */
            e.preventDefault();
            zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP);
        }, { passive: false });

        stage.addEventListener('pointerdown', e => {
            if (e.target.closest('.pv-nav')) return;

            pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
            try { stage.setPointerCapture(e.pointerId); } catch { /* deja capture */ }

            if (pointers.size === 1) {
                origin = { x: e.clientX, y: e.clientY };
                travel = 0;
            } else if (pointers.size === 2) {
                pinch = span();
            }
        });

        stage.addEventListener('pointermove', e => {
            if (!pointers.has(e.pointerId)) return;

            const before = pointers.get(e.pointerId);
            travel = Math.max(travel, Math.hypot(e.clientX - (origin || before).x,
                e.clientY - (origin || before).y));
            pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

            if (pointers.size >= 2) {
                const now = span();
                if (pinch && pinch.dist > 0) {
                    zoomAt(now.cx, now.cy, now.dist / pinch.dist);
                    /* Le pincement deplace aussi : les deux doigts peuvent
                       glisser en meme temps qu'ils ecartent. */
                    state.pan.x += now.cx - pinch.cx;
                    state.pan.y += now.cy - pinch.cy;
                    applyZoom();
                }
                pinch = now;
                e.preventDefault();
                return;
            }

            if (state.zoom > 1) {
                state.pan.x += e.clientX - before.x;
                state.pan.y += e.clientY - before.y;
                applyZoom();
                e.preventDefault();
            }
        });

        const release = e => {
            const last = pointers.get(e.pointerId);
            pointers.delete(e.pointerId);
            if (pointers.size < 2) pinch = null;
            if (pointers.size > 0 || !last || !origin) return;

            const dx = last.x - origin.x;
            const dy = last.y - origin.y;
            origin = null;

            /* Balayage : seulement a plat, sinon le doigt deplace l'image. */
            if (state.zoom === 1 && Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) {
                travel = 999;
                step(dx < 0 ? 1 : -1);
            }
        };

        stage.addEventListener('pointerup', release);
        stage.addEventListener('pointercancel', release);

        stage.addEventListener('click', e => {
            /* Les fleches et les commandes de la barre ont leur propre clic. */
            if (e.target.closest('.pv-nav, .pv-close, .pv-tag')) return;
            /* Un clic qui termine un deplacement ou un balayage n'en est pas un. */
            if (travel > 8) return;
            /* Zoome, on inspecte : ni fermeture ni changement de photo. */
            if (state.zoom > 1) return;

            const box = stage.getBoundingClientRect();
            const x = (e.clientX - box.left) / box.width;

            if (x < 0.22) step(-1);
            else if (x > 0.78) step(1);
            else close();
        });

        /* Double clic : revenir a plat quand on a zoome. L'agrandissement se
           fait a la molette ou au pincement, sinon le premier clic du double
           fermerait l'apercu. */
        stage.addEventListener('dblclick', () => {
            if (state.zoom > 1) resetZoom();
        });
    }

    function open(id, from = null, silent = false) {
        const photo = state.photos.find(p => p.id === id);
        const viewer = document.getElementById('photo-viewer');
        if (!photo || !viewer) return;

        const wasOpen = viewer.classList.contains('open') && !closing;
        /* Toute fermeture en cours ou terminee cesse de peser sur la vue. */
        cancelClose();
        if (!silent) pendingStepId = null;
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

        if (!silent && !wasOpen) animateOpen(from);

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

    async function step(delta) {
        const list = state.visible.length ? state.visible : state.photos;
        if (!state.current || list.length < 2) return;

        const from = list.some(p => p.id === pendingStepId) ? pendingStepId : state.current.id;
        const index = list.findIndex(p => p.id === from);
        if (index < 0) return;

        const next = list[(index + delta + list.length) % list.length];
        const img = document.getElementById('pv-image');
        pendingStepId = next.id;

        const now = performance.now();
        const rapide = now - lastStepAt < FAST_STEP;
        lastStepAt = now;

        const seq = ++stepSeq;
        cancelStepAnims();

        if (!img || reduceMotion() || rapide) {
            open(next.id, null, true);
            pendingStepId = null;
            return;
        }

        /* Aller vers la suivante pousse l'image vers la gauche, la nouvelle
           arrive de la droite : le mouvement suit la direction du geste. */
        const way = delta > 0 ? -1 : 1;

        /* fill forwards : sans lui l'ancienne photo revient d'un coup au
           centre, a pleine opacite, entre la fin de la sortie et l'arrivee de
           la suivante. */
        const leaving = img.animate([
            { transform: img.style.transform || 'none', opacity: 1 },
            { transform: `translateX(${way * 16}%) scale(.94)`, opacity: 0 }
        ], { duration: 210, easing: 'cubic-bezier(.4, 0, 1, 1)', fill: 'forwards' });

        stepAnims = [leaving];
        await leaving.finished.catch(() => { });
        if (seq !== stepSeq) return;

        /* L'image reste tenue hors champ pendant l'echange de source et le
           temps de chargement, quel qu'il soit. */
        open(next.id, null, true);
        pendingStepId = null;
        await new Promise(resolve => whenReady(img, resolve));
        if (seq !== stepSeq) return;

        const entering = img.animate([
            { transform: `translateX(${-way * 16}%) scale(.94)`, opacity: 0 },
            { transform: 'none', opacity: 1 }
        ], { duration: 290, easing: ANIM.easing });

        /* L'entree est posee la derniere, elle l'emporte : on peut relacher la
           sortie sans qu'une seule image ne clignote. */
        stepAnims = [entering];
        leaving.cancel();

        await entering.finished.catch(() => { });
        if (seq === stepSeq) stepAnims = [];
    }

    function close() {
        const viewer = document.getElementById('photo-viewer');
        if (!viewer || !viewer.classList.contains('open') || closing) return;

        const img = document.getElementById('pv-image');
        const back = originRect();

        const seq = ++closeSeq;
        const finish = () => {
            /* Une reouverture a eu lieu pendant l'animation : cette fermeture
               ne la concerne plus. */
            if (seq !== closeSeq) return;

            closing = false;
            viewer.classList.remove('open');
            document.body.classList.remove('photo-open');
            if (img) img.removeAttribute('src');
            resetZoom();
            state.current = null;
            /* La vue est masquee, l'opacite retenue peut etre relachee. */
            cancelClose();
        };

        if (!img || !img.getAttribute('src') || reduceMotion()) {
            finish();
        } else {
            closing = true;
            /* La photo repart vers sa vignette. Sans vignette a l'ecran, elle
               se retire simplement sur place. */
            const end = flipFrom(img, back);
            const slide = img.animate([
                { transform: img.style.transform || 'none', opacity: 1 },
                { transform: end || 'scale(.9)', opacity: end ? 1 : 0 }
            ], ANIM);
            const fade = viewer.animate([{ opacity: 1 }, { opacity: 0 }],
                { duration: ANIM.duration, easing: 'ease-in', fill: 'forwards' });

            closeAnims = [slide, fade];
            fade.onfinish = finish;
        }

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
                if (shot) open(shot.dataset.id, shot.getBoundingClientRect());
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

        bindStage();

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

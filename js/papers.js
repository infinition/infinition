/* =========================================================
   LIBRARY

   Un rayonnage par nature de texte. Deux sources, un seul rendu :

     - data/papers.json, les publications arXiv et les preprints,
       produit par scripts/build-papers.mjs. Leur couverture est la
       premiere page de leur PDF.
     - data/library.json, les textes markdown du dossier library/,
       produit par scripts/build-library.mjs. Ils n'ont pas de page
       a photographier, leur couverture est typographique.

   Les deux JSON sont construits une fois par jour par
   .github/workflows/site-data.yml. La page ne tape jamais arXiv
   elle meme, qui repond 429 des qu'une adresse insiste.
   ========================================================= */

const PAPERS = (() => {
    const PAPERS_URL = 'data/papers.json';
    const LIBRARY_URL = 'data/library.json';

    /* Une couleur par grande famille arXiv, prise dans la palette du site.
       L'ordre compte : un papier classe cs.LG et cs.CR sort en orange, la
       securite etant ce qui le distingue du reste du rayon.
       Tout ce qui n'est pas liste retombe sur le vert. */
    const CATEGORY_ACCENT = [
        ['cs.CR', 'orange'],
        ['quant-ph', 'blue'],
        ['gr-qc', 'blue'],
        ['hep-th', 'blue'],
        ['cond-mat.str-el', 'blue'],
        ['cs.CV', 'blue'],
        ['cs.RO', 'blue'],
        ['cs.DC', 'blue'],
        ['eess.SP', 'blue'],
        ['math.OC', 'orange'],
        ['cs.AI', 'purple'],
        ['cs.NE', 'purple'],
        ['stat.ML', 'purple'],
        ['cs.LG', 'purple']
    ];

    const ACCENT_RGB = {
        orange: '255, 107, 0',
        green: '10, 255, 71',
        blue: '19, 175, 240',
        purple: '189, 0, 255',
        red: '255, 0, 60'
    };

    const state = {
        shelves: [],
        works: new Map(),
        meta: null,
        loaded: false,
        sort: 'date',
        query: '',
        current: null
    };

    /* Aucun navigateur mobile n'affiche un PDF dans une iframe : Safari iOS
       fige la premiere page sans defilement, Chrome Android propose un
       telechargement. Sur ces appareils la liseuse reste sur le texte et
       renvoie vers le PDF, plutot que de servir un cadre inutilisable. */
    const canEmbedPdf = () => !window.matchMedia('(pointer: coarse)').matches;

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

    /* --- NORMALISATION DES DEUX SOURCES --------------------------------- */

    const catsOf = paper => [paper.primary_category, ...(paper.categories || [])].filter(Boolean);

    const categoryMatch = paper => {
        const cats = catsOf(paper);
        return CATEGORY_ACCENT.find(([cat]) => cats.includes(cat));
    };

    /* Le champ comment d'arXiv commence presque toujours par "10 pages, 2
       figures". On en tire une pagination, comme sur une fiche de catalogue. */
    function pagesOf(paper) {
        const m = String(paper.comment || '').match(/(\d+)\s*pages?/i);
        return m ? `${m[1]} p` : '';
    }

    function authorsOf(paper) {
        const list = paper.authors || [];
        if (list.length === 0) return (state.meta && state.meta.author) || '';
        if (list.length <= 3) return list.join(', ');
        return `${list[0]} et al.`;
    }

    /* Un papier et un essai n'ont presque aucun champ en commun. On les
       ramene ici a une meme fiche, et tout le rendu qui suit ignore d'ou
       vient le texte. */
    function fromPaper(paper) {
        const hit = categoryMatch(paper);
        const pages = pagesOf(paper);

        return {
            kind: 'paper',
            id: paper.id,
            hash: `#paper:${paper.id}`,
            title: paper.title,
            subtitle: '',
            byline: authorsOf(paper),
            summary: paper.abstract || '',
            date: paper.published || '',
            accent: hit ? hit[1] : 'green',
            badge: (hit && hit[0]) || catsOf(paper)[0] || 'preprint',
            ref: paper.status === 'pending'
                ? 'preprint'
                : `arXiv ${paper.id}${paper.version || ''}`,
            note: pages,
            cover: paper.cover || '',
            facts: [
                formatDate(paper.published),
                ...(paper.categories || []),
                paper.journal_ref,
                paper.doi ? `doi ${paper.doi}` : ''
            ].filter(Boolean),
            comment: paper.comment || '',
            pdf_url: paper.pdf_url || '',
            source_url: paper.abs_url || '',
            source_label: paper.status === 'pending' ? 'Source repo' : 'arXiv page',
            pending: paper.status === 'pending',
            search: [paper.title, paper.abstract, paper.id,
            (paper.categories || []).join(' '), (paper.authors || []).join(' ')].join(' ')
        };
    }

    function fromText(entry, shelf) {
        const minutes = entry.reading_minutes || 1;

        return {
            kind: 'text',
            id: entry.id,
            hash: `#read:${entry.id}`,
            title: entry.title,
            subtitle: entry.subtitle || '',
            byline: (state.meta && state.meta.author) || 'Fabien Polly',
            summary: entry.summary || '',
            date: entry.date || '',
            accent: shelf.accent || 'green',
            badge: (entry.lang || 'en').toUpperCase(),
            ref: `${entry.words.toLocaleString('en-US')} words`,
            note: `${minutes} min`,
            cover: '',
            facts: [formatDate(entry.date), `${minutes} min read`, ...(entry.tags || [])].filter(Boolean),
            comment: '',
            pdf_url: '',
            source_url: '',
            source_label: '',
            pending: false,
            path: entry.path,
            search: [entry.title, entry.subtitle, entry.summary, (entry.tags || []).join(' ')].join(' ')
        };
    }

    /* --- RENDU DU RAYONNAGE --------------------------------------------- */

    function coverHtml(work) {
        if (work.cover) {
            return `<img class="book-page" src="${esc(work.cover)}" alt="" loading="lazy" decoding="async">`;
        }
        /* Sans page a photographier, la couverture se compose : c'est le cas
           des essais, et d'un preprint dont le PDF n'a pas pu etre lu. */
        return `
            <span class="book-type">
                <span class="book-type-title">${esc(work.title)}</span>
                <span class="book-type-foot">
                    <span>${esc(work.byline)}</span>
                    <span class="book-type-ref">${esc(work.ref)}</span>
                </span>
            </span>`;
    }

    function bookHtml(work, index) {
        return `
            <button class="book${work.cover ? ' has-page' : ''}"
                    style="--accent: var(--neon-${work.accent}); --accent-rgb: ${ACCENT_RGB[work.accent]}; animation-delay: ${Math.min(index * 35, 420)}ms"
                    data-id="${esc(work.id)}"
                    aria-label="${esc(work.title)}">
                <span class="book-3d">
                    <span class="book-spine"></span>
                    <span class="book-cover">
                        ${coverHtml(work)}
                        <span class="book-badge">${esc(work.badge)}</span>
                    </span>
                </span>
                <span class="book-plank"></span>
                <span class="book-caption">
                    <span class="book-name">${esc(work.title)}</span>
                    <span class="book-sub">
                        <span>${esc(formatDate(work.date))}</span>
                        <span>${esc(work.note)}</span>
                    </span>
                </span>
            </button>`;
    }

    function visibleWorks(shelf) {
        const q = state.query.trim().toLowerCase();
        let list = shelf.works.slice();

        if (q) list = list.filter(w => w.search.toLowerCase().includes(q));

        if (state.sort === 'title') list.sort((a, b) => a.title.localeCompare(b.title));
        else list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

        return list;
    }

    function render() {
        const host = document.getElementById('papers-shelves');
        if (!host) return;

        /* Un rayon sans resultat disparait au lieu d'afficher un titre vide,
           et la numerotation ne repart pas a zero entre les rayons pour que
           l'animation d'entree reste en cascade. */
        let offset = 0;
        const sections = state.shelves.map(shelf => {
            const list = visibleWorks(shelf);
            if (list.length === 0) return '';

            const books = list.map((w, i) => bookHtml(w, offset + i)).join('');
            offset += list.length;

            return `
                <section class="shelf-block">
                    <h2 class="shelf-title">
                        <span>${esc(shelf.label)}</span>
                        <span class="shelf-count">${list.length}</span>
                    </h2>
                    <div class="shelf">${books}</div>
                </section>`;
        }).join('');

        host.innerHTML = sections || `<div class="papers-empty">&gt; NO MATCH IN THE ARCHIVE</div>`;

        const total = document.getElementById('papers-count');
        if (total) total.textContent = state.works.size;

        const status = document.getElementById('papers-status');
        if (status && state.meta) {
            const stamp = formatDate(state.meta.generated_at);
            status.innerHTML = `&gt; ARCHIVE SYNCED <span class="ok">${esc(stamp)}</span> // SOURCE arXiv &amp; library/`;
        }
    }

    /* --- LISEUSE --------------------------------------------------------- */

    function open(id) {
        const work = state.works.get(id);
        const reader = document.getElementById('paper-reader');
        if (!work || !reader) return;

        state.current = work;
        reader.style.setProperty('--accent', `var(--neon-${work.accent})`);
        reader.style.setProperty('--accent-rgb', ACCENT_RGB[work.accent]);

        const heading = document.getElementById('pr-title');
        if (heading) heading.textContent = work.title;
        const ref = document.getElementById('pr-ref');
        if (ref) ref.textContent = work.ref;

        const sourceLink = document.getElementById('pr-abs-link');
        if (sourceLink) {
            sourceLink.href = work.source_url || '#';
            sourceLink.hidden = !work.source_url;
        }
        const pdfLink = document.getElementById('pr-pdf-link');
        if (pdfLink) {
            pdfLink.href = work.pdf_url || '#';
            pdfLink.hidden = !work.pdf_url;
        }

        /* Sans PDF embarquable il n'y a qu'un mode, le selecteur disparait. */
        const canEmbed = Boolean(work.pdf_url) && canEmbedPdf();
        const modes = document.getElementById('pr-modes');
        if (modes) modes.hidden = !canEmbed;

        renderPage(work);
        setMode(canEmbed ? 'pdf' : 'read');

        reader.classList.add('open');
        document.body.classList.add('reader-open');
        const close = document.getElementById('pr-close');
        if (close) close.focus();

        if (window.location.hash !== work.hash) {
            history.pushState(null, null, work.hash);
        }
    }

    /* La page de lecture d'un papier : un resume typographie, et les liens
       vers le document complet. Un essai, lui, se lit entierement ici. */
    function renderPage(work) {
        const host = document.getElementById('pr-page');
        if (!host) return;

        const head = `
            <h1>${esc(work.title)}</h1>
            ${work.subtitle ? `<p class="pr-subtitle">${esc(work.subtitle)}</p>` : ''}
            <div class="pr-authors">${esc(work.byline)}</div>
            <div class="pr-facts">${work.facts.map(f => `<span class="pr-fact">${esc(f)}</span>`).join('')}</div>`;

        if (work.kind === 'text') {
            host.innerHTML = `${head}<div class="pr-body kb-markdown-body" id="pr-markdown">
                <p class="pr-loading">Loading the text...</p>
            </div>`;
            loadMarkdown(work);
            return;
        }

        host.innerHTML = `
            ${head}
            <div class="pr-label">Abstract</div>
            <div class="pr-abstract">${esc(work.summary)}</div>
            ${work.comment ? `<div class="pr-note">${esc(work.comment)}</div>` : ''}
            ${work.pending
                ? `<div class="pr-note">Preprint, not announced on arXiv yet. The PDF is the author's current version.</div>`
                : ''}
            <div class="pr-ctas">
                ${work.pdf_url ? `
                <a class="pr-cta" href="${esc(work.pdf_url)}" target="_blank" rel="noopener noreferrer">
                    <i class="fas fa-file-pdf"></i> Open the PDF
                </a>` : ''}
                ${work.source_url ? `
                <a class="pr-cta is-ghost" href="${esc(work.source_url)}" target="_blank" rel="noopener noreferrer">
                    <i class="fas fa-external-link-alt"></i> ${esc(work.source_label)}
                </a>` : ''}
            </div>`;
    }

    /* Le markdown n'est pas embarque dans l'index : un essai pese des
       dizaines de milliers de caracteres et personne ne les lit tous. */
    async function loadMarkdown(work) {
        const host = document.getElementById('pr-markdown');
        if (!host) return;

        try {
            const res = await fetch(work.path, { cache: 'no-cache' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const raw = await res.text();

            /* L'en-tete a deja ete lu a la construction de l'index, il n'a
               rien a faire dans la page. */
            const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');

            host.innerHTML = (typeof marked !== 'undefined')
                ? marked.parse(body)
                : `<pre>${esc(body)}</pre>`;
        } catch (e) {
            console.warn('markdown unreachable', e);
            host.innerHTML = `<p class="pr-loading">This text could not be loaded.</p>`;
        }
    }

    function setMode(mode) {
        const work = state.current;
        if (!work) return;
        if (mode === 'pdf' && (!work.pdf_url || !canEmbedPdf())) mode = 'read';

        document.querySelectorAll('.paper-reader .pr-mode').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        document.querySelectorAll('.paper-reader .pr-pane').forEach(pane => {
            pane.classList.toggle('active', pane.dataset.mode === mode);
        });

        const frame = document.getElementById('pr-frame');
        if (!frame) return;

        if (mode === 'pdf') {
            if (frame.getAttribute('src') !== work.pdf_url) frame.setAttribute('src', work.pdf_url);
        } else {
            /* On vide l'iframe en quittant le mode PDF : un document de
               plusieurs mega reste sinon en memoire a chaque ouverture. */
            frame.setAttribute('src', '');
        }
    }

    function close() {
        const reader = document.getElementById('paper-reader');
        if (!reader) return;
        reader.classList.remove('open');
        document.body.classList.remove('reader-open');

        const frame = document.getElementById('pr-frame');
        if (frame) frame.setAttribute('src', '');
        state.current = null;

        if (/^#(paper|read):/.test(window.location.hash)) {
            history.pushState(null, null, '#papers');
        }
    }

    /* --- CHARGEMENT ------------------------------------------------------ */

    async function getJson(url) {
        const res = await fetch(url, { cache: 'no-cache' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    }

    /* navigateTo et openFromHash appellent init en parallele sur une URL
       profonde, on memorise donc la promesse plutot que de lancer deux fetch. */
    let loading = null;

    function load() {
        if (state.loaded) return Promise.resolve();
        if (!loading) loading = fetchData().finally(() => { loading = null; });
        return loading;
    }

    async function fetchData() {
        const status = document.getElementById('papers-status');

        /* Les deux rayons sont independants : la bibliotheque de textes peut
           manquer sans emporter les publications, et l'inverse. */
        const [papers, library] = await Promise.all([
            getJson(PAPERS_URL).catch(e => {
                console.warn('papers.json unreachable', e);
                return null;
            }),
            getJson(LIBRARY_URL).catch(e => {
                console.warn('library.json unreachable', e);
                return null;
            })
        ]);

        if (!papers && !library) {
            if (status) status.innerHTML = '&gt; ARCHIVE UNREACHABLE // RETRY LATER';
            return;
        }

        state.meta = papers || library;
        state.shelves = [];
        state.works.clear();

        if (papers && Array.isArray(papers.papers) && papers.papers.length) {
            const works = papers.papers.map(fromPaper);
            state.shelves.push({ id: 'papers', label: 'Papers', works });
        }

        for (const shelf of (library && library.shelves) || []) {
            const works = (shelf.entries || []).map(e => fromText(e, shelf));
            if (works.length) state.shelves.push({ id: shelf.id, label: shelf.label, works });
        }

        state.shelves.forEach(s => s.works.forEach(w => state.works.set(w.id, w)));
        state.loaded = true;
        render();
    }

    function bindOnce() {
        if (bindOnce.done) return;
        bindOnce.done = true;

        const host = document.getElementById('papers-shelves');
        if (host) {
            host.addEventListener('click', e => {
                const book = e.target.closest('.book');
                if (book) open(book.dataset.id);
            });
        }

        const search = document.getElementById('papers-filter');
        if (search) {
            search.addEventListener('input', e => {
                state.query = e.target.value;
                render();
            });
        }

        const sortGroup = document.getElementById('papers-sort-group');
        if (sortGroup) {
            sortGroup.addEventListener('click', e => {
                const btn = e.target.closest('.sort-btn');
                if (!btn) return;
                state.sort = btn.dataset.sort;
                sortGroup.querySelectorAll('.sort-btn')
                    .forEach(b => b.classList.toggle('active', b === btn));
                render();
            });
        }

        const closeBtn = document.getElementById('pr-close');
        if (closeBtn) closeBtn.addEventListener('click', close);

        const modes = document.getElementById('pr-modes');
        if (modes) {
            modes.addEventListener('click', e => {
                const btn = e.target.closest('.pr-mode');
                if (btn) setMode(btn.dataset.mode);
            });
        }

        document.addEventListener('keydown', e => {
            const reader = document.getElementById('paper-reader');
            if (e.key === 'Escape' && reader && reader.classList.contains('open')) close();
        });
    }

    async function init() {
        bindOnce();
        await load();
        render();
    }

    /* Sur un lien profond la liseuse s'ouvre immediatement, vide, le temps que
       l'index arrive. Sans ca le visiteur voyait le rayonnage s'afficher puis
       disparaitre sous la liseuse, ce qui donne l'impression d'un detour par
       une page qu'il n'a pas demandee. */
    function openPlaceholder() {
        const reader = document.getElementById('paper-reader');
        if (!reader || reader.classList.contains('open')) return;

        const put = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };
        put('pr-title', '');
        put('pr-ref', '');

        ['pr-modes', 'pr-abs-link', 'pr-pdf-link'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.hidden = true;
        });

        const page = document.getElementById('pr-page');
        if (page) page.innerHTML = '<p class="pr-loading">Loading...</p>';

        document.querySelectorAll('.paper-reader .pr-pane').forEach(pane => {
            pane.classList.toggle('active', pane.dataset.mode === 'read');
        });

        reader.classList.add('open');
        document.body.classList.add('reader-open');
    }

    /* Appele par le routeur sur #paper:ID et #read:shelf/slug, y compris a
       froid : l'index est charge avant l'ouverture. */
    async function openFromHash(id) {
        openPlaceholder();
        bindOnce();
        await load();
        render();

        /* Un identifiant qui ne correspond a rien, lien perime ou faute de
           frappe : on referme sur le rayonnage plutot que sur un cadre vide. */
        if (state.works.has(id)) open(id);
        else close();
    }

    function focusFilter(term) {
        const input = document.getElementById('papers-filter');
        if (!input) return;
        input.value = term;
        state.query = term;
        render();
    }

    return { init, open, openFromHash, close, focusFilter };
})();

function initPapers() {
    PAPERS.init();
}

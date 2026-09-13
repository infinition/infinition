/* =========================================================
   LIBRARY

   Bibliotheque des publications arXiv. Source de verite :
   data/papers.json, produit une fois par jour par
   .github/workflows/site-data.yml via scripts/build-papers.mjs.
   arXiv repond 429 des qu une adresse tape trop vite, la page ne
   l appelle donc jamais elle meme.
   ========================================================= */

const PAPERS = (() => {
    const DATA_URL = 'data/papers.json';

    /* Une couleur par grande famille arXiv, prise dans la palette du site.
       L ordre compte : un papier classe cs.LG et cs.CR sort en orange, la
       securite etant ce qui le distingue du reste de la bibliotheque.
       Tout ce qui n est pas liste retombe sur le vert. */
    const CATEGORY_ACCENT = [
        ['cs.CR', 'orange'],
        ['quant-ph', 'green'],
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
        papers: [],
        meta: null,
        loaded: false,
        sort: 'date',
        query: '',
        current: null,
        mode: 'read'
    };

    /* Aucun navigateur mobile n affiche un PDF dans une iframe : Safari iOS
       fige la premiere page sans defilement, Chrome Android propose un
       telechargement. Sur ces appareils la liseuse reste sur le resume et
       renvoie vers le PDF, plutot que de servir un cadre inutilisable. */
    const canEmbedPdf = () => !window.matchMedia('(pointer: coarse)').matches;

    const esc = s => String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const catsOf = paper => [paper.primary_category, ...(paper.categories || [])].filter(Boolean);

    const matchOf = paper => {
        const cats = catsOf(paper);
        return CATEGORY_ACCENT.find(([cat]) => cats.includes(cat));
    };

    const accentOf = paper => {
        const hit = matchOf(paper);
        return hit ? hit[1] : 'green';
    };

    /* La couverture affiche la categorie qui a donne la couleur, pour que la
       pastille et la tranche racontent la meme chose. */
    const labelOf = paper => {
        const hit = matchOf(paper);
        return (hit && hit[0]) || catsOf(paper)[0] || 'preprint';
    };

    /* Le champ comment d arXiv commence presque toujours par "10 pages, 2
       figures". On en tire une pagination, comme sur une fiche de catalogue. */
    function pagesOf(paper) {
        const m = String(paper.comment || '').match(/(\d+)\s*pages?/i);
        return m ? `${m[1]} p` : '';
    }

    function formatDate(iso) {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
    }

    function refOf(paper) {
        if (paper.status === 'pending') return 'preprint // no id yet';
        return `arXiv ${paper.id}${paper.version || ''}`;
    }

    function authorsOf(paper) {
        const list = paper.authors || [];
        if (list.length === 0) return (state.meta && state.meta.author) || '';
        if (list.length <= 3) return list.join(', ');
        return `${list[0]} et al.`;
    }

    /* --- RENDU DU RAYONNAGE --- */

    function bookHtml(paper, index) {
        const accent = accentOf(paper);
        const rgb = ACCENT_RGB[accent];
        const cat = labelOf(paper);

        return `
            <button class="book${paper.status === 'pending' ? ' is-pending' : ''}"
                    style="--accent: var(--neon-${accent}); --accent-soft: rgba(${rgb}, .3); animation-delay: ${Math.min(index * 35, 420)}ms"
                    data-id="${esc(paper.id)}"
                    aria-label="${esc(paper.title)}">
                <span class="book-3d">
                    <span class="book-spine"></span>
                    <span class="book-cover">
                        <span class="book-cat">${esc(cat)}</span>
                        <span class="book-title">${esc(paper.title)}</span>
                        <span class="book-foot">
                            <span class="book-author">${esc(authorsOf(paper))}</span>
                            <span class="book-ref">${esc(refOf(paper))}</span>
                        </span>
                    </span>
                </span>
                <span class="book-plank"></span>
                <span class="book-meta">
                    <span>${esc(formatDate(paper.published))}</span>
                    <span>${esc(pagesOf(paper))}</span>
                </span>
            </button>`;
    }

    function visiblePapers() {
        const q = state.query.trim().toLowerCase();
        let list = state.papers.slice();

        if (q) {
            list = list.filter(p => [
                p.title,
                p.abstract,
                p.id,
                (p.categories || []).join(' '),
                (p.authors || []).join(' ')
            ].join(' ').toLowerCase().includes(q));
        }

        if (state.sort === 'title') {
            list.sort((a, b) => a.title.localeCompare(b.title));
        } else {
            list.sort((a, b) => new Date(b.published || 0) - new Date(a.published || 0));
        }
        return list;
    }

    function render() {
        const shelf = document.getElementById('papers-shelf');
        const status = document.getElementById('papers-status');
        if (!shelf) return;

        const list = visiblePapers();

        if (list.length === 0) {
            shelf.innerHTML = `<div class="papers-empty">&gt; NO MATCH IN THE ARCHIVE</div>`;
        } else {
            shelf.innerHTML = list.map(bookHtml).join('');
        }

        const total = document.getElementById('papers-count');
        if (total) total.textContent = state.papers.length;

        if (status && state.meta) {
            const stamp = formatDate(state.meta.generated_at);
            status.innerHTML = `&gt; ARCHIVE SYNCED <span class="ok">${esc(stamp)}</span> // SOURCE arXiv`;
        }
    }

    /* --- LISEUSE --- */

    function open(id) {
        const paper = state.papers.find(p => p.id === id);
        const reader = document.getElementById('paper-reader');
        if (!paper || !reader) return;

        state.current = paper;
        const accent = accentOf(paper);
        reader.style.setProperty('--accent', `var(--neon-${accent})`);
        reader.style.setProperty('--accent-rgb', ACCENT_RGB[accent]);

        const heading = document.getElementById('pr-title');
        if (heading) heading.textContent = paper.title;
        const ref = document.getElementById('pr-ref');
        if (ref) ref.textContent = refOf(paper);

        const absLink = document.getElementById('pr-abs-link');
        if (absLink) absLink.href = paper.abs_url;
        const pdfLink = document.getElementById('pr-pdf-link');
        if (pdfLink) {
            pdfLink.href = paper.pdf_url || paper.abs_url;
            pdfLink.hidden = !paper.pdf_url;
        }

        renderPage(paper);

        /* Sans PDF embarquable il n y a qu un mode, le selecteur disparait. */
        const canEmbed = Boolean(paper.pdf_url) && canEmbedPdf();
        const modes = document.getElementById('pr-modes');
        if (modes) modes.hidden = !canEmbed;

        setMode(canEmbed ? 'pdf' : 'read');

        reader.classList.add('open');
        document.body.classList.add('reader-open');
        const close = document.getElementById('pr-close');
        if (close) close.focus();

        if (window.location.hash !== `#paper:${paper.id}`) {
            history.pushState(null, null, `#paper:${paper.id}`);
        }
    }

    function renderPage(paper) {
        const host = document.getElementById('pr-page');
        if (!host) return;

        const facts = [
            formatDate(paper.published),
            ...(paper.categories || []),
            paper.journal_ref,
            paper.doi ? `doi ${paper.doi}` : ''
        ].filter(Boolean);

        const pending = paper.status === 'pending';

        host.innerHTML = `
            <h1>${esc(paper.title)}</h1>
            <div class="pr-authors">${esc((paper.authors || []).join(', '))}</div>
            <div class="pr-facts">${facts.map(f => `<span class="pr-fact">${esc(f)}</span>`).join('')}</div>
            <div class="pr-label">Abstract</div>
            <div class="pr-abstract">${esc(paper.abstract)}</div>
            ${paper.comment ? `<div class="pr-note">${esc(paper.comment)}</div>` : ''}
            ${pending
                ? `<div class="pr-note">Preprint without a public arXiv identifier yet. The full text will appear here as soon as it is announced.</div>`
                : ''}
            <div class="pr-ctas">
                <a class="pr-cta" href="${esc(paper.pdf_url || paper.abs_url)}" target="_blank" rel="noopener noreferrer">
                    <i class="fas fa-${pending ? 'search' : 'file-pdf'}"></i>
                    ${pending ? 'See on arXiv' : 'Open the PDF'}
                </a>
                ${pending ? '' : `
                <a class="pr-cta is-ghost" href="${esc(paper.abs_url)}" target="_blank" rel="noopener noreferrer">
                    <i class="fas fa-external-link-alt"></i> arXiv page
                </a>`}
            </div>`;
    }

    function setMode(mode) {
        const paper = state.current;
        if (!paper) return;
        if (mode === 'pdf' && (!paper.pdf_url || !canEmbedPdf())) mode = 'read';
        state.mode = mode;

        document.querySelectorAll('.paper-reader .pr-mode').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        document.querySelectorAll('.paper-reader .pr-pane').forEach(pane => {
            pane.classList.toggle('active', pane.dataset.mode === mode);
        });

        const pdfPane = document.getElementById('pr-pdf');
        const frame = document.getElementById('pr-frame');
        if (!pdfPane || !frame) return;

        if (mode === 'pdf') {
            if (frame.getAttribute('src') !== paper.pdf_url) frame.setAttribute('src', paper.pdf_url);
        } else {
            /* On vide l iframe en quittant le mode PDF : un document de
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

        if (window.location.hash.startsWith('#paper:')) {
            history.pushState(null, null, '#papers');
        }
    }

    /* --- CHARGEMENT --- */

    /* navigateTo et openFromHash appellent init en parallele sur une URL
       #paper:ID, on memorise donc la promesse plutot que de lancer deux fetch. */
    let loading = null;

    function load() {
        if (state.loaded) return Promise.resolve();
        if (!loading) loading = fetchData().finally(() => { loading = null; });
        return loading;
    }

    async function fetchData() {
        const status = document.getElementById('papers-status');
        try {
            const res = await fetch(DATA_URL, { cache: 'no-cache' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            state.papers = Array.isArray(data.papers) ? data.papers : [];
            state.meta = data;
            state.loaded = true;
        } catch (e) {
            console.warn('papers.json unreachable', e);
            if (status) status.innerHTML = '&gt; ARCHIVE UNREACHABLE // RETRY LATER';
            return;
        }
        render();
    }

    function bindOnce() {
        if (bindOnce.done) return;
        bindOnce.done = true;

        const shelf = document.getElementById('papers-shelf');
        if (shelf) {
            shelf.addEventListener('click', e => {
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

    /* Appele par le routeur quand l URL porte #paper:ID, y compris a froid. */
    async function openFromHash(id) {
        await init();
        open(id);
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

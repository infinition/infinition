/* =========================================================
   REPOS GRID
   Affiche les repos publics en icones facon springboard iOS.

   Source de verite : data/repos.json, produit une fois par jour
   par .github/workflows/repos.yml via scripts/build-repos.mjs.
   Le navigateur ne tape donc jamais l'API GitHub en temps normal.
   Si le JSON manque, on retombe sur l'API en mode degrade.
   ========================================================= */

const REPOS = (() => {
    const DATA_URL = 'data/repos.json';
    const SUMMARY_URL = 'data/repos-summary.json';
    const GH_USER = 'infinition';

    const state = {
        repos: [],
        sort: 'stars',
        dir: { stars: -1, name: 1, date: -1 },
        filter: '',
        loaded: false,
        loading: null
    };

    let grid, statusEl, card, backdrop, wired = false;
    let openId = null, hoverTimer = null, leaveTimer = null;

    const canHover = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    /* Palette de secours, deterministe : un repo garde toujours sa couleur. */
    const PALETTE = [
        ['#FF6B00', '#7a2f00'], ['#13aff0', '#053b52'], ['#bd00ff', '#3d0052'],
        ['#0aff47', '#04521a'], ['#ff003c', '#520013'], ['#f5c518', '#4a3a00']
    ];

    function hueFor(name) {
        let h = 0;
        for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
        return PALETTE[h % PALETTE.length];
    }

    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    const fmtStars = n => n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'k' : String(n || 0);

    function fmtDate(d) {
        const x = new Date(d);
        return isNaN(x.getTime()) ? '' : x.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    /* ---------- chargement ---------- */
    /* Le snapshot n'est lu qu'une fois par session : la grille et le badge du
       portail partagent la meme promesse. */
    let payloadPromise = null;

    function fetchPayload() {
        if (payloadPromise) return payloadPromise;
        payloadPromise = (async () => {
            try {
                const res = await fetch(DATA_URL, { cache: 'no-cache' });
                if (res.ok) {
                    const data = await res.json();
                    if (data && Array.isArray(data.repos) && data.repos.length) return data;
                }
            } catch (e) {
                console.warn('repos.json unreachable, falling back to the API', e);
            }
            return fetchLive();
        })();
        return payloadPromise;
    }

    function totalStarsOf(data) {
        if (!data) return null;
        if (data.total_stars != null) return data.total_stars;
        return (data.repos || []).filter(r => !r.missing).reduce((sum, r) => sum + (r.stars || 0), 0);
    }

    /* Badge du portail : le chiffre etait ecrit en dur, il suit maintenant le
       snapshot. On lit le resume, quelques octets, pas tout le fichier. */
    async function updateStarBadge() {
        const el = document.getElementById('portal-stars-badge');
        if (!el) return;

        let total = null, count = null;
        try {
            const res = await fetch(SUMMARY_URL, { cache: 'no-cache' });
            if (res.ok) {
                const s = await res.json();
                total = s.total_stars;
                count = s.count;
            }
        } catch (e) { /* on tentera le snapshot complet */ }

        if (total == null) {
            const data = await fetchPayload();
            total = totalStarsOf(data);
            count = data && data.repos ? data.repos.filter(r => !r.missing).length : null;
        }

        /* Rien de fiable : on garde la valeur ecrite dans le HTML. */
        if (!total || total <= 0) return;

        /* applyConfig peut rejouer le rendu des badges apres nous, on met donc
           aussi la config a jour pour que le chiffre survive. */
        if (typeof CONFIG !== 'undefined' && CONFIG.social && CONFIG.social.stats) {
            CONFIG.social.stats.githubStars = fmtStars(total);
        }

        el.textContent = fmtStars(total);
        const badge = el.closest('.cyber-badge');
        if (badge) {
            badge.title = count
                ? `${total.toLocaleString('en-US')} stars across ${count} public repositories`
                : `${total.toLocaleString('en-US')} stars`;
        }
    }

    async function load() {
        if (state.loaded) { render(); return; }
        if (state.loading) return state.loading;

        state.loading = (async () => {
            renderSkeleton(18);
            const data = await fetchPayload();

            if (!data) {
                grid.innerHTML = '';
                setStatus('&gt; <span style="color:var(--neon-red)">NO DATA</span> // repos unavailable');
                state.loading = null;
                return;
            }

            /* Un repo marque missing par le builder est en periode de grace, hors grille. */
            state.repos = data.repos.filter(r => r && r.name && !r.missing);
            state.loaded = true;

            animateCount(document.getElementById('repos-star-total'), totalStarsOf(data) || 0);
            const sub = document.getElementById('repos-sub');
            if (sub) sub.textContent = `${state.repos.length} public repositories // github.com/${GH_USER}`;

            render();

            setStatus(data.degraded
                ? '&gt; <span style="color:var(--neon-orange)">DEGRADED MODE</span> // live API fallback, no README covers'
                : `&gt; <span class="ok">READY</span> // ${state.repos.length} repos // snapshot ${esc(fmtDate(data.generated_at)) || 'unknown'}`);

            state.loading = null;
        })();

        return state.loading;
    }

    /* Filet de secours : l'API publique, sans les couvertures de README. */
    async function fetchLive() {
        try {
            const r = await fetch(`https://api.github.com/users/${GH_USER}/repos?per_page=100&sort=updated`);
            if (!r.ok) throw new Error('HTTP ' + r.status);
            const raw = await r.json();
            return {
                generated_at: new Date().toISOString(),
                degraded: true,
                repos: raw.map(x => ({
                    id: x.id, name: x.name, url: x.html_url,
                    site: x.homepage || (x.has_pages ? `https://${GH_USER}.github.io/${x.name}/` : null),
                    description: x.description || '', stars: x.stargazers_count,
                    forks_count: x.forks_count, language: x.language, topics: x.topics || [],
                    created_at: x.created_at, pushed_at: x.pushed_at, image: null,
                    is_fork: x.fork, is_archived: x.archived
                }))
            };
        } catch (e) {
            console.warn('GitHub API fallback failed', e);
            return null;
        }
    }

    /* Le total doit toujours finir affiche, meme si l'onglet est en arriere plan
       et que requestAnimationFrame est gele : d'ou le garde fou en setTimeout. */
    function animateCount(el, target) {
        if (!el) return;
        const final = Math.round(target).toLocaleString('en-US');
        if (document.hidden) { el.textContent = final; return; }

        const dur = 900, t0 = performance.now();
        let raf = null;
        const guard = setTimeout(() => {
            if (raf) cancelAnimationFrame(raf);
            el.textContent = final;
        }, dur + 400);

        const step = t => {
            const p = Math.min((t - t0) / dur, 1);
            if (p >= 1) {
                clearTimeout(guard);
                el.textContent = final;
                return;
            }
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.round(target * eased).toLocaleString('en-US');
            raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
    }

    function setStatus(html) {
        if (statusEl) statusEl.innerHTML = html;
    }

    /* ---------- rendu ---------- */
    function fallbackIcon(name, cls) {
        const [c1, c2] = hueFor(name);
        const letters = esc(name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() || '??');
        return `<div class="${cls} fallback" style="background:linear-gradient(145deg, ${c1}, ${c2});">${letters}</div>`;
    }

    function iconHTML(repo, cls) {
        if (!repo.image) return fallbackIcon(repo.name, cls);
        const src = esc(repo.image), alt = esc(repo.name);
        return `<div class="${cls}">
                    <img class="ic-bg" src="${src}" alt="" aria-hidden="true">
                    <img class="ic-fg" src="${src}" alt="${alt}" loading="lazy"
                         onerror="REPOS.iconFailed(this, '${alt}', '${cls}')">
                </div>`;
    }

    /* Une image supprimee cote GitHub ne casse jamais la grille. */
    function iconFailed(img, name, cls) {
        const host = img.parentElement;
        if (host) host.outerHTML = fallbackIcon(name, cls);
    }

    function sorted() {
        const f = state.filter;
        const list = state.repos.filter(r => !f
            || r.name.toLowerCase().includes(f)
            || (r.description || '').toLowerCase().includes(f)
            || (r.language || '').toLowerCase().includes(f)
            || (r.topics || []).some(t => t.toLowerCase().includes(f)));

        const d = state.dir[state.sort];
        const flip = d < 0 ? 1 : -1;
        return list.sort((a, b) => {
            if (state.sort === 'name') return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }) * d;
            if (state.sort === 'date') return (new Date(b.created_at) - new Date(a.created_at)) * flip;
            if (b.stars !== a.stars) return (b.stars - a.stars) * flip;
            return a.name.localeCompare(b.name);
        });
    }

    function render() {
        if (!grid) return;
        const list = sorted();

        if (!list.length) {
            grid.innerHTML = '<div class="repos-empty">NO MATCH</div>';
            return;
        }

        grid.innerHTML = list.map((r, i) => {
            const year = new Date(r.created_at).getFullYear();
            return `
            <button class="repo-app" type="button" data-id="${esc(r.id)}"
                    style="animation-delay:${Math.min(i * 12, 400)}ms" aria-label="${esc(r.name)}">
                <div class="badge-slot">
                    ${iconHTML(r, 'app-icon')}
                    ${r.stars > 0 ? `<span class="star-badge"><i class="fas fa-star"></i>${fmtStars(r.stars)}</span>` : ''}
                    ${r.site ? '<span class="site-dot" title="Live site"><i class="fas fa-link"></i></span>' : ''}
                </div>
                <div class="app-label">${esc(r.name)}</div>
                <div class="app-meta">${isNaN(year) ? '' : year}${r.language ? ' // ' + esc(r.language) : ''}</div>
            </button>`;
        }).join('');
    }

    function renderSkeleton(n) {
        if (!grid) return;
        grid.innerHTML = Array.from({ length: n }, () => `
            <div class="repo-app">
                <div class="app-icon skeleton"></div>
                <div class="skeleton skeleton-text" style="height:10px;width:70%;"></div>
            </div>`).join('');
    }

    /* ---------- card ---------- */
    const repoById = id => state.repos.find(r => String(r.id) === String(id));

    function cardHTML(r) {
        const tags = [];
        if (r.language) tags.push(`<span class="rc-tag lang">${esc(r.language)}</span>`);
        (r.topics || []).slice(0, 3).forEach(t => tags.push(`<span class="rc-tag">#${esc(t)}</span>`));
        if (r.is_archived) tags.push('<span class="rc-tag archived">archived</span>');
        if (r.is_fork) tags.push('<span class="rc-tag fork">fork</span>');

        return `
            <div class="rc-handle"></div>
            <div class="rc-top">
                ${iconHTML(r, 'card-icon')}
                <div class="rc-title">
                    <h3>${esc(r.name)}</h3>
                    <div class="rc-tags">${tags.join('')}</div>
                </div>
            </div>
            <p class="rc-desc${r.description ? '' : ' empty'}">${esc(r.description) || 'No description provided.'}</p>
            <div class="rc-stats">
                <span class="st-star"><i class="fas fa-star"></i>${(r.stars || 0).toLocaleString('en-US')}</span>
                <span class="st-fork"><i class="fas fa-code-branch"></i>${r.forks_count || 0}</span>
                <span><i class="fas fa-rotate"></i>${fmtDate(r.pushed_at)}</span>
            </div>
            <div class="rc-actions">
                <a class="rc-btn" href="${esc(r.url)}" target="_blank" rel="noopener">
                    <i class="fab fa-github"></i> Code
                </a>
                ${r.site ? `<a class="rc-btn primary" href="${esc(r.site)}" target="_blank" rel="noopener">
                    <i class="fas fa-arrow-up-right-from-square"></i> Live site</a>` : ''}
            </div>`;
    }

    function openCard(repo, anchor) {
        openId = String(repo.id);
        card.innerHTML = cardHTML(repo);
        grid.querySelectorAll('.repo-app.is-active').forEach(e => e.classList.remove('is-active'));
        anchor.classList.add('is-active');

        if (canHover()) {
            card.classList.add('open');
            position(anchor);
        } else {
            backdrop.classList.add('open');
            card.classList.add('open');
            document.body.classList.add('repos-sheet-open');
        }
    }

    function position(anchor) {
        const r = anchor.getBoundingClientRect();
        const w = card.offsetWidth, h = card.offsetHeight;
        let left = r.left + r.width / 2 - w / 2;
        left = Math.max(12, Math.min(left, window.innerWidth - w - 12));
        let top = r.bottom + 14;
        if (top + h > window.innerHeight - 12) top = r.top - h - 14;
        if (top < 12) top = Math.max(12, window.innerHeight - h - 12);
        card.style.left = left + 'px';
        card.style.top = top + 'px';
    }

    function closeCard() {
        openId = null;
        if (card) card.classList.remove('open');
        if (backdrop) backdrop.classList.remove('open');
        document.body.classList.remove('repos-sheet-open');
        if (grid) grid.querySelectorAll('.repo-app.is-active').forEach(e => e.classList.remove('is-active'));
    }

    /* ---------- init ---------- */
    function wire() {
        if (wired) return;
        wired = true;

        /* PC : survol temporise, la card survit au passage de la souris dessus. */
        grid.addEventListener('mouseover', e => {
            if (!canHover()) return;
            const app = e.target.closest('.repo-app');
            if (!app || !app.dataset.id) return;
            clearTimeout(leaveTimer);
            if (String(openId) === app.dataset.id) return;
            clearTimeout(hoverTimer);
            hoverTimer = setTimeout(() => {
                const repo = repoById(app.dataset.id);
                if (repo) openCard(repo, app);
            }, 110);
        });

        grid.addEventListener('mouseout', e => {
            if (!canHover()) return;
            if (!e.target.closest('.repo-app')) return;
            clearTimeout(hoverTimer);
            leaveTimer = setTimeout(closeCard, 220);
        });

        card.addEventListener('mouseenter', () => clearTimeout(leaveTimer));
        card.addEventListener('mouseleave', () => { if (canHover()) leaveTimer = setTimeout(closeCard, 180); });

        /* Sur PC (avec survol disponible) : un clic gauche ouvre directement le depot GitHub.
           Sur mobile (tactile sans survol) : le premier tap ouvre la card de previsualisation. */
        grid.addEventListener('click', e => {
            const app = e.target.closest('.repo-app');
            if (!app || !app.dataset.id) return;
            const repo = repoById(app.dataset.id);
            if (!repo) return;
            clearTimeout(hoverTimer);
            clearTimeout(leaveTimer);

            if (canHover()) {
                if (repo.url) {
                    closeCard();
                    window.open(repo.url, '_blank', 'noopener,noreferrer');
                }
            } else {
                if (String(openId) === app.dataset.id) closeCard();
                else openCard(repo, app);
            }
        });

        backdrop.addEventListener('click', closeCard);
        window.addEventListener('keydown', e => { if (e.key === 'Escape') closeCard(); });

        /* Sur PC la card est ancree a l'icone, donc scroll et resize la ferment.
           Sur mobile la feuille est ancree en bas, elle reste ouverte. */
        window.addEventListener('scroll', () => { if (openId && canHover()) closeCard(); }, { passive: true });
        window.addEventListener('resize', () => { if (canHover()) closeCard(); });

        document.getElementById('repos-sort-group').addEventListener('click', e => {
            const btn = e.target.closest('.sort-btn');
            if (!btn) return;
            const key = btn.dataset.sort;
            if (state.sort === key) state.dir[key] *= -1;
            state.sort = key;
            document.querySelectorAll('#repos-sort-group .sort-btn').forEach(b => b.classList.toggle('active', b === btn));
            btn.querySelector('.dir').innerHTML = state.dir[key] < 0 ? '&#9660;' : '&#9650;';
            closeCard();
            render();
        });

        document.getElementById('repos-filter').addEventListener('input', e => {
            state.filter = e.target.value.trim().toLowerCase();
            closeCard();
            render();
        });
    }

    function init() {
        grid = document.getElementById('repos-grid');
        statusEl = document.getElementById('repos-status');
        card = document.getElementById('repo-card');
        backdrop = document.getElementById('repos-card-backdrop');
        if (!grid || !card || !backdrop) return;

        wire();
        closeCard();
        load();
    }

    /* Le terminal peut demander la grille deja filtree : repos bjorn */
    function focusFilter(term) {
        const input = document.getElementById('repos-filter');
        if (!input) return;
        input.value = term || '';
        state.filter = (term || '').trim().toLowerCase();
        render();
    }

    return { init, iconFailed, focusFilter, updateStarBadge, state };
})();

function initRepos() {
    REPOS.init();
}

/* Le badge stars du portail se met a jour des le chargement, sans attendre
   que le visiteur ouvre la grille. On passe par load et non DOMContentLoaded :
   index.html rejoue applyConfig en fin de page et ecraserait la valeur. */
window.addEventListener('load', () => REPOS.updateStarBadge());

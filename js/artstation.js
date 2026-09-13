/* =========================================================
   GALLERY

   Portfolio ArtStation. Source de verite : data/artstation.json,
   produit une fois par jour par .github/workflows/site-data.yml.
   Les endpoints .json d ArtStation repondent 403 a un navigateur,
   la page ne les appelle donc jamais elle meme.
   ========================================================= */

const ARTSTATION = (() => {
    const DATA_URL = 'data/artstation.json';

    const state = {
        artworks: [],
        profile: null,
        meta: null,
        loaded: false,
        current: null,
        shot: 0
    };

    const esc = s => String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    /* Meme format que les badges du portail : 1439 donne 1.4k */
    const fmtCount = n => {
        const v = Number(n) || 0;
        return v >= 1000 ? `${(v / 1000).toFixed(1).replace('.0', '')}k` : String(v);
    };

    function formatDate(iso) {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
    }

    /* --- RENDU --- */

    function renderHead() {
        const p = state.profile;
        if (!p) return;

        const avatar = document.getElementById('art-avatar');
        if (avatar && p.avatar_url) {
            avatar.src = p.avatar_url;
            avatar.alt = p.full_name || p.username;
        }

        const name = document.getElementById('art-name');
        if (name) name.textContent = (p.full_name || p.username || 'GALLERY').toUpperCase();

        const headline = document.getElementById('art-headline');
        if (headline) headline.textContent = p.headline || '';

        const location = document.getElementById('art-location');
        if (location) location.textContent = p.location || '';

        const link = document.getElementById('art-profile-link');
        if (link) link.href = p.profile_url || `https://www.artstation.com/${state.meta.username}`;

        const totals = (state.meta && state.meta.totals) || {};
        const put = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };
        put('art-count-works', fmtCount(totals.artworks));
        put('art-count-likes', fmtCount(totals.likes));
        put('art-count-views', fmtCount(totals.views));
        put('art-count-followers', fmtCount(totals.followers));

        /* Sans instantane du collecteur il n y a ni vue ni like : plutot que
           d afficher des zeros on retire les compteurs concernes. */
        document.querySelectorAll('#art-view .art-stat[data-metric]').forEach(el => {
            const key = el.dataset.metric;
            el.hidden = !(Number(totals[key]) > 0);
        });

        /* Le lien vers le profil reste toujours la, seul son compteur
           disparait quand la source ne le porte pas. */
        const followers = Number(totals.followers) > 0;
        const followersCount = document.getElementById('art-count-followers');
        if (followersCount) followersCount.hidden = !followers;
        const followersLabel = document.getElementById('art-followers-label');
        if (followersLabel) {
            followersLabel.textContent = followers ? 'followers on artstation' : 'view on artstation';
        }
    }

    function cardHtml(art, index) {
        const shots = (art.images || []).length;
        /* Une creation arrivee par le flux RSS n a pas encore de compteur.
           Afficher zero like et zero vue serait faux, on ne montre rien. */
        const counted = (art.likes_count || 0) + (art.views_count || 0) > 0;
        return `
            <button class="art-card" data-id="${esc(art.id)}"
                    style="animation-delay: ${Math.min(index * 30, 400)}ms"
                    aria-label="${esc(art.title)}">
                <img src="${esc(art.cover_url)}" alt="${esc(art.title)}"
                     loading="lazy" decoding="async"
                     onload="this.classList.add('ready')"
                     onerror="this.closest('.art-card').remove()">
                ${shots > 1 ? `<span class="art-shots"><i class="fas fa-layer-group"></i>${shots}</span>` : ''}
                <span class="art-veil">
                    <span class="art-title">${esc(art.title)}</span>
                    ${counted ? `
                    <span class="art-metrics">
                        <span><i class="fas fa-heart"></i>${fmtCount(art.likes_count)}</span>
                        <span><i class="fas fa-eye"></i>${fmtCount(art.views_count)}</span>
                    </span>` : ''}
                </span>
            </button>`;
    }

    function render() {
        const grid = document.getElementById('art-grid');
        if (!grid) return;

        grid.innerHTML = state.artworks.map(cardHtml).join('');

        const status = document.getElementById('art-status');
        if (status && state.meta) {
            const stamp = formatDate(state.meta.generated_at);
            status.innerHTML = `&gt; GALLERY SYNCED <span class="ok">${esc(stamp)}</span> // SOURCE ArtStation`;
        }
    }

    /* --- VISIONNEUSE --- */

    function shotsOf(art) {
        const list = (art.images || []).map(i => i.url).filter(Boolean);
        if (list.length > 0) return list;
        return [art.image_url || art.cover_url].filter(Boolean);
    }

    function open(id) {
        const art = state.artworks.find(a => a.id === id);
        const viewer = document.getElementById('art-viewer');
        if (!art || !viewer) return;

        state.current = art;
        state.shot = 0;

        const title = document.getElementById('av-title');
        if (title) title.textContent = art.title;

        const meta = document.getElementById('av-meta');
        if (meta) {
            const bits = [formatDate(art.published_at)];
            if (art.likes_count) bits.push(`${fmtCount(art.likes_count)} likes`);
            if (art.views_count) bits.push(`${fmtCount(art.views_count)} views`);
            meta.textContent = bits.filter(Boolean).join(' // ');
        }

        const link = document.getElementById('av-link');
        if (link) link.href = art.url;

        const desc = document.getElementById('av-desc');
        if (desc) {
            desc.textContent = art.description || '';
            desc.hidden = !art.description;
        }

        const chips = document.getElementById('av-chips');
        if (chips) {
            const software = (art.software || []).map(s =>
                `<span class="av-chip is-soft">${esc(s)}</span>`);
            const tags = (art.tags || []).slice(0, 8).map(t =>
                `<span class="av-chip">#${esc(t)}</span>`);
            chips.innerHTML = [...software, ...tags].join('');
        }

        showShot(0);

        viewer.classList.add('open');
        document.body.classList.add('viewer-open');
        const close = document.getElementById('av-close');
        if (close) close.focus();

        if (window.location.hash !== `#art:${art.id}`) {
            history.pushState(null, null, `#art:${art.id}`);
        }
    }

    function showShot(index) {
        const art = state.current;
        if (!art) return;

        const shots = shotsOf(art);
        if (shots.length === 0) return;

        state.shot = (index + shots.length) % shots.length;

        const img = document.getElementById('av-image');
        if (img) {
            img.src = shots[state.shot];
            img.alt = art.title;
        }

        const counter = document.getElementById('av-counter');
        if (counter) {
            counter.hidden = shots.length < 2;
            counter.textContent = `${state.shot + 1} / ${shots.length}`;
        }

        ['av-prev', 'av-next'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.hidden = shots.length < 2;
        });
    }

    function step(delta) {
        showShot(state.shot + delta);
    }

    function close() {
        const viewer = document.getElementById('art-viewer');
        if (!viewer) return;
        viewer.classList.remove('open');
        document.body.classList.remove('viewer-open');

        const img = document.getElementById('av-image');
        if (img) img.removeAttribute('src');
        state.current = null;

        if (window.location.hash.startsWith('#art:')) {
            history.pushState(null, null, '#art');
        }
    }

    /* --- CHARGEMENT --- */

    /* navigateTo et openFromHash appellent init en parallele sur une URL
       #art:ID, on memorise donc la promesse plutot que de lancer deux fetch. */
    let loading = null;

    function load() {
        if (state.loaded) return Promise.resolve();
        if (!loading) loading = fetchData().finally(() => { loading = null; });
        return loading;
    }

    async function fetchData() {
        const status = document.getElementById('art-status');
        try {
            const res = await fetch(DATA_URL, { cache: 'no-cache' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            state.artworks = Array.isArray(data.artworks) ? data.artworks : [];
            state.profile = data.profile || null;
            state.meta = data;
            state.loaded = true;
        } catch (e) {
            console.warn('artstation.json unreachable', e);
            if (status) status.innerHTML = '&gt; GALLERY UNREACHABLE // RETRY LATER';
            return;
        }

        renderHead();
        render();
    }

    function bindOnce() {
        if (bindOnce.done) return;
        bindOnce.done = true;

        const grid = document.getElementById('art-grid');
        if (grid) {
            grid.addEventListener('click', e => {
                const card = e.target.closest('.art-card');
                if (card) open(card.dataset.id);
            });
        }

        const closeBtn = document.getElementById('av-close');
        if (closeBtn) closeBtn.addEventListener('click', close);

        const prev = document.getElementById('av-prev');
        if (prev) prev.addEventListener('click', () => step(-1));

        const next = document.getElementById('av-next');
        if (next) next.addEventListener('click', () => step(1));

        document.addEventListener('keydown', e => {
            const viewer = document.getElementById('art-viewer');
            if (!viewer || !viewer.classList.contains('open')) return;
            if (e.key === 'Escape') close();
            else if (e.key === 'ArrowLeft') step(-1);
            else if (e.key === 'ArrowRight') step(1);
        });

        /* Balayage horizontal dans la visionneuse, pour passer d une image a
           l autre au doigt sans viser les fleches. */
        const stage = document.getElementById('av-stage');
        if (stage) {
            let startX = null;
            stage.addEventListener('touchstart', e => {
                startX = e.touches[0].clientX;
            }, { passive: true });
            stage.addEventListener('touchend', e => {
                if (startX === null) return;
                const dx = e.changedTouches[0].clientX - startX;
                if (Math.abs(dx) > 55) step(dx < 0 ? 1 : -1);
                startX = null;
            }, { passive: true });
        }
    }

    async function init() {
        bindOnce();
        await load();
    }

    /* Appele par le routeur quand l URL porte #art:ID, y compris a froid. */
    async function openFromHash(id) {
        await init();
        open(id);
    }

    return { init, open, openFromHash, close };
})();

function initArtStation() {
    ARTSTATION.init();
}

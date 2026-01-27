async function fetchBandsList() {
    try {
        const r = await fetch(BANDS_FILE_URL);
        if (!r.ok) return [];
        const t = await r.text();
        return t.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    } catch (e) { return []; }
}

async function fetchMusicData() {
    const container = document.getElementById('music-grid');

    // USE CACHE IF AVAILABLE
    if (cachedBandsHTML) {
        container.innerHTML = cachedBandsHTML;
        return;
    }

    container.innerHTML = '';
    const bands = await fetchBandsList();

    if (bands.length === 0) {
        container.innerHTML = '<div style="color:#888;">No bands found in bands/bands.md</div>';
        return;
    }

    for (const band of bands) {
        try {
            const searchUrl = `https://corsproxy.io/?url=` + encodeURIComponent(`https://itunes.apple.com/search?term=${band}&entity=album&limit=5`);
            const res = await fetch(searchUrl);
            const data = await res.json();

            if (data.results && data.results.length > 0) {
                let bestMatch = data.results.find(album =>
                    album.artistName.toLowerCase().includes(band.toLowerCase())
                );
                const album = bestMatch || data.results[0];
                const image = album.artworkUrl100
                    ? album.artworkUrl100.replace('100x100bb', '600x600bb')
                    : 'assets/placeholder-artist.png';

                const card = document.createElement('div');
                card.className = 'music-card';
                card.onclick = () => window.open(album.artistViewUrl || album.collectionViewUrl, '_blank');
                card.innerHTML = `
                    <img src="${image}" class="album-cover" alt="${band}">
                    <div class="music-info">
                        <span class="band-name">${band}</span>
                    </div>`;

                container.appendChild(card);
            }
        } catch (e) {
            console.warn(`Could not fetch music for ${band}`, e);
        }
    }
    // SAVE TO CACHE
    cachedBandsHTML = container.innerHTML;
}

async function fetchLocalDataLogs() {
    const arts = await fetchAllMDRecursively(ARTICLES_PATH);
    const kbs = await fetchAllMDRecursively(KB_PATH);
    const all = [...arts, ...kbs];
    return Promise.all(all.map(async f => {
        const r = await fetch(f.download_url); const t = await r.text();
        const title = (t.match(/^# (.*)/m) || [])[1] || f.name.replace('.md', '');
        let date = await fetchCommitDate(f.path);
        if (!date) date = (t.match(/(?:\*\*|__)?Date(?:\*\*|__)?:\s*(.*)/i) || [])[1]?.trim() || 'Unknown';

        // Extract first image
        const imgMatch = t.match(/!\[.*?\]\((.*?)\)|<img.*?src=["'](.*?)["']/);
        let image = null;
        if (imgMatch) {
            image = imgMatch[1] || imgMatch[2];
            // Handle relative paths if necessary (though usually they are absolute or relative to repo root)
            // For now assuming they work or are handled by the renderer, but for a raw URL we might need to fix it.
            // If it starts with ./, remove it. If it doesn't start with http, prepend raw github url.
            if (image && !image.startsWith('http')) {
                // Construct raw URL: https://raw.githubusercontent.com/infinition/infinition/main/ + path relative to root
                // But f.path is the file path. The image path is relative to the file or root?
                // Usually in this repo structure, images are likely relative.
                // Let's try to just return the raw string first, or maybe use the existing logic in utils.js if available.
                // Actually, let's look at how renderArticles handles it.
                // renderArticles uses: thumb = `<img src="${item.image}" ...>`
                // If it's a relative path like "assets/img.png", it needs the base URL.
                // The base URL for raw content is `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main/`
                // Let's prepend that if needed.
                if (image.startsWith('./')) image = image.substring(2);
                if (!image.startsWith('/')) image = '/' + image; // Ensure leading slash
                image = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main${image}`;
            }
        }

        return { id: f.sha, type: 'article', file: f.path, title: title, date: date, icon: f.path.startsWith('kb') ? 'fas fa-book-medical' : 'fas fa-file-alt', image: image, content: t, download_url: f.download_url };
    }));
}

async function fetchGitHubRepos() {
    try {
        const r = await fetch('https://api.github.com/users/infinition/repos?sort=created&direction=desc');
        if (!r.ok) return [];
        const d = await r.json();
        return Promise.all(d.map(async r => {
            let img = await fetchReadmeImage(r.owner.login, r.name, r.default_branch);
            if (!img) img = r.owner.avatar_url;
            return { id: r.id, type: 'repo', title: r.name, date: r.created_at, icon: 'fab fa-github', image: img, content: r.description || "", url: r.html_url };
        }));
    } catch (e) { return []; }
}

async function fetchArtStation() {
    try {
        const artUrl = CONFIG?.social?.artstation || 'https://www.artstation.com/infinition';
        let username = 'infinition';
        try {
            const u = new URL(artUrl);
            const parts = u.pathname.split('/').filter(Boolean);
            if (parts[0] === 'users' && parts[1]) username = parts[1];
            else if (parts[0]) username = parts[0];
        } catch (_) { /* fallback */ }

        const base = `https://www.artstation.com/users/${username}/projects.json?page=1`;
        const urls = [
            base,
            `https://corsproxy.io/?url=${encodeURIComponent(base)}`,
            `https://cors.isomorphic-git.org/${base}`
        ];

        let data = null;
        for (const url of urls) {
            const r = await fetch(url, { cache: 'no-store' });
            if (!r.ok) continue;
            const text = await r.text();
            try {
                data = JSON.parse(text);
                break;
            } catch {
                const start = text.indexOf('{');
                const end = text.lastIndexOf('}');
                if (start !== -1 && end !== -1) {
                    try {
                        data = JSON.parse(text.slice(start, end + 1));
                        break;
                    } catch { /* ignore */ }
                }
            }
        }

        if (!data) return [];
        const items = data.data || data.projects || [];
        if (!Array.isArray(items)) return [];

        return items.map(i => {
            const cover = i.cover || {};
            const image = cover.small_square_image_url || cover.micro_square_image_url || cover.small_image_url || cover.medium_image_url || cover.large_image_url || '';
            return {
                id: `art-${i.id}`,
                type: 'artwork',
                file: `art_${i.hash_id}.png`,
                title: i.title,
                date: i.published_at || i.created_at || '',
                icon: 'fab fa-artstation',
                image,
                content: i.description || i.short_description || '',
                url: i.permalink
            };
        });
    } catch (e) { return []; }
}

async function initKB() {
    const parent = document.getElementById('kb-tree');

    // Ensure data is loaded
    if (mergedData.length === 0) {
        parent.innerHTML = "<div style='text-align:center; padding:1rem; color:#666;'>Initializing Knowledge Base...<br><small>Fetching Index...</small></div>";
        const local = await fetchLocalDataLogs();
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
    }

    renderKBTree(mergedData);
}

// Kept for compatibility if needed, but initKB is preferred
async function fetchKBTree() { await initKB(); }

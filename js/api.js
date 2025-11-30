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
            return { id: r.id, type: 'repo', title: r.name, date: r.created_at.split('T')[0], icon: 'fab fa-github', image: img, content: r.description || "", url: r.html_url };
        }));
    } catch (e) { return []; }
}

async function fetchArtStation() {
    try {
        const url = 'https://corsproxy.io/?url=' + encodeURIComponent('https://www.artstation.com/users/infinition/projects.json?page=1');
        const r = await fetch(url);
        if (!r.ok) return [];
        const d = await r.json();
        return d.data.map(i => ({ id: `art-${i.id}`, type: 'artwork', file: `art_${i.hash_id}.png`, title: i.title, date: i.published_at.split('T')[0], icon: 'fab fa-artstation', image: i.cover.micro_square_image_url, content: 'ArtStation', url: i.permalink }));
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
        mergedData.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    renderKBTree(mergedData);
}

// Kept for compatibility if needed, but initKB is preferred
async function fetchKBTree() { await initKB(); }

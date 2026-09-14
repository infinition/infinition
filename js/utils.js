// --- SOUND UTILS ---
function playDecipherSound() {
    // Check if sound effects are disabled in config
    if (typeof CONFIG !== 'undefined' && CONFIG.enableSoundFx === false) {
        return;
    }

    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);

    // Add noise for texture
    const bufferSize = ctx.sampleRate * 0.2; // 0.2 seconds
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.2;

    osc.connect(gain);
    noise.connect(noiseGain);
    noiseGain.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    noise.start();

    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    osc.stop(ctx.currentTime + 0.3);
    noise.stop(ctx.currentTime + 0.3);
}

// --- FETCH UTILS ---
async function fetchCommitDate(path) {
    try {
        const r = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/commits?path=${encodeURIComponent(path)}&page=1&per_page=1`);
        if (!r.ok) return null;
        const d = await r.json();
        if (d.length > 0) return new Date(d[0].commit.committer.date).toISOString();
    } catch (e) { }
    return null;
}

async function fetchReadmeImage(o, r, b) {
    try {
        const res = await fetch(`https://raw.githubusercontent.com/${o}/${r}/${b}/README.md`);
        if (!res.ok) return null;
        const t = await res.text();
        const m = t.match(/!\[.*?\]\((.*?)\)|<img.*?src=["'](.*?)["']/);
        if (m) {
            let u = m[1] || m[2];
            if (u && !u.startsWith('http')) return `https://raw.githubusercontent.com/${o}/${r}/${b}/${u.startsWith('./') ? u.substring(2) : u}`;
            return u;
        }
    } catch (e) { }
    return null;
}

async function fetchAllMDRecursively(path) {
    let files = [];
    try {
        const r = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${path}`);
        if (!r.ok) return [];
        const items = await r.json();
        for (const i of items) {
            if (i.type === 'dir') files = files.concat(await fetchAllMDRecursively(i.path));
            else if (i.name.endsWith('.md')) files.push(i);
        }
    } catch (e) { }
    return files;
}

/* Le debut d'un markdown, en prose lisible.
 *
 * L'apercu d'une entree affichait le markdown brut coupe a cent caracteres. Sur
 * une note qui commence par son titre et une image, cela donnait un titre deja
 * repete juste au-dessus, puis une URL d'attachement GitHub tronquee en plein
 * milieu : cent caracteres depenses sans qu'un mot de l'article apparaisse.
 *
 * On retire donc ce qui n'est pas de la prose, et on ne coupe qu'a la fin, sur
 * une frontiere de mot. La limite est large a dessein : c'est le CSS qui decide
 * combien de lignes rester visibles, et il lui faut de la matiere pour remplir
 * la largeur dont il dispose. Couper court ici bridait la vue en ligne, qui a
 * toute la largeur de la page et n'affichait qu'un demi-ligne.
 */
function excerptFromMarkdown(markdown, max) {
    if (!markdown) return '';
    const limite = max || 480;
    let texte = String(markdown)
        .replace(/^---\r?\n[\s\S]*?\r?\n---/, ' ')   // front matter
        .replace(/```[\s\S]*?```/g, ' ')               // blocs de code
        .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')         // images
        .replace(/<img[^>]*>/gi, ' ')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')       // liens : on garde le libelle
        .replace(/<[^>]+>/g, ' ')                      // html inline
        .replace(/^\s*\n/, '')
        // Le premier titre repete celui deja affiche juste au-dessus de l'apercu.
        .replace(/^\s{0,3}#{1,6}\s+.*(\r?\n|$)/, '')
        // Les suivants sont de la prose utile : on enleve les diesses, pas le texte.
        .replace(/^\s{0,3}#{1,6}\s+/gm, '')
        .replace(/^\s{0,3}(?:[-*_]\s*){3,}$/gm, ' ')   // filets horizontaux
        .replace(/[\u2E3A\u2E3B\u2014]{2,}/g, ' ')      // et leurs variantes typographiques
        .replace(/^\s{0,3}>\s?/gm, ' ')                // citations
        .replace(/[*_`~]+/g, '')                       // emphase et code inline
        .replace(/\s+/g, ' ')
        .trim();
    if (texte.length <= limite) return texte;
    const coupe = texte.slice(0, limite);
    const espace = coupe.lastIndexOf(' ');
    return (espace > limite * 0.6 ? coupe.slice(0, espace) : coupe) + '…';
}

window.excerptFromMarkdown = excerptFromMarkdown;

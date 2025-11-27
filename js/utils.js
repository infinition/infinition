// --- SOUND UTILS ---
function playDecipherSound() {
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
        const r = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/commits?path=${path}&page=1&per_page=1`);
        if (!r.ok) return null;
        const d = await r.json();
        if (d.length > 0) return new Date(d[0].commit.committer.date).toISOString().split('T')[0];
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

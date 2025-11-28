function unlockData() {
    const el = document.getElementById('secret-data');
    const title = document.querySelector('.portal-title');

    if (!el.classList.contains('data-unlocked')) {
        playDecipherSound();
        title.classList.add('glitch-active');

        setTimeout(() => {
            el.classList.add('data-unlocked');
        }, 300);

        setTimeout(() => {
            title.classList.remove('glitch-active');
        }, 600);
    } else {
        el.classList.remove('data-unlocked');
    }
}

// --- INTERACTIVE MODULES ---
async function loadFlashcards(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error();
        currentFlashcards = await res.json();
        cardIndex = 0;
        document.getElementById('interactive-modal').style.display = 'flex';
        renderFC();
    } catch (e) { alert("Could not load Flashcards. Ensure 'filename_flashcard.json' exists."); }
}

function renderFC() {
    const card = currentFlashcards[cardIndex];
    const progress = ((cardIndex) / currentFlashcards.length) * 100;
    const html = `
        <div class="fc-container">
            <div class="fc-top-info"><div>Card ${cardIndex + 1}</div><div class="fc-counter-badge">${cardIndex + 1}/${currentFlashcards.length}</div></div>
            <div class="fc-progress-bg"><div class="fc-progress-fill" style="width:${progress}%"></div></div>
            <div class="fc-status"><i class="fas fa-check-circle"></i> Learning Mode</div>
            <div class="fc-scene" onclick="this.querySelector('.fc-card').classList.toggle('flipped')">
                <div class="fc-stack-2"></div><div class="fc-stack-1"></div>
                <div class="fc-card">
                    <div class="fc-face"><div class="fc-q-badge"><div class="fc-q-icon"><i class="fas fa-question"></i></div>Question</div><div class="fc-text">${card.question}</div><div class="fc-tap-hint"><i class="fas fa-hand-pointer"></i> Tap to flip</div></div>
                    <div class="fc-face fc-back"><div class="fc-text" style="color:var(--neon-green)">${card.answer}</div></div>
                </div>
            </div>
            <div class="fc-controls"><button class="fc-action-btn fc-btn-no" onclick="nextFC()"><i class="fas fa-times"></i></button><button class="fc-action-btn fc-btn-yes" onclick="nextFC()"><i class="fas fa-check"></i></button></div>
        </div>`;
    document.getElementById('modal-content-area').innerHTML = html;
}
function nextFC() {
    if (cardIndex < currentFlashcards.length - 1) { cardIndex++; renderFC(); }
    else { document.getElementById('modal-content-area').innerHTML = `<div style="text-align:center;color:white;padding:50px;"><h2>Complete!</h2><button class="action-btn btn-flash" style="margin:20px auto;" onclick="closeModal()">Close</button></div>`; }
}

async function loadQuiz(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error();
        const data = await res.json();
        const q = data[0]; // Demo first question
        const html = `
            <div class="qz-container">
                <div class="qz-top-bar"><span>Quiz Mode</span><div style="cursor:pointer;" onclick="closeModal()">✕</div></div>
                <div class="qz-progress-bg"><div class="qz-progress-fill" style="width:10%"></div></div>
                <div class="qz-question-box"><div class="qz-label"><i class="fas fa-question"></i> Question 1</div><div class="qz-text">${q.question}</div></div>
                <div class="qz-options">
                    ${q.options.map((opt, i) => `<div class="qz-option" onclick="this.classList.add(${opt.correct} ? 'correct' : 'wrong')"><div class="qz-letter">${String.fromCharCode(65 + i)}</div><div>${opt.text}</div></div>`).join('')}
                </div>
                <button class="qz-next-btn" onclick="closeModal()">Next Question <i class="fas fa-arrow-right"></i></button>
            </div>`;
        document.getElementById('interactive-modal').style.display = 'flex';
        document.getElementById('modal-content-area').innerHTML = html;
    } catch (e) { alert("Could not load Quiz. Ensure 'filename_quizz.json' exists."); }
}
function closeModal() { document.getElementById('interactive-modal').style.display = 'none'; }

// --- ARTICLE READER WITH DETECTION ---
async function openArticle(article) {
    const reader = document.getElementById('article-reader');
    document.getElementById('blog-view').style.display = 'none';
    document.getElementById('kb-view').style.display = 'none';
    reader.style.display = 'block';

    const shortName = article.file.split('/').pop();
    window.history.pushState(null, null, `#article:${shortName}`);
    const cleanContent = article.content.replace(/^# .*/m, '');

    // Auto-detect: Determine URL based on download_url (for Github API) or local path
    let flashUrl, quizUrl;
    if (article.download_url) {
        flashUrl = article.download_url.replace('.md', '_flashcard.json');
        quizUrl = article.download_url.replace('.md', '_quizz.json');
    } else {
        // fallback, assuming relative path matches
        const baseName = article.file.replace('.md', '');
        flashUrl = `${baseName}_flashcard.json`;
        quizUrl = `${baseName}_quizz.json`;
    }

    // Check existence (Fetch)
    const check = async (u) => {
        try {
            const r = await fetch(u);
            return r.ok ? u : null;
        } catch { return null; }
    };
    const [fUrl, qUrl] = await Promise.all([check(flashUrl), check(quizUrl)]);

    const shareUrl = window.location.href;
    const shareHtml = `
                    <div class="article-toolbar">
                        <button class="tool-btn" onclick="share('twitter')"><i class="fab fa-twitter"></i> Post </button>
                        <button class="tool-btn" onclick="share('linkedin')"><i class="fab fa-linkedin"></i> Share</button>
                        <button class="tool-btn" onclick="share('email')"><i class="fas fa-envelope"></i> Email</button>
                        <button class="tool-btn" onclick="share('sms')"><i class="fas fa-comment-dots"></i> SMS</button>
                        <button class="tool-btn" onclick="navigator.clipboard.writeText('${shareUrl}');alert('Link copied!')"><i class="fas fa-link"></i> Copy</button>
                        <button class="tool-btn" style="margin-left:auto" onclick="navigateTo('blog')">✕ Close</button>
                    </div>`;
    let interactiveHtml = '';
    if (fUrl || qUrl) {
        interactiveHtml = `<div style="display:flex; gap:15px; margin-bottom:30px;">`;
        if (fUrl) interactiveHtml += `<button class="action-btn btn-flash" onclick="loadFlashcards('${fUrl}')"><i class="fas fa-layer-group"></i> Flashcards</button>`;
        if (qUrl) interactiveHtml += `<button class="action-btn btn-quiz" onclick="loadQuiz('${qUrl}')"><i class="fas fa-graduation-cap"></i> Quiz</button>`;
        interactiveHtml += `</div>`;
    }

    document.getElementById('article-view').innerHTML = `
        <div class="article-content">
            ${shareHtml}
            <div style="margin-bottom:2rem;"><span style="color:var(--neon-orange);font-family:var(--code-font);font-size:0.8rem;">DIR: /${article.file}</span><h1 style="font-family:var(--cyber-font);font-size:2rem;margin-top:0.5rem;">${article.title}</h1><div style="display:flex;align-items:center;gap:10px;margin-top:10px;opacity:0.6;font-size:0.8rem;"><i class="fas fa-calendar"></i> ${article.date}<span>// FABIEN POLLY</span></div></div>
            ${interactiveHtml}
            ${article.image ? `<img src="${article.image}" style="max-width:100%;border:1px solid #333;margin-bottom:2rem;">` : ''}
            <div class="article-body">${marked.parse(cleanContent)}</div>
            <div style="text-align:center;margin-top:3rem;">
                <button class="btn-link" onclick="navigateTo('blog')">BACK TO LOGS</button>
                <button class="btn-link" onclick="openInKB('${article.file}')" style="margin-left:10px; border-color:var(--neon-purple); color:var(--neon-purple);">SEE IN KB</button>
            </div>
        </div>`;
    window.scrollTo(0, 0);
}

async function openKBArticle(article) {
    const container = document.getElementById('kb-content-area');
    const cleanContent = article.content.replace(/^# .*/m, '');

    // Interactive modules detection
    let flashUrl, quizUrl;
    if (article.download_url) {
        flashUrl = article.download_url.replace('.md', '_flashcard.json');
        quizUrl = article.download_url.replace('.md', '_quizz.json');
    } else {
        const baseName = article.file.replace('.md', '');
        flashUrl = `${baseName}_flashcard.json`;
        quizUrl = `${baseName}_quizz.json`;
    }

    const check = async (u) => { try { const r = await fetch(u); return r.ok ? u : null; } catch { return null; } };
    const [fUrl, qUrl] = await Promise.all([check(flashUrl), check(quizUrl)]);

    let interactiveHtml = '';
    if (fUrl || qUrl) {
        interactiveHtml = `<div style="display:flex; gap:15px; margin-bottom:30px;">`;
        if (fUrl) interactiveHtml += `<button class="action-btn btn-flash" onclick="loadFlashcards('${fUrl}')"><i class="fas fa-layer-group"></i> Flashcards</button>`;
        if (qUrl) interactiveHtml += `<button class="action-btn btn-quiz" onclick="loadQuiz('${qUrl}')"><i class="fas fa-graduation-cap"></i> Quiz</button>`;
        interactiveHtml += `</div>`;
    }

    const shareUrl = window.location.href;
    const shareHtml = `
                    <div class="article-toolbar">
                        <button class="tool-btn" onclick="share('twitter')"><i class="fab fa-twitter"></i> Post </button>
                        <button class="tool-btn" onclick="share('linkedin')"><i class="fab fa-linkedin"></i> Share</button>
                        <button class="tool-btn" onclick="share('email')"><i class="fas fa-envelope"></i> Email</button>
                        <button class="tool-btn" onclick="share('sms')"><i class="fas fa-comment-dots"></i> SMS</button>
                        <button class="tool-btn" onclick="navigator.clipboard.writeText('${shareUrl}');alert('Link copied!')"><i class="fas fa-link"></i> Copy</button>
                    </div>`;

    container.innerHTML = `
        <div class="article-content" style="max-width: 100%; padding: 10px;">
            ${shareHtml}
            <div style="margin-bottom:2rem;"><span style="color:var(--neon-purple);font-family:var(--code-font);font-size:0.8rem;">KB NODE: /${article.file}</span><h1 style="font-family:var(--cyber-font);font-size:2rem;margin-top:0.5rem;">${article.title}</h1></div>
            ${interactiveHtml}
            ${article.image ? `<img src="${article.image}" style="max-width:100%;border:1px solid #333;margin-bottom:2rem;">` : ''}
            <div class="article-body">${marked.parse(cleanContent)}</div>
        </div>`;
}

function share(platform) {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent("Check this out: ");
    if (platform === 'linkedin') window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`);
    if (platform === 'twitter') window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`);
    if (platform === 'sms') window.open(`sms:?body=${text}${url}`);
}

function revealMusic() {
    playDecipherSound();
    document.getElementById('music-lock-screen').style.display = 'none';
    document.getElementById('music-content').style.display = 'block';
    fetchMusicData();
}

function renderArticles(items) {
    const container = document.getElementById('article-list-container');
    container.innerHTML = '';
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'article-entry';
        div.onclick = () => {
            if (item.type === 'repo' || item.type === 'artwork') window.open(item.url, '_blank');
            else openArticle(item);
        };

        let thumb = '';
        if (item.image) {
            thumb = `<img src="${item.image}" class="article-thumb">`;
        } else {
            let fallbackIcon = item.type === 'repo' ? 'fab fa-github' : 'fas fa-file-lines';
            thumb = `<div class="article-thumb"><i class="${fallbackIcon} thumb-icon"></i></div>`;
        }

        let color = item.type === 'repo' ? 'var(--neon-orange)' : (item.type === 'artwork' ? 'var(--neon-blue)' : '#555');

        div.innerHTML = `
            ${thumb}
            <div class="article-info">
                <div class="article-header"><i class="${item.icon} file-icon" style="color:${color}"></i> <span class="article-title">${item.title}</span></div>
                <span class="article-date">${item.date}</span>
                <div class="article-desc">${item.content.substring(0, 100)}...</div>
            </div>
        `;
        container.appendChild(div);
    });
}

function filterArticles(query) {
    const q = query.toLowerCase();
    const filtered = mergedData.filter(i => i.title.toLowerCase().includes(q) || (i.content && i.content.toLowerCase().includes(q)));
    renderArticles(filtered);
}

// --- KB UI ---
function toggleKBSort() {
    kbSortMode = kbSortMode === 'date' ? 'name' : 'date';
    document.getElementById('kb-sort-icon').className = kbSortMode === 'date' ? 'fas fa-calendar' : 'fas fa-sort-alpha-down';
    // Re-render with current filter if any
    const q = document.getElementById('kb-search').value;
    if (q) {
        const filtered = mergedData.filter(i => i.title.toLowerCase().includes(q.toLowerCase()) || (i.content && i.content.toLowerCase().includes(q.toLowerCase())));
        renderKBTree(filtered);
    } else {
        renderKBTree(mergedData);
    }
}

function renderKBTree(data) {
    const parent = document.getElementById('kb-tree');
    parent.innerHTML = '';

    // Filter only articles and KB items (exclude repos/art for the tree if desired, or include all?)
    // User asked for "articles in /articles" to appear.
    // Let's filter for type 'article' which covers both local articles and KB.
    const items = data.filter(i => i.type === 'article');

    // Build Tree Structure
    const tree = {};

    items.forEach(item => {
        const parts = item.file.split('/');
        let currentLevel = tree;

        parts.forEach((part, index) => {
            if (index === parts.length - 1) {
                // File
                if (!currentLevel._files) currentLevel._files = [];
                currentLevel._files.push(item);
            } else {
                // Directory
                if (!currentLevel[part]) currentLevel[part] = {};
                currentLevel = currentLevel[part];
            }
        });
    });

    // Recursive Render
    function renderNode(node, container, level = 0) {
        // Render Folders
        const folders = Object.keys(node).filter(k => k !== '_files').sort((a, b) => {
            if (a === 'kb') return -1;
            if (b === 'kb') return 1;
            return a.localeCompare(b);
        });

        folders.forEach(folder => {
            const fDiv = document.createElement('div');
            fDiv.className = 'tree-folder';
            fDiv.style.paddingLeft = `${level * 10}px`;
            fDiv.innerHTML = `<i class="fas fa-folder"></i> ${folder}`;

            const cDiv = document.createElement('div');
            cDiv.className = 'tree-children';

            // Auto-expand if searching or root
            if (document.getElementById('kb-search').value || level < 1) cDiv.classList.add('open');

            fDiv.onclick = (e) => { e.stopPropagation(); cDiv.classList.toggle('open'); };

            container.appendChild(fDiv);
            container.appendChild(cDiv);

            renderNode(node[folder], cDiv, level + 1);
        });

        // Render Files
        if (node._files) {
            // SORTING LOGIC
            node._files.sort((a, b) => {
                if (kbSortMode === 'date') return new Date(b.date) - new Date(a.date);
                return a.title.localeCompare(b.title);
            });

            node._files.forEach(file => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'tree-item';
                itemDiv.style.paddingLeft = `${(level + 1) * 10}px`;

                // Add sorting arrow/indicator if needed, or just rely on order.
                // User asked for "discrete arrow". Let's add a small icon.
                const sortIcon = kbSortMode === 'date' ? '<i class="fas fa-clock" style="font-size:0.6rem; opacity:0.5; margin-left:5px;"></i>' : '';

                itemDiv.innerHTML = `<i class="${file.icon}"></i> ${file.title} ${sortIcon}`;
                itemDiv.onclick = () => openKBArticle(file);
                container.appendChild(itemDiv);
            });
        }
    }

    renderNode(tree, parent);
}

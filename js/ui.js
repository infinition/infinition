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
let currentScore = 0;
let sessionType = ''; // 'flashcard' or 'quiz'
let currentUrl = '';
let quizIndex = 0;
let currentQuizData = [];

// Helper for randomization
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

async function loadFlashcards(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error();
        currentFlashcards = shuffleArray(await res.json());
        cardIndex = 0;
        currentScore = 0;
        sessionType = 'flashcard';
        currentUrl = url;

        const modal = document.getElementById('interactive-modal');
        modal.style.display = 'flex';
        // Force reflow
        void modal.offsetWidth;
        modal.classList.add('active');
        renderFC();
    } catch (e) { alert("Could not load Flashcards. Ensure 'filename_flashcard.json' exists."); }
}

function renderFC() {
    const card = currentFlashcards[cardIndex];
    const progress = ((cardIndex) / currentFlashcards.length) * 100;
    const prevScore = localStorage.getItem('score_' + currentUrl);
    const prevText = prevScore ? `Previous: ${prevScore}` : 'First Try';

    const html = `
        <div class="fc-container">
            <div class="fc-top-info">
                <div style="display:flex; gap:10px; align-items:center;">
                    <div>Card ${cardIndex + 1}</div>
                    <div class="fc-counter-badge">${cardIndex + 1}/${currentFlashcards.length}</div>
                </div>
                <div style="font-size:0.8rem; color:#888;">${prevText}</div>
                <div onclick="finishSession()" style="cursor:pointer; padding:5px; font-size:1.2rem;">✕</div>
            </div>
            <div class="fc-progress-bg"><div class="fc-progress-fill" style="width:${progress}%"></div></div>
            <div class="fc-status"><i class="fas fa-check-circle"></i> Learning Mode</div>
            <div class="fc-scene" onclick="this.querySelector('.fc-card').classList.toggle('flipped')">
                <div class="fc-stack-2"></div><div class="fc-stack-1"></div>
                <div class="fc-card">
                    <div class="fc-face"><div class="fc-q-badge"><div class="fc-q-icon"><i class="fas fa-question"></i></div>Question</div><div class="fc-text">${card.question}</div><div class="fc-tap-hint"><i class="fas fa-hand-pointer"></i> Tap to flip</div></div>
                    <div class="fc-face fc-back"><div class="fc-text" style="color:var(--neon-green)">${card.answer}</div></div>
                </div>
            </div>
            <div class="fc-controls">
                <button class="fc-action-btn fc-btn-no" onclick="nextFC(false)"><i class="fas fa-times"></i></button>
                <button class="fc-action-btn fc-btn-yes" onclick="nextFC(true)"><i class="fas fa-check"></i></button>
            </div>
        </div>`;
    document.getElementById('modal-content-area').innerHTML = html;
}

function nextFC(isCorrect) {
    if (isCorrect) currentScore++;

    if (cardIndex < currentFlashcards.length - 1) {
        cardIndex++;
        renderFC();
    } else {
        finishSession();
    }
}

async function loadQuiz(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error();
        currentQuizData = shuffleArray(await res.json());
        quizIndex = 0;
        currentScore = 0;
        sessionType = 'quiz';
        currentUrl = url;

        const modal = document.getElementById('interactive-modal');
        modal.style.display = 'flex';
        // Force reflow
        void modal.offsetWidth;
        modal.classList.add('active');
        renderQuiz();
    } catch (e) { alert("Could not load Quiz. Ensure 'filename_quizz.json' exists."); }
}

function renderQuiz() {
    const q = currentQuizData[quizIndex];
    const progress = ((quizIndex) / currentQuizData.length) * 100;
    const prevScore = localStorage.getItem('score_' + currentUrl);
    const prevText = prevScore ? `Previous: ${prevScore}` : 'First Try';

    const html = `
        <div class="qz-container">
            <div class="qz-top-bar">
                <span>Quiz Mode</span>
                <div style="font-size:0.8rem; color:#888;">${prevText}</div>
                <div style="cursor:pointer;" onclick="finishSession()">✕</div>
            </div>
            <div class="qz-progress-bg"><div class="qz-progress-fill" style="width:${progress}%"></div></div>
            <div class="qz-question-box"><div class="qz-label"><i class="fas fa-question"></i> Question ${quizIndex + 1}</div><div class="qz-text">${q.question}</div></div>
            <div class="qz-options">
                ${q.options.map((opt, i) => `
                    <div class="qz-option" onclick="submitQuizAnswer(this, ${opt.correct})">
                        <div class="qz-letter">${String.fromCharCode(65 + i)}</div>
                        <div>${opt.text}</div>
                    </div>`).join('')}
            </div>
        </div>`;
    document.getElementById('modal-content-area').innerHTML = html;
}

function submitQuizAnswer(el, isCorrect) {
    // Prevent multiple clicks
    if (el.parentElement.classList.contains('answered')) return;
    el.parentElement.classList.add('answered');

    if (isCorrect) {
        el.classList.add('correct');
        currentScore++;
    } else {
        el.classList.add('wrong');
    }

    setTimeout(() => {
        if (quizIndex < currentQuizData.length - 1) {
            quizIndex++;
            renderQuiz();
        } else {
            finishSession();
        }
    }, 1000);
}

function finishSession() {
    // Calculate total based on current progress (if quit early) or total length (if finished)
    // If we are here, we either clicked X (quit) or finished the last item.
    // If we finished, cardIndex/quizIndex is at the last item index.
    // So total answered/seen is index + 1.
    const currentIndex = sessionType === 'flashcard' ? cardIndex : quizIndex;
    const total = currentIndex + 1;

    // Avoid division by zero if empty (should not happen usually)
    if (total === 0) { closeModal(); return; }

    const scoreStr = `${currentScore}/${total}`;
    const prevScoreStr = localStorage.getItem('score_' + currentUrl);

    // Save new score
    localStorage.setItem('score_' + currentUrl, scoreStr);

    let comparisonMsg = "Well done!";
    if (prevScoreStr) {
        const prevScoreVal = parseInt(prevScoreStr.split('/')[0]);
        if (currentScore > prevScoreVal) comparisonMsg = "Better than last time! 🚀";
        else if (currentScore < prevScoreVal) comparisonMsg = "Keep practicing! 💪";
        else comparisonMsg = "Consistent performance! 👍";
    }

    const html = `
        <div style="text-align:center; color:white; padding:40px; font-family:var(--ui-font);">
            <h2 style="font-family:var(--cyber-font); margin-bottom:20px; color:var(--neon-blue);">Session Complete</h2>
            <div style="font-size:3rem; font-weight:bold; margin-bottom:10px;">${scoreStr}</div>
            <div style="color:#aaa; margin-bottom:30px;">${comparisonMsg}</div>
            <button class="action-btn btn-flash" style="margin:0 auto; padding:10px 30px; font-size:1.2rem;" onclick="closeModal()">Exit</button>
        </div>`;

    document.getElementById('modal-content-area').innerHTML = html;
}

function closeModal() {
    const modal = document.getElementById('interactive-modal');
    modal.classList.remove('active');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

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
                        <button class="tool-btn" onclick="navigateTo('blog')">✕ Close</button>
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
            <div style="margin-bottom:2rem;"><span style="color:var(--neon-orange);font-family:var(--code-font);font-size:0.8rem;white-space:normal;overflow-wrap:break-word;word-wrap:break-word;">DIR: /${article.file}</span><h1 style="font-family:var(--cyber-font);font-size:2rem;margin-top:0.5rem;">${article.title}</h1><div style="display:flex;align-items:center;gap:10px;margin-top:10px;opacity:0.6;font-size:0.8rem;"><i class="fas fa-calendar"></i> ${article.date}<span>// FABIEN POLLY</span></div></div>
            ${interactiveHtml}

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
            <div style="margin-bottom:2rem;"><span style="color:var(--neon-purple);font-family:var(--code-font);font-size:0.8rem;white-space:normal;overflow-wrap:break-word;word-wrap:break-word;
">KB NODE: /${article.file}</span><h1 style="font-family:var(--cyber-font);font-size:2rem;margin-top:0.5rem;">${article.title}</h1></div>
            ${interactiveHtml}

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
// document.addEventListener('DOMContentLoaded', () => {
//     const sidebar  = document.querySelector('.kb-sidebar');
//     const backdrop = document.querySelector('.kb-backdrop');
//     const toggleBtn = document.querySelector('.kb-toggle-btn');

//     if (!sidebar || !backdrop || !toggleBtn) return;

//     // OUVRIR / FERMER via le bouton
//     toggleBtn.addEventListener('click', () => {
//         const isOpen = sidebar.classList.toggle('open');
//         toggleBtn.classList.toggle('open', isOpen);
//         backdrop.classList.toggle('active', isOpen);
//     });

//     // FERMER en cliquant sur le backdrop
//     backdrop.addEventListener('click', () => {
//         sidebar.classList.remove('open');
//         toggleBtn.classList.remove('open');
//         backdrop.classList.remove('active');
//     });
// });
// --- MOBILE KB SIDEBAR : OPEN/CLOSE HELPERS ---
function openKBMobile() {
    const sidebar = document.querySelector('.kb-sidebar');
    const backdrop = document.querySelector('.kb-backdrop');
    const btn = document.querySelector('.kb-toggle-btn');
    if (!sidebar || !backdrop || !btn) return;

    sidebar.classList.add('open');
    btn.classList.add('open');
    backdrop.classList.add('active');
    backdrop.style.opacity = '0.6';
}

function closeKBMobile() {
    const sidebar = document.querySelector('.kb-sidebar');
    const backdrop = document.querySelector('.kb-backdrop');
    const btn = document.querySelector('.kb-toggle-btn');
    if (!sidebar || !backdrop || !btn) return;

    sidebar.classList.remove('open');
    btn.classList.remove('open');
    backdrop.classList.remove('active');
    backdrop.style.opacity = '0';
    sidebar.style.transform = ''; // reset si un drag a mis un transform inline
}

function toggleKBMobile() {
    const sidebar = document.querySelector('.kb-sidebar');
    if (!sidebar) return;
    if (sidebar.classList.contains('open')) {
        closeKBMobile();
    } else {
        openKBMobile();
    }
}
// --- MOBILE KB SIDEBAR : LISTENERS & SWIPE ---
document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.querySelector('.kb-sidebar');
    const backdrop = document.querySelector('.kb-backdrop');
    const toggleBtn = document.querySelector('.kb-toggle-btn');

    if (!sidebar || !backdrop || !toggleBtn) return;

    // Bouton : ouvre / ferme (mobile only)
    toggleBtn.addEventListener('click', (e) => {
        if (window.innerWidth > 768) return;
        e.stopPropagation();
        toggleKBMobile();
    });

    // Backdrop : ferme
    backdrop.addEventListener('click', () => {
        if (window.innerWidth > 768) return;
        closeKBMobile();
    });

    // --- SWIPE POUR FERMER (pousser vers la gauche) ---
    let isDragging = false;
    let startX = 0;
    let lastTranslateX = 0;

    sidebar.addEventListener('touchstart', (e) => {
        if (window.innerWidth > 768) return;
        if (!sidebar.classList.contains('open')) return;
        if (e.touches.length !== 1) return;

        isDragging = true;
        startX = e.touches[0].clientX;
        lastTranslateX = 0;

        sidebar.classList.add('dragging');
        sidebar.style.transition = 'none';
        backdrop.style.transition = 'none';
    }, { passive: true });

    sidebar.addEventListener('touchmove', (e) => {
        if (!isDragging) return;

        const currentX = e.touches[0].clientX;
        let deltaX = currentX - startX;     // vers la gauche => négatif
        if (deltaX > 0) deltaX = 0;         // on bloque le swipe vers la droite

        const width = sidebar.offsetWidth;
        const clamped = Math.max(deltaX, -width); // entre 0 et -width
        lastTranslateX = clamped;

        const ratio = Math.min(Math.abs(clamped) / width, 1); // 0 -> ouvert, 1 -> fermé
        const progress = 1 - ratio;                            // 1 ouvert, 0 fermé
        const tilt = -8 * (1 - progress);                      // petit tilt quand ça se ferme

        // Position + tilt dynamique
        sidebar.style.transform = `translate3d(${clamped}px, 0, 0) rotateY(${tilt}deg)`;

        // Backdrop qui s'éclaircit en fonction du drag
        backdrop.style.opacity = String(0.6 * progress);
    }, { passive: true });

    const endDrag = () => {
        if (!isDragging) return;
        isDragging = false;
        sidebar.classList.remove('dragging');

        const width = sidebar.offsetWidth;
        const shouldClose = Math.abs(lastTranslateX) > width * 0.3; // seuil 30%

        // On rend les transitions à nouveau actives
        sidebar.style.transition = '';
        backdrop.style.transition = '';

        if (shouldClose) {
            // Animation de fermeture "ease-out"
            sidebar.style.transition = 'transform 0.25s ease-out';
            backdrop.style.transition = 'opacity 0.25s ease-out';
            sidebar.style.transform = 'translate3d(-100%, 0, 0) rotateY(-10deg)';
            backdrop.style.opacity = '0';

            setTimeout(() => {
                closeKBMobile();
                sidebar.style.transition = '';
            }, 260);
        } else {
            // Revenir à l'état ouvert
            sidebar.style.transform = '';   // on laisse le CSS .open reprendre la main
            backdrop.style.opacity = '0.6';
        }
    };

    sidebar.addEventListener('touchend', endDrag);
    sidebar.addEventListener('touchcancel', endDrag);
});


function revealMusic() {
    playDecipherSound();
    document.getElementById('music-lock-screen').style.display = 'none';
    document.getElementById('music-content').style.display = 'block';
    fetchMusicData();
}

function togglePlayer() {
    const player = document.querySelector('.audio-player');
    const btn = document.querySelector('.btn-reveal-player');

    if (player.classList.contains('active')) {
        player.classList.remove('active');
        btn.innerHTML = '<i class="fas fa-play-circle"></i> LAUNCH PLAYER';
    } else {
        player.classList.add('active');
        btn.innerHTML = '<i class="fas fa-times-circle"></i> CLOSE PLAYER';
    }
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
        } else if (item.content) {
            // Try to find first image in markdown
            const imgMatch = item.content.match(/!\[.*?\]\((.*?)\)/) || item.content.match(/<img.*?src=["'](.*?)["']/);
            if (imgMatch && imgMatch[1]) {
                thumb = `<img src="${imgMatch[1]}" class="article-thumb">`;
            } else {
                let fallbackIcon = item.type === 'repo' ? 'fab fa-github' : 'fas fa-file-lines';
                thumb = `<div class="article-thumb"><i class="${fallbackIcon} thumb-icon"></i></div>`;
            }
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

                // Flex layout for alignment
                itemDiv.style.display = 'flex';
                itemDiv.style.alignItems = 'center';

                let mediaHtml = `<i class="${file.icon}" style="margin-right:8px; width:40px; text-align:center;"></i>`;
                if (file.image) {
                    mediaHtml = `<img src="${file.image}" style="width:40px; height:40px; object-fit:cover; margin-right:8px; border-radius:2px; flex-shrink:0;">`;
                }

                itemDiv.innerHTML = `${mediaHtml}<span>${file.title}</span> ${sortIcon}`;
                itemDiv.onclick = () => openKBArticle(file);
                container.appendChild(itemDiv);
            });
        }
    }

    renderNode(tree, parent);
}

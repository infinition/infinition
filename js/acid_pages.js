// Acid Pages Logic

const acidState = {
    username: 'infinition',
    repos: [],
    loading: false,
    error: null
};

// Elements (will be selected when view initializes)
let acidSearchForm, acidSearchInput, acidSearchBtn, acidBtnIcon;
let acidResultsGrid, acidLoader, acidErrorContainer, acidErrorMessage;
let acidEmptyState, acidStatsContainer, acidTargetUserDisplay, acidRepoCountDisplay;

function initAcidPages() {
    // Select elements
    acidSearchForm = document.getElementById('acid-search-form');
    acidSearchInput = document.getElementById('acid-search-input');
    acidSearchBtn = document.getElementById('acid-search-btn');
    acidBtnIcon = document.getElementById('acid-btn-icon');

    acidResultsGrid = document.getElementById('acid-results-grid');
    acidLoader = document.getElementById('acid-loader');
    acidErrorContainer = document.getElementById('acid-error-container');
    acidErrorMessage = document.getElementById('acid-error-message');
    acidEmptyState = document.getElementById('acid-empty-state');
    acidStatsContainer = document.getElementById('acid-stats-container');
    acidTargetUserDisplay = document.getElementById('acid-target-user');
    acidRepoCountDisplay = document.getElementById('acid-repo-count');

    // Initialize Lucide icons if available
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // Attach event listeners
    if (acidSearchForm) {
        acidSearchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const val = acidSearchInput.value.trim();
            if (val) {
                fetchAcidRepos(val);
            }
        });
    }

    // Initial fetch if grid is empty
    if (acidResultsGrid && acidResultsGrid.children.length === 0) {
        fetchAcidRepos(acidState.username);
    }
}

async function fetchAcidRepos(userToFetch) {
    setAcidLoading(true);
    setAcidError(null);

    // UI Updates immediately
    if (acidTargetUserDisplay) acidTargetUserDisplay.textContent = `@${userToFetch}`;
    if (acidResultsGrid) acidResultsGrid.innerHTML = '';
    if (acidStatsContainer) acidStatsContainer.classList.add('hidden');
    if (acidEmptyState) acidEmptyState.classList.add('hidden');

    try {
        // Fetch up to 100 updated repos
        const response = await fetch(`https://api.github.com/users/${userToFetch}/repos?per_page=500&sort=updated`);

        if (!response.ok) {
            if (response.status === 404) throw new Error("USER NOT FOUND");
            if (response.status === 403) throw new Error("API RATE LIMIT EXCEEDED");
            throw new Error("DATA RETRIEVAL FAILED");
        }

        const data = await response.json();

        // Filter for Pages
        const pagesRepos = data.filter(repo => repo.has_pages);

        // Process Data
        const formattedRepos = pagesRepos.map(repo => {
            let pageUrl = `https://${userToFetch}.github.io/${repo.name}/`;
            // Handle special case username.github.io
            if (repo.name.toLowerCase() === `${userToFetch.toLowerCase()}.github.io`) {
                pageUrl = `https://${userToFetch}.github.io/`;
            }

            return {
                id: repo.id,
                name: repo.name,
                description: repo.description,
                html_url: repo.html_url,
                page_url: pageUrl,
                updated_at: new Date(repo.updated_at).toLocaleDateString('fr-FR'),
                language: repo.language || 'N/A'
            };
        });

        renderAcidRepos(formattedRepos);

    } catch (err) {
        setAcidError(err.message);
    } finally {
        setAcidLoading(false);
    }
}

function renderAcidRepos(repos) {
    if (repos.length === 0) {
        if (acidEmptyState) acidEmptyState.classList.remove('hidden');
        return;
    }

    if (acidStatsContainer) acidStatsContainer.classList.remove('hidden');
    if (acidRepoCountDisplay) acidRepoCountDisplay.textContent = repos.length;

    repos.forEach((repo, index) => {
        const card = document.createElement('div');
        card.className = 'glass-panel rounded-xl p-0 overflow-hidden card-hover group relative flex flex-col h-full animate-fade-in';
        card.style.animationDelay = `${index * 50}ms`;

        const langBadge = getAcidLanguageBadge(repo.language);
        card.innerHTML = `
            <div class="h-1 w-full bg-zinc-800">
                <div class="h-full bg-gradient-to-r from-lime-600 to-emerald-500 w-full transform scale-x-0 transition-transform duration-300 origin-left progress-line"></div>
            </div>
            
            <div class="p-6 flex-grow flex flex-col relative z-10">
                <div class="flex justify-between items-center mb-4">
                    <div class="bg-zinc-800/80 p-2 rounded-lg text-lime-500 border border-zinc-700">
                        <i data-lucide="book-open" class="w-5 h-5"></i>
                    </div>
                    ${langBadge}
                </div>
                
                <h3 class="text-xl font-bold text-white mb-2 card-title transition-colors truncate" title="${repo.name}">
                    ${repo.name}
                </h3>
                
                <p class="text-zinc-400 text-sm mb-6 line-clamp-3 leading-relaxed flex-grow font-medium">
                    ${repo.description || '<span class="italic opacity-50">No description data available in mainframe.</span>'}
                </p>

                <div class="acid-card-meta text-[10px] font-mono text-zinc-600 mb-6 pt-4 border-t border-zinc-800/50 uppercase flex items-center gap-2">
                    <div class="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    LAST SYNC: ${repo.updated_at}
                </div>

                <div class="acid-card-actions flex gap-3 mt-auto">
                    <a href="${repo.page_url}" target="_blank" rel="noopener noreferrer" 
                       class="acid-launch-btn flex-1 flex items-center justify-center gap-2 bg-lime-700/20 hover:bg-lime-600 hover:text-black text-lime-500 border border-lime-600/50 hover:border-lime-500 py-3 rounded text-xs font-bold tracking-widest uppercase transition-all">
                        <i data-lucide="globe" class="w-4 h-4"></i>
                        LAUNCH
                    </a>
                    <a href="${repo.html_url}" target="_blank" rel="noopener noreferrer"
                       class="acid-code-btn flex items-center justify-center rounded transition-colors"
                       title="View Source Code">
                        <i class="fab fa-github"></i>
                    </a>
                </div>
            </div>
        `;
        if (acidResultsGrid) acidResultsGrid.appendChild(card);
    });

    // Re-init icons for new elements
    if (window.lucide) window.lucide.createIcons();
}

function getAcidLanguageBadge(language) {
    const lang = String(language || '').toLowerCase();
    const icons = {
        javascript: `<svg viewBox="0 0 128 128" aria-hidden="true"><path d="M1.408 1.408h125.184v125.185H1.408z" fill="currentColor" opacity=".12"/><path d="M67.652 99.284c2.623 4.29 6.034 7.463 12.068 7.463 5.069 0 8.301-2.532 8.301-6.034 0-4.19-3.33-5.67-8.93-8.121l-3.067-1.314c-8.86-3.779-14.74-8.527-14.74-18.548 0-9.232 7.03-16.265 18.02-16.265 7.82 0 13.437 2.723 17.477 9.86l-9.59 6.16c-2.106-3.78-4.377-5.267-7.887-5.267-3.587 0-5.86 2.277-5.86 5.267 0 3.695 2.273 5.175 7.518 7.463l3.067 1.314c10.431 4.457 16.31 9.01 16.31 19.258 0 11.042-8.685 17.105-20.337 17.105-11.38 0-18.73-5.433-22.31-12.532zm-32.61 1.067c1.934 3.43 3.695 6.333 7.887 6.333 4.026 0 6.567-1.57 6.567-7.703V56.465h12.238v43.002c0 13.037-7.64 18.97-18.804 18.97-10.099 0-15.95-5.227-18.94-11.536z" fill="currentColor"/></svg>`,
        python: `<svg viewBox="0 0 128 128" aria-hidden="true"><path d="M62.096 8.8c-25.2 0-23.6 10.9-23.6 10.9l.1 11.3h24v3.4H29.1s-16.1-1.8-16.1 23.5 14.1 24.3 14.1 24.3h8.4v-11.8s-.5-14.1 13.9-14.1h24s13.6.2 13.6-13.2V22.3s2.1-13.5-23.7-13.5zm-13.2 7.6c2.4 0 4.3 2 4.3 4.4s-1.9 4.4-4.3 4.4-4.3-2-4.3-4.4 1.9-4.4 4.3-4.4z" fill="currentColor"/><path d="M65.904 119.2c25.2 0 23.6-10.9 23.6-10.9l-.1-11.3h-24v-3.4h33.5s16.1 1.8 16.1-23.5-14.1-24.3-14.1-24.3h-8.4v11.8s.5 14.1-13.9 14.1h-24s-13.6-.2-13.6 13.2v20.9s-2.1 13.5 23.7 13.5zm13.2-7.6c-2.4 0-4.3-2-4.3-4.4s1.9-4.4 4.3-4.4 4.3 2 4.3 4.4-1.9 4.4-4.3 4.4z" fill="currentColor"/></svg>`,
        html: `<svg viewBox="0 0 128 128" aria-hidden="true"><path d="M19 114L9 0h110l-10 114-45 14" fill="currentColor" opacity=".12"/><path d="M64 119l36-11 8-90H64" fill="currentColor" opacity=".22"/><path d="M64 52H39l-2-22h27V16H25l6 70h33V71H45l-1-14h20" fill="currentColor"/><path d="M64 86l19-5 2-23H64V43h36l-5 54-31 9" fill="currentColor"/></svg>`,
        typescript: `<svg viewBox="0 0 128 128" aria-hidden="true"><path d="M1.408 1.408h125.184v125.185H1.408z" fill="currentColor" opacity=".12"/><path d="M72.025 72.844c1.77 2.9 4.078 5.035 8.154 5.035 3.428 0 5.61-1.713 5.61-4.08 0-2.833-2.248-3.846-6.023-5.49l-2.067-.88c-5.967-2.545-9.94-5.735-9.94-12.477 0-6.216 4.73-10.954 12.12-10.954 5.26 0 9.04 1.83 11.78 6.62l-6.45 4.146c-1.42-2.545-2.95-3.54-5.33-3.54-2.42 0-3.95 1.54-3.95 3.54 0 2.49 1.53 3.49 5.08 5.02l2.07.88c7.02 3 10.98 6.06 10.98 12.97 0 7.44-5.86 11.53-13.69 11.53-7.66 0-12.6-3.66-15.01-8.45zM50 43H28v8h7v36h8V51h7" fill="currentColor"/></svg>`
    };
    const svg = icons[lang] || `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v16H4z" fill="currentColor" opacity=".2"/><path d="M7 7h10v2H7zm0 4h10v2H7zm0 4h6v2H7z" fill="currentColor"/></svg>`;
    return `<span class="acid-lang-icon" title="${language || ''}">${svg}</span>`;
}

function setAcidLoading(isLoading) {
    acidState.loading = isLoading;
    if (acidSearchBtn) acidSearchBtn.disabled = isLoading;

    if (isLoading) {
        if (acidLoader) acidLoader.classList.remove('hidden');
        if (acidResultsGrid) acidResultsGrid.innerHTML = '';
        if (acidBtnIcon) {
            acidBtnIcon.setAttribute('data-lucide', 'loader-2');
            acidBtnIcon.classList.add('animate-spin');
        }
        if (acidSearchBtn) acidSearchBtn.classList.add('opacity-70', 'cursor-not-allowed');
    } else {
        if (acidLoader) acidLoader.classList.add('hidden');
        if (acidBtnIcon) {
            acidBtnIcon.setAttribute('data-lucide', 'search');
            acidBtnIcon.classList.remove('animate-spin');
        }
        if (acidSearchBtn) acidSearchBtn.classList.remove('opacity-70', 'cursor-not-allowed');
    }
    if (window.lucide) window.lucide.createIcons();
}

function setAcidError(msg) {
    if (msg) {
        if (acidErrorContainer) acidErrorContainer.classList.remove('hidden');
        if (acidErrorMessage) acidErrorMessage.textContent = msg;
    } else {
        if (acidErrorContainer) acidErrorContainer.classList.add('hidden');
    }
}

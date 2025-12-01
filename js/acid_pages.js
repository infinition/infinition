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

        card.innerHTML = `
            <div class="h-1 w-full bg-zinc-800">
                <div class="h-full bg-gradient-to-r from-lime-600 to-emerald-500 w-full transform scale-x-0 transition-transform duration-300 origin-left progress-line"></div>
            </div>
            
            <div class="p-6 flex-grow flex flex-col relative z-10">
                <div class="flex justify-between items-start mb-4">
                    <div class="bg-zinc-800/80 p-2 rounded-lg text-lime-500 border border-zinc-700">
                        <i data-lucide="book-open" class="w-5 h-5"></i>
                    </div>
                    <span class="text-[10px] font-bold tracking-wider text-zinc-500 bg-zinc-900/50 border border-zinc-800 px-2 py-1 rounded uppercase">
                        ${repo.language}
                    </span>
                </div>
                
                <h3 class="text-xl font-bold text-white mb-2 card-title transition-colors truncate" title="${repo.name}">
                    ${repo.name}
                </h3>
                
                <p class="text-zinc-400 text-sm mb-6 line-clamp-3 leading-relaxed flex-grow font-medium">
                    ${repo.description || '<span class="italic opacity-50">No description data available in mainframe.</span>'}
                </p>

                <div class="text-[10px] font-mono text-zinc-600 mb-6 pt-4 border-t border-zinc-800/50 uppercase flex items-center gap-2">
                    <div class="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    LAST SYNC: ${repo.updated_at}
                </div>

                <div class="flex gap-3 mt-auto">
                    <a href="${repo.page_url}" target="_blank" rel="noopener noreferrer" 
                       class="flex-1 flex items-center justify-center gap-2 bg-lime-700/20 hover:bg-lime-600 hover:text-black text-lime-500 border border-lime-600/50 hover:border-lime-500 py-3 rounded text-xs font-bold tracking-widest uppercase transition-all">
                        <i data-lucide="globe" class="w-4 h-4"></i>
                        LAUNCH
                    </a>
                    <a href="${repo.html_url}" target="_blank" rel="noopener noreferrer"
                       class="px-3 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-zinc-700 rounded transition-colors"
                       title="View Source Code">
                        <i data-lucide="code" class="w-4 h-4"></i>
                    </a>
                </div>
            </div>
        `;
        if (acidResultsGrid) acidResultsGrid.appendChild(card);
    });

    // Re-init icons for new elements
    if (window.lucide) window.lucide.createIcons();
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

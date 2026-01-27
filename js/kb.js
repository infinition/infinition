/**
 * Knowledge Base - AcidWiki Clone
 * Complete JavaScript implementation with all AcidWiki features
 */

// === KB STATE ===
const KB_STATE = {
    initialized: false,
    structure: [],
    flatPages: [],
    searchIndex: [],
    currentPath: null,
    expandedSections: new Set(),
    allData: [],
    searchSelectedIndex: 0,
    hasHighlights: false,
    tocHeadings: []
};

// === INITIALIZATION ===
async function initKB() {
    console.log('[KB] Initializing Knowledge Base...');

    // Setup event listeners (only once)
    if (!KB_STATE.initialized) {
        setupKBEventListeners();
        setupKBMicroInteractions();
        setupKBStickyBreadcrumbs();
    }

    // Show loading state
    const navTree = document.getElementById('kb-nav-tree');
    if (navTree) {
        navTree.innerHTML = `
            <div class="kb-skeleton" style="height: 20px; width: 80%; margin-bottom: 8px;"></div>
            <div class="kb-skeleton" style="height: 20px; width: 60%; margin-bottom: 8px;"></div>
            <div class="kb-skeleton" style="height: 20px; width: 70%; margin-bottom: 8px;"></div>
        `;
    }

    // Load data from GitHub
    if (mergedData.length === 0) {
        try {
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
        } catch (error) {
            console.error('[KB] Error loading data:', error);
        }
    }

    // Filter KB items (include kb/ and articles/)
    KB_STATE.allData = mergedData.filter(item =>
        item.file && (item.file.startsWith('kb/') || item.file.startsWith('articles/'))
    );

    // Build structure
    KB_STATE.structure = buildKBStructureFromData(KB_STATE.allData);
    KB_STATE.flatPages = KB_STATE.allData.map(item => ({
        name: item.title,
        path: item.file,
        downloadUrl: item.download_url,
        content: item.content,
        date: item.date,
        image: item.image
    }));

    buildKBSearchIndex();
    renderKBNavigationTree();

    // Load default content
    loadKBDefault();

    KB_STATE.initialized = true;
}

// === DATA STRUCTURE ===
function buildKBStructureFromData(data) {
    const sections = {};

    for (const item of data) {
        // Remove prefix (kb/ or articles/)
        const cleanPath = item.file.startsWith('kb/') ? item.file.replace('kb/', '') : item.file.replace('articles/', '');
        const parts = cleanPath.split('/');
        let sectionName = 'General';

        if (parts.length > 1) {
            sectionName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
        }

        if (!sections[sectionName]) sections[sectionName] = [];

        sections[sectionName].push({
            name: item.title,
            path: item.file,
            downloadUrl: item.download_url,
            date: item.date
        });
    }

    return Object.entries(sections).map(([name, pages]) => ({ name, pages }));
}

function getKBSectionIdForPath(path) {
    const cleanPath = path.replace(/^kb\//, '').replace(/^articles\//, '');
    const parts = cleanPath.split('/').filter(Boolean);
    let sectionName = 'General';

    if (parts.length > 1) {
        sectionName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }

    return sectionName.replace(/\s+/g, '-').toLowerCase();
}

function setKBActiveSection(path) {
    const sectionId = getKBSectionIdForPath(path);
    KB_STATE.expandedSections = new Set([sectionId]);
}

function buildKBSearchIndex() {
    KB_STATE.searchIndex = KB_STATE.flatPages.map((page, index) => ({
        index,
        name: page.name.toLowerCase(),
        path: page.path,
        content: (page.content || '').toLowerCase()
    }));
}

// === NAVIGATION RENDERING ===
function renderKBNavigationTree() {
    const container = document.getElementById('kb-nav-tree');
    if (!container) return;

    if (KB_STATE.structure.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 1rem; color: #6b7280;">
                <i class="fas fa-folder-open" style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.5;"></i>
                <p style="font-size: 0.75rem;">No documents found</p>
            </div>
        `;
        return;
    }

    let html = '';

    for (const section of KB_STATE.structure) {
        const sectionId = section.name.replace(/\s+/g, '-').toLowerCase();
        const isExpanded = KB_STATE.expandedSections.has(sectionId) || KB_STATE.structure.length === 1;

        if (KB_STATE.structure.length === 1) KB_STATE.expandedSections.add(sectionId);

        html += `
            <div class="kb-nav-group">
                <button class="kb-section-header ${isExpanded ? 'active' : ''}" 
                        onclick="toggleKBSection('${sectionId}')">
                    <span class="section-title">
                        <i class="fas fa-folder${isExpanded ? '-open' : ''}"></i>
                        ${section.name}
                    </span>
                    <i class="fas fa-chevron-right section-arrow"></i>
                </button>
                <div id="kb-section-${sectionId}" class="kb-nav-list ${isExpanded ? 'expanded' : 'collapsed'}">
                    ${renderKBPages(section.pages || [])}
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
    attachKBNavLinkHandlers(container);
}

function renderKBPages(pages) {
    const escapeAttr = (s) => String(s).replace(/[&<>"']/g, (m) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[m]));

    return pages.map(page => {
        const isActive = KB_STATE.currentPath === page.path;
        return `
            <a class="kb-nav-link ${isActive ? 'active' : ''}" 
               data-path="${escapeAttr(page.path)}">
                <span class="dot"></span>
                ${page.name}
            </a>
        `;
    }).join('');
}

function attachKBNavLinkHandlers(container) {
    const links = container.querySelectorAll('.kb-nav-link');
    links.forEach(link => {
        link.addEventListener('click', () => {
            const path = link.dataset.path;
            if (path) loadKBContent(path);
        });
    });
}

function toggleKBSection(sectionId) {
    const section = document.getElementById(`kb-section-${sectionId}`);
    const header = section?.previousElementSibling;
    if (!section || !header) return;

    const isExpanded = section.classList.contains('expanded');
    section.classList.toggle('expanded', !isExpanded);
    section.classList.toggle('collapsed', isExpanded);
    header.classList.toggle('active', !isExpanded);

    const icon = header.querySelector('.fa-folder, .fa-folder-open');
    if (icon) {
        icon.classList.toggle('fa-folder', isExpanded);
        icon.classList.toggle('fa-folder-open', !isExpanded);
    }

    if (isExpanded) KB_STATE.expandedSections.delete(sectionId);
    else KB_STATE.expandedSections.add(sectionId);
}

// === CONTENT LOADING ===
function loadKBDefault() {
    if (KB_STATE.flatPages.length > 0) {
        loadKBContent(KB_STATE.flatPages[0].path);
    } else {
        const body = document.getElementById('kb-markdown-body');
        if (body) {
            body.innerHTML = `
                <h1>Welcome to the Knowledge Base</h1>
                <p>No documents found in the <code>kb/</code> directory.</p>
                <p>Add Markdown files to your GitHub repository's <code>kb/</code> folder.</p>
            `;
        }
    }
}

async function loadKBContent(path) {
    console.log('[KB] Loading content:', path);

    // Show loading with skeleton
    const body = document.getElementById('kb-markdown-body');
    if (body) {
        body.innerHTML = `
            <div class="kb-skeleton" style="height: 32px; width: 50%; margin-bottom: 24px;"></div>
            <div class="kb-skeleton" style="height: 16px; width: 100%; margin-bottom: 8px;"></div>
            <div class="kb-skeleton" style="height: 16px; width: 95%; margin-bottom: 8px;"></div>
            <div class="kb-skeleton" style="height: 16px; width: 90%;"></div>
        `;
    }

    const page = KB_STATE.flatPages.find(p => p.path === path);
    if (!page) {
        showKBError(`Page not found: ${path}`);
        return;
    }

    KB_STATE.currentPath = path;
    setKBActiveSection(path);
    renderKBNavigationTree();

    // Get content
    let content = page.content;
    if (!content && page.downloadUrl) {
        try {
            const response = await fetch(page.downloadUrl);
            if (!response.ok) throw new Error('Failed to fetch');
            content = await response.text();
        } catch (error) {
            console.error('[KB] Error fetching content:', error);
            showKBError(`Failed to load: ${path}`);
            return;
        }
    }

    if (!content) {
        showKBError(`No content available for: ${path}`);
        return;
    }

    // Use View Transitions API if available
    if (document.startViewTransition) {
        document.startViewTransition(() => {
            renderKBContent(content, path);
        });
    } else {
        renderKBContent(content, path);
    }

    updateKBNavHighlight(path);
    document.getElementById('kb-scroll-container')?.scrollTo(0, 0);
    closeMobileKBSidebar();
}

function renderKBContent(markdown, path) {
    const body = document.getElementById('kb-markdown-body');
    if (!body) return;

    // Inline detection (using helpers from ui.js)
    const inlineFlashcards = extractInteractiveData(markdown, 'flashcard');
    const inlineQuiz = extractInteractiveData(markdown, 'quizz');

    // Store interactive data for this file
    window.kbInteractiveData[path] = {
        flashcards: inlineFlashcards,
        quiz: inlineQuiz
    };

    // Clean content (remove interactive blocks and the first H1 if it exists)
    const cleanContent = removeInteractiveBlocks(markdown).replace(/^# .*/m, '');

    // Parse markdown
    if (typeof marked !== 'undefined') {
        body.innerHTML = marked.parse(cleanContent);
    } else {
        body.innerHTML = `<pre style="white-space: pre-wrap;">${cleanContent}</pre>`;
    }

    // Inject interactive buttons if data exists
    if (inlineFlashcards || inlineQuiz) {
        let interactiveHtml = `<div style="display:flex; gap:15px; margin-bottom:30px; flex-wrap:wrap;">`;
        const safePath = path.replace(/'/g, "\\'");

        if (inlineFlashcards) {
            interactiveHtml += `<button class="action-btn btn-flash" onclick="loadFlashcards('inline', '${safePath}')"><i class="fas fa-layer-group"></i> Flashcards</button>`;
        }

        if (inlineQuiz) {
            interactiveHtml += `<button class="action-btn btn-quiz" onclick="loadQuiz('inline', '${safePath}')"><i class="fas fa-graduation-cap"></i> Quiz</button>`;
        }

        interactiveHtml += `</div>`;
        body.insertAdjacentHTML('afterbegin', interactiveHtml);
    }

    enhanceKBContent(body);
    generateKBTableOfContents(body);
    updateKBBreadcrumbs(path);
    updateKBReadingTime(markdown);
    updateKBLastUpdated(path);
    renderKBPagination();
}

// === CONTENT ENHANCEMENT ===
function enhanceKBContent(container) {
    // Copy buttons for code blocks
    container.querySelectorAll('pre').forEach(pre => {
        const copyBtn = document.createElement('button');
        copyBtn.className = 'kb-copy-btn';
        copyBtn.textContent = 'Copy';
        copyBtn.onclick = async () => {
            const code = pre.querySelector('code')?.textContent || pre.textContent;
            await navigator.clipboard.writeText(code);
            copyBtn.textContent = 'Copied!';
            kbShowToast('Copied to clipboard');
            setTimeout(() => copyBtn.textContent = 'Copy', 2000);
        };
        pre.appendChild(copyBtn);
    });

    // Fix image URLs and add lightbox
    container.querySelectorAll('img').forEach(img => {
        const src = img.getAttribute('src');
        if (src && !src.startsWith('http')) {
            img.src = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main/${src}`;
        }
        img.onclick = () => openKBLightbox(img.src);
    });

    // Add anchor links to headings
    container.querySelectorAll('h2, h3').forEach((heading, i) => {
        const id = `kb-section-${i}`;
        heading.id = id;

        const anchor = document.createElement('span');
        anchor.className = 'kb-anchor-link';
        anchor.textContent = '#';
        anchor.onclick = (e) => {
            e.stopPropagation();
            const url = `${window.location.href.split('#')[0]}#${id}`;
            navigator.clipboard.writeText(url);
            kbShowToast('Link copied to clipboard');
        };
        heading.appendChild(anchor);
    });

    // Syntax highlighting
    if (typeof hljs !== 'undefined') {
        container.querySelectorAll('pre code').forEach(block => {
            hljs.highlightElement(block);
        });
    }
}

// === TABLE OF CONTENTS ===
function generateKBTableOfContents(container) {
    const tocList = document.getElementById('kb-toc-list');
    const mobileTocList = document.getElementById('kb-mobile-toc-list');
    const tocTitle = document.getElementById('kb-toc-title');

    const headings = container.querySelectorAll('h1, h2, h3');
    KB_STATE.tocHeadings = Array.from(headings);

    let html = '';
    let firstTitle = 'On This Page';

    const getHeadingText = (heading) => {
        let text = '';
        heading.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
                text += node.textContent;
            } else if (node.nodeType === Node.ELEMENT_NODE && !node.classList.contains('kb-anchor-link')) {
                text += node.innerText || node.textContent || '';
            }
        });
        return text.trim();
    };

    const indentClassFor = (tagName) => {
        if (tagName === 'H2') return 'kb-toc-indent-h2';
        if (tagName === 'H3') return 'kb-toc-indent-h3';
        return '';
    };

    headings.forEach((heading, index) => {
        const id = heading.id || `kb-heading-${index}`;
        heading.id = id;

        if (index === 0 && heading.tagName === 'H1') {
            firstTitle = getHeadingText(heading) || firstTitle;
        }

        const indentClass = indentClassFor(heading.tagName);
        const headingText = getHeadingText(heading);

        html += `
            <li class="toc-item">
                <a class="kb-toc-link ${indentClass}" data-index="${index}" data-id="${id}" onclick="scrollToKBHeading('${id}')">${headingText}</a>
            </li>
        `;
    });

    if (tocList) tocList.innerHTML = html;
    if (mobileTocList) mobileTocList.innerHTML = html;
    if (tocTitle) tocTitle.textContent = firstTitle;
    const mobileTocTitle = document.getElementById('kb-mobile-toc-title');
    if (mobileTocTitle) mobileTocTitle.textContent = firstTitle;

    setTimeout(updateKBTOCActiveState, 50);
}

function scrollToKBHeading(id) {
    const element = document.getElementById(id);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    closeMobileKBToc();
}

function updateKBTOCActiveState() {
    const scrollContainer = document.getElementById('kb-scroll-container');
    const headings = Array.from(document.querySelectorAll('#kb-markdown-body h1, #kb-markdown-body h2, #kb-markdown-body h3'));
    const tocLinks = Array.from(document.querySelectorAll('#kb-toc-list .kb-toc-link'));
    const path = document.getElementById('kb-toc-path');

    if (!scrollContainer || !headings.length || !tocLinks.length || !path) return;

    const containerRect = scrollContainer.getBoundingClientRect();
    const buffer = 10;

    let activeHeadings = headings.filter(h => {
        const rect = h.getBoundingClientRect();
        const relativeTop = rect.top - containerRect.top;
        const relativeBottom = rect.bottom - containerRect.top;
        return (relativeTop < containerRect.height - buffer) && (relativeBottom > buffer);
    });

    if (activeHeadings.length === 0) {
        const scrollPos = scrollContainer.scrollTop;
        for (let i = headings.length - 1; i >= 0; i--) {
            if (headings[i].offsetTop <= scrollPos + 100) {
                activeHeadings.push(headings[i]);
                break;
            }
        }
    }
    if (activeHeadings.length === 0) activeHeadings.push(headings[0]);

    const activeIds = new Set(activeHeadings.map(h => h.id));
    const activeLinks = [];

    tocLinks.forEach(link => {
        const id = link.dataset.id;
        if (id && activeIds.has(id)) {
            link.classList.add('active');
            activeLinks.push(link);
        } else {
            link.classList.remove('active');
        }
    });

    if (activeLinks.length > 0) {
        let d = '';
        let lastIndex = -2;

        activeLinks.forEach(link => {
            const id = link.dataset.id;
            const heading = id ? document.getElementById(id) : null;
            if (!heading) return;

            const linkIndex = tocLinks.indexOf(link);

            let x = -1;
            if (heading.tagName === 'H2') x = 11;
            else if (heading.tagName === 'H3') x = 23;

            const yTop = link.offsetTop;
            const yBottom = yTop + link.offsetHeight;

            if (linkIndex !== lastIndex + 1) {
                d += ` M ${x} ${yTop} L ${x} ${yBottom}`;
            } else {
                d += ` L ${x} ${yTop} L ${x} ${yBottom}`;
            }
            lastIndex = linkIndex;
        });

        path.setAttribute('d', d);
        path.classList.add('active');
    } else {
        path.classList.remove('active');
    }
}

// === UI UPDATES ===
function updateKBBreadcrumbs(path) {
    const container = document.getElementById('kb-breadcrumbs');
    if (!container) return;

    const page = KB_STATE.flatPages.find(p => p.path === path);
    const parts = path.replace('kb/', '').replace('articles/', '').split('/');

    // Build the array of items to display
    // We want: Home, then folders, then the page title
    const pathArray = ['Home'];
    if (parts.length > 1) {
        for (let i = 0; i < parts.length - 1; i++) {
            pathArray.push(parts[i]);
        }
    }
    pathArray.push(page?.name || parts[parts.length - 1]);

    // Function to generate HTML for an item
    const createItem = (text, isLast, isRoot = false) => {
        let classList = isLast ? 'current' : '';
        if (isRoot) classList += ' crumb-root';

        // Navigation logic
        let onclick = '';
        if (isRoot) {
            onclick = `onclick="loadKBDefault()"`;
        } else if (!isLast) {
            // Find the path for this folder (this is a bit tricky with the current flat structure)
            // For now, we'll just make them look like links but they might not navigate perfectly
            // unless we have a way to find the "index" page of a folder.
            // AcidWiki usually just shows them.
        }

        return `<span class="${classList}" ${onclick}>${text}</span>`;
    };

    const separator = `<span class="separator">/</span>`;
    const ellipsis = `<span class="ellipsis-node">...</span>`;

    // 1. TENTATIVE : Afficher tout le chemin
    let html = pathArray.map((item, index) => {
        const isLast = index === pathArray.length - 1;
        const isRoot = index === 0;
        return createItem(item, isLast, isRoot);
    }).join(separator);

    container.innerHTML = html;

    // 2. VÉRIFICATION : Est-ce que ça déborde ?
    if (container.scrollWidth > container.clientWidth && pathArray.length > 2) {
        const rootItem = createItem(pathArray[0], false, true);
        const titleItem = createItem(pathArray[pathArray.length - 1], true);

        // Stratégie : Root > ... > Title
        container.innerHTML = `${rootItem}${separator}${ellipsis}${separator}${titleItem}`;

        // Si même ça c'est trop grand, on enlève le séparateur avant le titre
        if (container.scrollWidth > container.clientWidth) {
            container.innerHTML = `${rootItem}${separator}${ellipsis} ${titleItem}`;
        }
    }
}

// Add resize listener for breadcrumbs
window.addEventListener('resize', () => {
    if (KB_STATE.currentPath) {
        updateKBBreadcrumbs(KB_STATE.currentPath);
    }
});

window.addEventListener('resize', () => {
    updateKBBreadcrumbMetaVisibility(document.getElementById('kb-breadcrumbs'));
});

function updateKBReadingTime(content) {
    const els = document.querySelectorAll('[data-kb-reading-time]');
    if (!els.length) return;

    const words = content.split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    els.forEach(el => {
        el.textContent = `~${minutes} min read`;
    });
    updateKBBreadcrumbMetaVisibility(document.getElementById('kb-breadcrumbs'));
}

function updateKBLastUpdated(path) {
    const els = document.querySelectorAll('[data-kb-last-updated]');
    if (!els.length) return;

    const page = KB_STATE.flatPages.find(p => p.path === path);
    if (page?.date && page.date !== 'Unknown') {
        const date = new Date(page.date);
        if (!isNaN(date.getTime())) {
            els.forEach(el => {
                el.textContent = `Updated ${date.toLocaleDateString()}`;
            });
            updateKBBreadcrumbMetaVisibility(document.getElementById('kb-breadcrumbs'));
            return;
        }
    }
    els.forEach(el => {
        el.textContent = '';
    });
    updateKBBreadcrumbMetaVisibility(document.getElementById('kb-breadcrumbs'));
}

function updateKBNavHighlight(path) {
    document.querySelectorAll('#kb-nav-tree .kb-nav-link').forEach(link => {
        const linkPath = link.dataset.path;
        link.classList.toggle('active', linkPath === path);
    });
}

function renderKBPagination() {
    const pagination = document.getElementById('kb-pagination');
    const prevCard = document.getElementById('kb-prev-page');
    const nextCard = document.getElementById('kb-next-page');

    if (!pagination || !prevCard || !nextCard) return;

    const currentIndex = KB_STATE.flatPages.findIndex(p => p.path === KB_STATE.currentPath);

    if (currentIndex === -1) {
        pagination.style.display = 'none';
        return;
    }

    const prevPage = KB_STATE.flatPages[currentIndex - 1];
    const nextPage = KB_STATE.flatPages[currentIndex + 1];

    if (prevPage) {
        prevCard.style.display = 'block';
        prevCard.querySelector('.title').textContent = prevPage.name;
        prevCard.onclick = () => loadKBContent(prevPage.path);
    } else {
        prevCard.style.display = 'none';
    }

    if (nextPage) {
        nextCard.style.display = 'block';
        nextCard.querySelector('.title').textContent = nextPage.name;
        nextCard.onclick = () => loadKBContent(nextPage.path);
    } else {
        nextCard.style.display = 'none';
    }

    pagination.style.display = (prevPage || nextPage) ? 'grid' : 'none';

    // Update breadcrumb arrows
    updateKBBreadcrumbArrows();
}

function showKBError(message) {
    const body = document.getElementById('kb-markdown-body');
    if (body) {
        body.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: #ef4444;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                <h2>Error</h2>
                <p>${message}</p>
            </div>
        `;
    }
}

// === TOAST NOTIFICATIONS ===
let kbToastTimeout;
function kbShowToast(message) {
    const toast = document.getElementById('kb-toast');
    const msgSpan = document.getElementById('kb-toast-message');

    if (!toast || !msgSpan) return;

    clearTimeout(kbToastTimeout);
    msgSpan.textContent = message;
    toast.classList.add('active');

    kbToastTimeout = setTimeout(() => {
        toast.classList.remove('active');
    }, 3000);
}

// === SEARCH ===
function openKBSearch() {
    const modal = document.getElementById('kb-search-modal');
    const input = document.getElementById('kb-search-input');

    if (modal) {
        modal.classList.add('active');
        input?.focus();
        KB_STATE.searchSelectedIndex = 0;
    }
}

function closeKBSearch() {
    const modal = document.getElementById('kb-search-modal');
    const input = document.getElementById('kb-search-input');

    if (modal) {
        modal.classList.remove('active');
        if (input) input.value = '';
        renderKBSearchResults([]);
    }
}

function handleKBSearchInput(query) {
    if (!query.trim()) {
        renderKBSearchResults([]);
        return;
    }

    const lowerQuery = query.toLowerCase();
    const results = KB_STATE.searchIndex.filter(item =>
        item.name.includes(lowerQuery) ||
        item.path.toLowerCase().includes(lowerQuery) ||
        item.content.includes(lowerQuery)
    ).slice(0, 10);

    KB_STATE.searchSelectedIndex = 0;
    renderKBSearchResults(results, query);
}

function renderKBSearchResults(results, query = '') {
    const container = document.getElementById('kb-search-results');
    const countEl = document.getElementById('kb-search-count');

    if (!container) return;

    if (results.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2.5rem; color: #6b7280; font-size: 0.875rem;">
                ${query ? 'No results found' : 'Type to start searching...'}
            </div>
        `;
        if (countEl) countEl.textContent = '';
        return;
    }

    if (countEl) countEl.textContent = `${results.length} results`;

    container.innerHTML = results.map((result, i) => {
        const page = KB_STATE.flatPages[result.index];
        return `
            <div class="kb-search-result-item ${i === KB_STATE.searchSelectedIndex ? 'active' : ''}" 
                 data-index="${i}"
                 onclick="kbSelectSearchResult(${result.index}, '${query}')">
                <span class="dot" style="width: 6px; height: 6px; border-radius: 50%; background: var(--kb-accent-green); flex-shrink: 0;"></span>
                <div style="min-width: 0;">
                    <div style="font-weight: 600; color: var(--kb-text-heading); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${page.name}</div>
                    <div style="font-size: 0.75rem; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${page.path}</div>
                </div>
            </div>
        `;
    }).join('');
}

function kbSelectSearchResult(pageIndex, query) {
    const page = KB_STATE.flatPages[pageIndex];
    if (page) {
        loadKBContent(page.path);
        closeKBSearch();

        // Highlight search term in content
        if (query) {
            setTimeout(() => kbHighlightAndScroll(query), 300);
        }
    }
}

function handleKBSearchKeydown(e) {
    const results = document.querySelectorAll('.kb-search-result-item');
    if (results.length === 0) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        KB_STATE.searchSelectedIndex = Math.min(KB_STATE.searchSelectedIndex + 1, results.length - 1);
        updateKBSearchSelection(results);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        KB_STATE.searchSelectedIndex = Math.max(KB_STATE.searchSelectedIndex - 1, 0);
        updateKBSearchSelection(results);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        results[KB_STATE.searchSelectedIndex]?.click();
    }
}

function updateKBSearchSelection(results) {
    results.forEach((r, i) => {
        r.classList.toggle('active', i === KB_STATE.searchSelectedIndex);
    });
    results[KB_STATE.searchSelectedIndex]?.scrollIntoView({ block: 'nearest' });
}

// === HIGHLIGHT & SCROLL ===
function kbHighlightAndScroll(query) {
    const body = document.getElementById('kb-markdown-body');
    if (!body || !query) return;

    kbClearHighlights();

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, null, false);
    const textNodes = [];

    while (walker.nextNode()) {
        if (walker.currentNode.nodeValue.toLowerCase().includes(query.toLowerCase())) {
            textNodes.push(walker.currentNode);
        }
    }

    textNodes.forEach(node => {
        const span = document.createElement('span');
        span.innerHTML = node.nodeValue.replace(regex, '<mark class="kb-search-match">$1</mark>');
        node.parentNode.replaceChild(span, node);
    });

    // Scroll to first highlight
    const firstMatch = body.querySelector('.kb-search-match');
    if (firstMatch) {
        firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
        KB_STATE.hasHighlights = true;
        document.getElementById('kb-clear-highlight')?.classList.add('visible');
    }
}

function kbClearHighlights() {
    const body = document.getElementById('kb-markdown-body');
    if (!body) return;

    body.querySelectorAll('mark.kb-search-match').forEach(mark => {
        const parent = mark.parentNode;
        parent.replaceChild(document.createTextNode(mark.textContent), mark);
        parent.normalize();
    });

    KB_STATE.hasHighlights = false;
    document.getElementById('kb-clear-highlight')?.classList.remove('visible');
}

// === LIGHTBOX ===
function openKBLightbox(src) {
    const lightbox = document.getElementById('kb-lightbox');
    const img = document.getElementById('kb-lightbox-img');

    if (lightbox && img) {
        img.src = src;
        lightbox.classList.add('active');
    }
}

function closeKBLightbox() {
    document.getElementById('kb-lightbox')?.classList.remove('active');
}

// === MOBILE SIDEBAR ===
function toggleMobileKBSidebar() {
    const sidebar = document.getElementById('kb-sidebar');
    const overlay = document.getElementById('kb-overlay');
    const closeBtn = document.getElementById('kb-close-sidebar');

    if (sidebar) {
        const isOpen = sidebar.classList.toggle('open');
        overlay?.classList.toggle('active', isOpen);
        if (closeBtn) closeBtn.style.display = isOpen ? 'block' : 'none';
    }
}

function closeMobileKBSidebar() {
    const sidebar = document.getElementById('kb-sidebar');
    const overlay = document.getElementById('kb-overlay');
    const closeBtn = document.getElementById('kb-close-sidebar');

    sidebar?.classList.remove('open');
    overlay?.classList.remove('active');
    if (closeBtn) closeBtn.style.display = 'none';
}

// === MOBILE TOC ===
function toggleMobileKBToc() {
    const toc = document.getElementById('kb-mobile-toc');
    const overlay = document.getElementById('kb-overlay');

    if (toc) {
        const isOpen = toc.classList.toggle('open');
        overlay?.classList.toggle('active', isOpen);
    }
}

function closeMobileKBToc() {
    const toc = document.getElementById('kb-mobile-toc');
    const overlay = document.getElementById('kb-overlay');

    toc?.classList.remove('open');
    overlay?.classList.remove('active');
}

// === SCROLL PROGRESS ===
function updateKBScrollProgress() {
    const scrollContainer = document.getElementById('kb-scroll-container');
    const progressBar = document.getElementById('kb-progress-bar');
    const scrollTopBtn = document.getElementById('kb-scroll-top');

    if (!scrollContainer || !progressBar) return;

    const scrollTop = scrollContainer.scrollTop;
    const scrollHeight = scrollContainer.scrollHeight - scrollContainer.clientHeight;
    const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;

    progressBar.style.width = `${progress}%`;
    scrollTopBtn?.classList.toggle('visible', scrollTop > 200);
}

function scrollKBToTop() {
    document.getElementById('kb-scroll-container')?.scrollTo({ top: 0, behavior: 'smooth' });
}

// === SOCIAL BADGES ===
function renderKBSocialBadges() {
    const container = document.getElementById('kb-social-badges');
    if (!container) return;

    const badges = container.querySelector('.badges');
    if (!badges) return;

    let html = '';

    if (typeof CONFIG !== 'undefined' && CONFIG.social) {
        if (CONFIG.social.github) {
            const repoPath = CONFIG.social.github.replace('https://github.com/', '');
            html += `<a href="${CONFIG.social.github}" target="_blank" rel="noopener">
                <img src="https://img.shields.io/github/stars/${repoPath}?style=for-the-badge&color=22c55e&labelColor=111214" alt="GitHub Stars">
            </a>`;
        }
        if (CONFIG.social.discord) {
            const inviteCode = CONFIG.social.discord.split('/').pop();
            html += `<a href="${CONFIG.social.discord}" target="_blank" rel="noopener">
                <img src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fdiscord.com%2Fapi%2Finvites%2F${inviteCode}%3Fwith_counts%3Dtrue&query=%24.approximate_member_count&logo=discord&logoColor=white&style=for-the-badge&label=COMMUNITY&color=5865F2&labelColor=2A2E35" alt="Discord">
            </a>`;
        }
        if (CONFIG.social.reddit) {
            const subreddit = CONFIG.social.reddit.split('/r/').pop().replace(/\/$/, '');
            html += `<a href="${CONFIG.social.reddit}" target="_blank" rel="noopener">
                <img src="https://img.shields.io/reddit/subreddit-subscribers/${subreddit}?style=for-the-badge&logo=reddit&label=REDDIT&color=FF4500&labelColor=2A2E35&logoColor=white" alt="Reddit">
            </a>`;
        }
    }

    badges.innerHTML = html;
}

// === CHANGELOG ===
async function loadKBChangelog() {
    console.log('[KB] Loading changelog...');

    const body = document.getElementById('kb-markdown-body');
    if (body) {
        body.innerHTML = `
            <h1>Changelog</h1>
            <p style="color: #6b7280;">Fetching GitHub releases...</p>
            <div class="kb-skeleton" style="height: 80px; margin-top: 1rem;"></div>
        `;
    }

    try {
        const repoPath = CONFIG?.social?.github?.replace('https://github.com/', '') || `${GITHUB_USER}/${GITHUB_REPO}`;
        const res = await fetch(`https://api.github.com/repos/${repoPath}/releases?per_page=20`);

        if (!res.ok) throw new Error('Failed to fetch releases');

        const releases = await res.json();

        let html = '<h1>Changelog</h1>';

        if (releases.length === 0) {
            html += '<p style="color: #6b7280;">No releases found.</p>';
        } else {
            releases.forEach(release => {
                const date = new Date(release.published_at).toLocaleDateString();
                html += `
                    <div style="border: 1px solid var(--kb-border-color); border-radius: 8px; padding: 1rem; margin-bottom: 1rem; background: var(--kb-bg-sidebar);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                            <h3 style="margin: 0; color: var(--kb-accent-green);">${release.tag_name}</h3>
                            <span style="font-size: 0.75rem; color: #6b7280;">${date}</span>
                        </div>
                        <div style="font-size: 0.875rem;">${marked.parse(release.body || 'No description')}</div>
                        <a href="${release.html_url}" target="_blank" rel="noopener" style="font-size: 0.75rem; color: var(--kb-accent-green); margin-top: 0.5rem; display: inline-block;">View on GitHub →</a>
                    </div>
                `;
            });
        }

        if (body) body.innerHTML = html;
    } catch (error) {
        console.error('[KB] Error loading changelog:', error);
        if (body) body.innerHTML = '<h1>Changelog</h1><p style="color: #ef4444;">Failed to load releases from GitHub.</p>';
    }
}

// === STICKY BREADCRUMBS ===
function setupKBStickyBreadcrumbs() {
    const container = document.getElementById('kb-breadcrumb-container');
    const scrollContainer = document.getElementById('kb-scroll-container');

    if (!container || !scrollContainer) return;

    const observer = new IntersectionObserver(
        ([entry]) => {
            container.classList.toggle('stuck', !entry.isIntersecting);
        },
        { root: scrollContainer, threshold: [1], rootMargin: '-1px 0px 0px 0px' }
    );

    // Create a sentinel element
    const sentinel = document.createElement('div');
    sentinel.style.height = '1px';
    container.parentNode.insertBefore(sentinel, container);
    observer.observe(sentinel);
}

// === MICRO-INTERACTIONS ===
function setupKBMicroInteractions() {
    document.addEventListener('mousemove', (e) => {
        const elements = document.querySelectorAll(`
            .kb-nav-link, .kb-section-header, .kb-copy-btn, .kb-toc-link,
            .kb-search-result-item, .kb-mobile-toggle, .kb-theme-toggle,
            .kb-pagination-card, .kb-scroll-top-btn, .kb-clear-highlight-btn
        `);

        elements.forEach(el => {
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            el.style.setProperty('--x', `${x}px`);
            el.style.setProperty('--y', `${y}px`);
        });
    });
}

// === EVENT LISTENERS ===
function setupKBEventListeners() {
    // Search trigger
    document.getElementById('kb-search-trigger')?.addEventListener('click', openKBSearch);

    // Search input
    const searchInput = document.getElementById('kb-search-input');
    searchInput?.addEventListener('input', (e) => handleKBSearchInput(e.target.value));
    searchInput?.addEventListener('keydown', handleKBSearchKeydown);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        const kbView = document.getElementById('kb-view');
        if (!kbView || !kbView.classList.contains('active')) return;

        // Cmd/Ctrl + K for search
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            openKBSearch();
        }

        // ESC to close modals
        if (e.key === 'Escape') {
            closeKBSearch();
            closeKBLightbox();
            closeMobileKBSidebar();
            closeMobileKBToc();
        }
    });

    // Mobile toggle
    document.getElementById('kb-mobile-toggle')?.addEventListener('click', toggleMobileKBSidebar);
    document.getElementById('kb-mobile-toc-toggle')?.addEventListener('click', toggleMobileKBToc);

    // Overlay click
    document.getElementById('kb-overlay')?.addEventListener('click', () => {
        closeMobileKBSidebar();
        closeMobileKBToc();
    });

    // Scroll progress + TOC active state
    document.getElementById('kb-scroll-container')?.addEventListener('scroll', () => {
        updateKBScrollProgress();
        updateKBTOCActiveState();
    });

    // Scroll to top button
    document.getElementById('kb-scroll-top')?.addEventListener('click', scrollKBToTop);
}

// === BREADCRUMB NAVIGATION ===
function kbNavigatePrev() {
    const currentIndex = KB_STATE.flatPages.findIndex(p => p.path === KB_STATE.currentPath);
    if (currentIndex > 0) {
        loadKBContent(KB_STATE.flatPages[currentIndex - 1].path);
    }
}

function kbNavigateNext() {
    const currentIndex = KB_STATE.flatPages.findIndex(p => p.path === KB_STATE.currentPath);
    if (currentIndex >= 0 && currentIndex < KB_STATE.flatPages.length - 1) {
        loadKBContent(KB_STATE.flatPages[currentIndex + 1].path);
    }
}


function updateKBBreadcrumbs(path) {
    const container = document.getElementById('kb-breadcrumbs');
    if (!container) return;

    const page = KB_STATE.flatPages.find(p => p.path === path);

    const escapeHTML = (s) => String(s).replace(/[&<>"']/g, (m) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[m]));

    const prettySeg = (seg) => {
        const decoded = decodeURIComponent(seg || '');
        // clean sluggy names a bit
        return decoded
            .replace(/[-_]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    };

    // remove prefix
    const clean = path.replace(/^kb\//, '').replace(/^articles\//, '');
    const parts = clean.split('/').filter(Boolean);

    // Build crumb model: Home + folders + current title
    const crumbs = [];
    crumbs.push({ type: 'root', text: 'Home', isLast: false });

    if (parts.length > 1) {
        for (let i = 0; i < parts.length - 1; i++) {
            crumbs.push({ type: 'folder', text: prettySeg(parts[i]), isLast: false });
        }
    }

    crumbs.push({
        type: 'current',
        text: page?.name || prettySeg(parts[parts.length - 1]),
        isLast: true
    });

    const docTitle = page?.name || prettySeg(parts[parts.length - 1]);
    const tocTitle = document.getElementById('kb-toc-title');
    const mobileTocTitle = document.getElementById('kb-mobile-toc-title');
    if (tocTitle) tocTitle.textContent = docTitle;
    if (mobileTocTitle) mobileTocTitle.textContent = docTitle;

    const iconFor = (type) => {
        if (type === 'root') return `<i class="fas fa-house"></i>`;
        if (type === 'folder') return `<i class="fas fa-folder"></i>`;
        return ``;
    };

    const createItem = (c) => {
        const text = escapeHTML(c.text);
        const classes = ['crumb'];
        if (c.type === 'root') classes.push('crumb-root');
        if (c.type === 'folder') classes.push('crumb-folder');
        if (c.type === 'current') classes.push('crumb-current');

        const onclick = (c.type === 'root') ? `onclick="loadKBDefault()"` : '';
        const title = `title="${text}"`;

        const label = (c.type === 'root') ? '' : `<span class="label">${text}</span>`;

        return `<span class="${classes.join(' ')}" ${onclick} ${title}>
            ${iconFor(c.type)}
            ${label}
        </span>`;
    };

    const separator = `<span class="separator"><i class="fas fa-chevron-right"></i></span>`;
    const ellipsis = `<span class="ellipsis-node"><i class="fas fa-ellipsis-h"></i></span>`;

    // Render full, then clamp if overflow
    container.innerHTML = crumbs.map(createItem).join(separator);

    // Overflow strategy: Home > ... > Current
    if (container.scrollWidth > container.clientWidth && crumbs.length > 2) {
        const rootItem = createItem({ type: 'root', text: crumbs[0].text });
        const currentItem = createItem({ type: 'current', text: crumbs[crumbs.length - 1].text });

        container.innerHTML = `${rootItem}${separator}${ellipsis}${separator}${currentItem}`;

        // If still too wide, compact a bit
        if (container.scrollWidth > container.clientWidth) {
            container.innerHTML = `${rootItem}${separator}${ellipsis} ${currentItem}`;
        }
    }

    updateKBBreadcrumbMetaVisibility(container);
}

function updateKBBreadcrumbMetaVisibility(container) {
    const readingTimeEls = document.querySelectorAll('[data-kb-reading-time]');
    const lastUpdatedEls = document.querySelectorAll('[data-kb-last-updated]');
    if (!readingTimeEls.length && !lastUpdatedEls.length) return;

    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (isMobile) {
        readingTimeEls.forEach(el => { el.style.display = ''; });
        lastUpdatedEls.forEach(el => { el.style.display = ''; });
        return;
    }

    const titleLabel = container.querySelector('.crumb-current .label');
    const isTruncated = titleLabel && titleLabel.scrollWidth > titleLabel.clientWidth + 1;

    readingTimeEls.forEach(el => { el.style.display = isTruncated ? 'none' : ''; });
    lastUpdatedEls.forEach(el => { el.style.display = isTruncated ? 'none' : ''; });
}



// === EXPORTS ===
window.initKB = initKB;
window.loadKBContent = loadKBContent;
window.loadKBDefault = loadKBDefault;
window.loadKBChangelog = loadKBChangelog;
window.toggleKBSection = toggleKBSection;
window.scrollToKBHeading = scrollToKBHeading;
window.scrollKBToTop = scrollKBToTop;
window.openKBSearch = openKBSearch;
window.closeKBSearch = closeKBSearch;
window.kbSelectSearchResult = kbSelectSearchResult;
window.kbHighlightAndScroll = kbHighlightAndScroll;
window.kbClearHighlights = kbClearHighlights;
window.kbShowToast = kbShowToast;
window.openKBLightbox = openKBLightbox;
window.closeKBLightbox = closeKBLightbox;
window.toggleMobileKBSidebar = toggleMobileKBSidebar;
window.closeMobileKBSidebar = closeMobileKBSidebar;
window.toggleMobileKBToc = toggleMobileKBToc;
window.closeMobileKBToc = closeMobileKBToc;
window.kbNavigatePrev = kbNavigatePrev;
window.kbNavigateNext = kbNavigateNext;

function initPortfolio() {
    const data = PORTFOLIO_DATA;
    if (!data) return;

    // --- IDENTITY ---
    const nameEl = document.querySelector('.port-h1');
    if (nameEl) nameEl.textContent = data.identity.name;

    const sysAccessEl = document.querySelector('p[style*="SYSTEM ACCESS"]');
    if (sysAccessEl) sysAccessEl.textContent = `> SYSTEM ACCESS: GRANTED // ID: ${data.identity.id}`;

    const taglineEl = document.querySelector('.tagline');
    if (taglineEl) {
        taglineEl.innerHTML = data.identity.tagline.map((tag, index) => {
            const span = `<span class="highlight-${tag.color}">${tag.text}</span>`;
            return index < data.identity.tagline.length - 1 ? span + ' // ' : span;
        }).join('');
    }

    const bioEl = document.querySelector('p[style*="margin-top: 1.5rem;"]');
    if (bioEl) bioEl.innerHTML = data.identity.bio;

    const photoEl = document.querySelector('.profile-photo');
    if (photoEl) photoEl.src = data.identity.photo;

    // --- CONTACT BUTTONS ---
    const contactBtns = document.querySelector('.contact-btns');
    if (contactBtns) {
        contactBtns.innerHTML = `
            <a href="${CONFIG.social.linkedin}" class="btn-link btn-oxford"><i class="fab fa-linkedin"></i> LinkedIn</a>
            <a href="${CONFIG.social.github}" class="btn-link btn-hack"><i class="fab fa-github"></i> GitHub</a>
            <a href="${CONFIG.social.artstation}" class="btn-link btn-oxford"><i class="fab fa-artstation"></i> ArtStation</a>
        `;
    }

    // --- CAREER JOURNEY ---
    const timeline = document.querySelector('.timeline');
    if (timeline) {
        timeline.innerHTML = data.career.map(item => `
            <div class="timeline-item ${item.type}">
                <div class="role-title">${item.title}</div>
                <span class="company"><i class="${item.icon}"></i> ${item.company}</span>
                <div class="summary">${item.summary}</div>
            </div>
        `).join('');
    }

    // --- SKILLS ---
    const skillsGrid = document.querySelector('.grid-container');
    if (skillsGrid) {
        skillsGrid.innerHTML = data.skills.map(skill => `
            <div class="skill-card border-${skill.color}">
                <div class="skill-content">
                    <h3 style="color:var(--neon-${skill.color})"><i class="${skill.icon}"></i> ${skill.category}</h3>
                    <ul>
                        ${skill.items.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `).join('');
    }

    // --- PROJECTS ---
    const projectsGrid = document.querySelectorAll('.grid-container')[1];
    if (projectsGrid) {
        projectsGrid.innerHTML = data.projects.map(project => `
            <div class="project-card border-${project.color}" onclick="window.open('${project.url}', '_blank')" style="cursor: pointer;">
                <div class="project-content">
                    <span class="project-tag" style="color:var(--neon-${project.color})">// ${project.tag}</span>
                    <h3 style="color:var(--neon-${project.color})"><i class="${project.icon}"></i> ${project.title}</h3>
                    <p>${project.description}</p>
                </div>
            </div>
        `).join('');
    }

    // --- FOOTER ---
    const footerEl = document.querySelector('div[style*="border-top: 1px solid rgba(255,255,255,0.1)"]');
    if (footerEl) footerEl.innerHTML = data.footer;

    // --- BLOG ---
    const blogTitle = document.querySelector('#blog-view .port-h1');
    if (blogTitle) blogTitle.textContent = CONFIG.blog.title;
    const blogSubtitle = document.querySelector('#blog-view p');
    if (blogSubtitle) blogSubtitle.textContent = CONFIG.blog.subtitle;
}

// Initialize portal content as well
function initPortal() {
    const titleEl = document.querySelector('.portal-title');
    if (titleEl) titleEl.textContent = CONFIG.projectSubtitle;

    const subIdentityEl = document.querySelector('.sub-identity');
    if (subIdentityEl) subIdentityEl.textContent = CONFIG.projectName;

    const secretDataEl = document.getElementById('secret-data');
    if (secretDataEl) {
        secretDataEl.innerHTML = `
            <a href="${CONFIG.social.linkedin}" target="_blank" class="cyber-badge">
                <i class="fab fa-linkedin"></i> linkedin_connect
            </a>
            <a href="${CONFIG.social.github}" target="_blank" class="cyber-badge">
                <i class="fab fa-github"></i> git_repo
            </a>
            <a href="${CONFIG.social.github}" target="_blank" class="cyber-badge">
                <i class="fas fa-star"></i> ${CONFIG.social.stats.githubStars}_stars
            </a>
            <a href="${CONFIG.social.reddit}" target="_blank" class="cyber-badge">
                <i class="fab fa-reddit-alien"></i> ${CONFIG.social.stats.redditSub}
            </a>
            <a href="${CONFIG.social.discord}" target="_blank" class="cyber-badge">
                <i class="fab fa-discord"></i> discord_srv
            </a>
        `;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initPortal();
    initPortfolio();
});

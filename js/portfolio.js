/* Rendu de la vue PROFILE a partir de PORTFOLIO_DATA. Le HTML statique de
   index.html est genere depuis ces memes gabarits, il sert de repli quand le
   JS ne tourne pas et pour l indexation. */
const PORTFOLIO_TPL = {
    timelineItem: item => `
            <div class="timeline-item ${item.type}">
                <div class="role-title">${item.title}</div>
                <span class="company"><i class="${item.icon}"></i> ${item.company}</span>
                ${item.period ? `<span class="period">${item.period}</span>` : ''}
                <div class="summary">${item.summary}</div>
            </div>`,

    skillCard: skill => `
            <div class="skill-card border-${skill.color}">
                <div class="skill-content">
                    <h3 style="color:var(--neon-${skill.color})"><i class="${skill.icon}"></i> ${skill.category}</h3>
                    <ul>
                        ${skill.items.map(item => `<li>${item}</li>`).join('\n                        ')}
                    </ul>
                </div>
            </div>`,

    projectCard: project => `
            <div class="project-card border-${project.color}" onclick="window.open('${project.url}', '_blank')" style="cursor: pointer;">
                <div class="project-content">
                    <span class="project-tag" style="color:var(--neon-${project.color})">// ${project.tag}</span>
                    <h3 style="color:var(--neon-${project.color})"><i class="${project.icon}"></i> ${project.title}</h3>
                    <p>${project.description}</p>
                </div>
            </div>`,

    publicationCard: pub => `
            <div class="project-card paper-card border-${pub.color}" onclick="window.open('${pub.url}', '_blank')" style="cursor: pointer;">
                <div class="project-content">
                    <span class="project-tag" style="color:var(--neon-${pub.color})">// ${pub.ref}</span>
                    <h3 style="color:var(--neon-${pub.color})"><i class="fas fa-file-alt"></i> ${pub.title}</h3>
                    <p>${pub.summary}</p>
                    <span class="paper-meta">${pub.meta}</span>
                </div>
            </div>`
};

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
    if (timeline) timeline.innerHTML = data.career.map(PORTFOLIO_TPL.timelineItem).join('');

    // --- SKILLS ---
    const skillsGrid = document.getElementById('portfolio-skills');
    if (skillsGrid) skillsGrid.innerHTML = data.skills.map(PORTFOLIO_TPL.skillCard).join('');

    // --- PROJECTS ---
    const projectsGrid = document.getElementById('portfolio-projects');
    if (projectsGrid) projectsGrid.innerHTML = data.projects.map(PORTFOLIO_TPL.projectCard).join('');

    // --- PUBLICATIONS ---
    const papersGrid = document.getElementById('portfolio-papers');
    if (papersGrid) papersGrid.innerHTML = (data.publications || []).map(PORTFOLIO_TPL.publicationCard).join('');

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
                <i class="fab fa-linkedin"></i> linkedin
            </a>
            <a href="${CONFIG.social.github}" target="_blank" class="cyber-badge">
                <i class="fab fa-github"></i> github_<span id="portal-stars-badge">${CONFIG.social.stats.githubStars}</span>
                <i class="fas fa-star"></i>
            </a>
            <a href="${CONFIG.social.reddit}" target="_blank" class="cyber-badge">
                <i class="fab fa-reddit-alien"></i> reddit_<span id="portal-reddit-badge">${CONFIG.social.stats.redditSub}</span>
            </a>
            <a href="${CONFIG.social.discord}" target="_blank" class="cyber-badge">
                <i class="fab fa-discord"></i> discord_<span id="portal-discord-badge">${CONFIG.social.stats.discordMembers}</span>
            </a>
        `;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initPortal();
    initPortfolio();
});

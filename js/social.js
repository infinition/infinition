/* =========================================================
   BADGES SOCIAUX DU PORTAIL

   Abonnes Reddit et membres Discord. Source de verite :
   data/social.json, produit une fois par jour par
   .github/workflows/site-data.yml via scripts/build-social.mjs.
   Reddit repond 403 a un navigateur, on ne l'appelle donc jamais d'ici.
   Si le JSON manque, les valeurs ecrites dans le HTML restent en place.
   ========================================================= */

const SOCIAL = (() => {
    const DATA_URL = 'data/social.json';

    function apply(id, label, title, statKey) {
        if (!label) return;
        const el = document.getElementById(id);
        if (!el) return;

        el.textContent = label;
        const badge = el.closest('.cyber-badge');
        if (badge && title) badge.title = title;

        /* applyConfig peut rejouer le rendu des badges apres nous, on met
           donc aussi la config a jour pour que le chiffre survive. */
        if (typeof CONFIG !== 'undefined' && CONFIG.social && CONFIG.social.stats) {
            CONFIG.social.stats[statKey] = label;
        }
    }

    async function updateBadges() {
        let data = null;
        try {
            const res = await fetch(DATA_URL, { cache: 'no-cache' });
            if (res.ok) data = await res.json();
        } catch (e) {
            console.warn('social.json unreachable, badges left as is', e);
        }
        if (!data) return;

        const r = data.reddit;
        if (r && r.label) {
            apply('portal-reddit-badge', r.label,
                `${Number(r.subscribers || 0).toLocaleString('en-US')} members on r/${r.subreddit || ''}`,
                'redditSub');
        }

        const d = data.discord;
        if (d && d.label) {
            const online = d.online ? `, ${d.online.toLocaleString('en-US')} online` : '';
            apply('portal-discord-badge', d.label,
                `${Number(d.members || 0).toLocaleString('en-US')} members on the Discord server${online}`,
                'discordMembers');
        }
    }

    return { updateBadges };
})();

/* Meme timing que le badge stars : on passe par load et non DOMContentLoaded,
   index.html rejoue applyConfig en fin de page et ecraserait la valeur. */
window.addEventListener('load', () => SOCIAL.updateBadges());

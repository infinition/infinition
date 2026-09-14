#!/usr/bin/env node
/**
 * Build feed.xml : le flux RSS des textes du site.
 *
 * Pourquoi : la page est une application a fragment, tout est peint par
 * JavaScript depuis les snapshots de data/. Aucun agregateur n'execute de
 * JavaScript, donc Feedly, NetNewsWire ou un lecteur de messagerie ne voient
 * aujourd'hui strictement rien du contenu. Un fichier XML statique est le
 * seul point d'entree lisible sans navigateur.
 *
 * Le flux ne reprend que l'ecrit : articles, knowledge base, bibliotheque et
 * publications. Les depots GitHub ont deja leur flux d'activite et ArtStation
 * le sien, les redupliquer ne ferait que du bruit chez l'abonne.
 *
 * Deux regles tiennent la promesse d'un flux :
 *  - le guid ne change jamais, sinon chaque passage ressort tout en non lu
 *  - la date est celle de parution, jamais celle de la derniere retouche
 *
 * Usage: node scripts/build-feed.mjs [--out feed.xml]
 */

import { readFile, writeFile } from 'node:fs/promises';

const args = process.argv.slice(2);
const argOf = (flag, dflt) => {
    const i = args.indexOf(flag);
    return i !== -1 && args[i + 1] ? args[i + 1] : dflt;
};

const OUT = argOf('--out', 'feed.xml');
/* Le depot s'appelle infinition/infinition, les pages sont donc servies sous
   /infinition/ et non a la racine du domaine github.io. */
const SITE = argOf('--site', 'https://infinition.github.io/infinition/');
const FEED_URL = new URL('feed.xml', SITE).href;
const MAX_ITEMS = Number(argOf('--max', '30'));

const TITLE = 'INFINITION | Data Logs';
const DESCRIPTION = 'Notes de recherche, knowledge base, essais et publications de Fabien Polly.';

async function readJson(path) {
    try {
        return JSON.parse(await readFile(path, 'utf8'));
    } catch {
        return null;
    }
}

/* Le texte des resumes vient de l'extraction PDF et charrie des caracteres
   que XML interdit, notamment U+FFFE en place d'une cesure. Un seul suffit
   a rendre tout le flux illisible pour un agregateur, on les retire. */
const xmlSafe = s => String(s ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '')
    /* Un demi caractere orphelin, coupe par une troncature en amont, est lui
       aussi refuse par XML. Une paire valide doit rester intacte. */
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '')
    .replace(/(^|[^\uD800-\uDBFF])([\uDC00-\uDFFF])/g, '$1');

const esc = s => xmlSafe(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/* Une section CDATA se termine au premier "]]>" rencontre, y compris au
   milieu d'un extrait de code. On coupe la sequence en deux sections. */
const cdata = s => `<![CDATA[${xmlSafe(s).replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;

/* Le slash reste lisible dans un fragment et les identifiants de la
   bibliotheque en contiennent un ("essays/mon-texte"). */
const frag = s => encodeURIComponent(String(s)).replace(/%2F/g, '/');

function rfc822(value) {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d.toUTCString();
}

/** Markdown ramene a du texte courant, pour l'extrait. */
function plain(md) {
    return String(md ?? '')
        .replace(/^---[\s\S]*?---/, '')          /* frontmatter */
        .replace(/```[\s\S]*?```/g, ' ')         /* blocs de code */
        .replace(/`[^`]*`/g, ' ')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')   /* images */
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') /* liens */
        .replace(/<[^>]+>/g, ' ')
        .replace(/^\s{0,3}#{1,6}\s+/gm, '')      /* titres */
        .replace(/^\s{0,3}>\s?/gm, '')           /* citations */
        .replace(/^\s{0,3}[-*+]\s+/gm, '')       /* listes */
        .replace(/[*_~]{1,3}/g, '')
        .replace(/\|/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function excerpt(md, limit = 420) {
    /* Le titre est repris en <title>, le repeter en tete d'extrait ne dit
       rien de plus a l'abonne. */
    const text = plain(String(md ?? '').replace(/^#\s+.*$/m, ''));
    if (text.length <= limit) return text;
    const cut = text.slice(0, limit);
    const space = cut.lastIndexOf(' ');
    return `${(space > limit * 0.6 ? cut.slice(0, space) : cut).trimEnd()}...`;
}

function itemXml(item) {
    const date = rfc822(item.date);
    const image = item.image
        ? `<p><img src="${esc(item.image)}" alt=""></p>`
        : '';
    const html = `${image}<p>${esc(item.summary)}</p>`
        + `<p><a href="${esc(item.link)}">Lire sur infinition.github.io</a></p>`;

    return [
        '        <item>',
        `            <title>${esc(item.title)}</title>`,
        `            <link>${esc(item.link)}</link>`,
        /* Le lien porte un fragment, et plusieurs lecteurs normalisent les
           URL en le supprimant : sans guid propre, tous les textes seraient
           vus comme un seul et meme article. */
        `            <guid isPermaLink="false">${esc(item.guid)}</guid>`,
        date ? `            <pubDate>${date}</pubDate>` : '',
        `            <category>${esc(item.category)}</category>`,
        `            <description>${cdata(item.summary)}</description>`,
        `            <content:encoded>${cdata(html)}</content:encoded>`,
        '        </item>'
    ].filter(Boolean).join('\n');
}

function fromArticles(logs) {
    return (logs?.articles || []).map(a => {
        const isKb = String(a.file || '').startsWith('kb');
        const name = String(a.file || '').split('/').pop();
        return {
            guid: a.id || `article:${a.file}`,
            title: a.title,
            link: `${SITE}#article:${frag(name)}`,
            date: a.date,
            category: isKb ? 'Knowledge Base' : 'Article',
            image: a.image || null,
            summary: excerpt(a.content)
        };
    });
}

function fromLibrary(library) {
    return (library?.shelves || []).flatMap(shelf =>
        (shelf.entries || []).map(e => ({
            guid: `library:${e.id}`,
            title: e.subtitle ? `${e.title} : ${e.subtitle}` : e.title,
            link: `${SITE}#read:${frag(e.id)}`,
            date: e.date,
            category: shelf.label || 'Library',
            image: null,
            summary: excerpt(e.summary || e.subtitle || '')
        })));
}

/* "pending" ne veut pas dire inacheve : le texte est lisible sur le site,
   seule l'annonce arXiv manque encore. Il a donc sa place dans le flux. */
function fromPapers(papers) {
    return (papers?.papers || []).map(p => ({
        guid: `paper:${p.id}`,
        title: p.title,
        link: `${SITE}#paper:${frag(p.id)}`,
        date: p.published || p.updated,
        category: p.status === 'pending' ? 'Preprint' : 'Publication',
        image: p.cover ? new URL(p.cover, SITE).href : null,
        summary: excerpt(p.abstract || p.summary || '')
    }));
}

async function main() {
    const [logs, library, papers] = await Promise.all([
        readJson('data/logs.json'),
        readJson('data/library.json'),
        readJson('data/papers.json')
    ]);

    const items = [...fromArticles(logs), ...fromLibrary(library), ...fromPapers(papers)]
        .filter(i => i.title && i.guid)
        .sort((a, b) => {
            const ta = new Date(a.date).getTime() || 0;
            const tb = new Date(b.date).getTime() || 0;
            return tb - ta;
        })
        .slice(0, MAX_ITEMS);

    if (items.length === 0) throw new Error('no item to publish, refusing to overwrite the feed');

    /* Horodater au run ferait un fichier different a chaque passage de la CI,
       donc un commit quotidien pour rien. La date du texte le plus recent
       suffit et ne bouge que lorsque le flux bouge. */
    const last = rfc822(items[0].date) || new Date().toUTCString();

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
    xmlns:content="http://purl.org/rss/1.0/modules/content/"
    xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
        <title>${esc(TITLE)}</title>
        <link>${esc(SITE)}</link>
        <description>${esc(DESCRIPTION)}</description>
        <language>fr</language>
        <lastBuildDate>${last}</lastBuildDate>
        <atom:link href="${esc(FEED_URL)}" rel="self" type="application/rss+xml"/>
        <image>
            <url>${esc(new URL('img/icon-180.png', SITE).href)}</url>
            <title>${esc(TITLE)}</title>
            <link>${esc(SITE)}</link>
        </image>
${items.map(itemXml).join('\n')}
    </channel>
</rss>
`;

    await writeFile(OUT, xml, 'utf8');
    const counts = items.reduce((acc, i) => ({ ...acc, [i.category]: (acc[i.category] || 0) + 1 }), {});
    console.log(`wrote ${OUT}`);
    console.log(`  ${items.length} items | ${Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(', ')}`);
}

main().catch(err => {
    console.error('feed build failed, previous feed left untouched:', err.message);
    process.exit(1);
});

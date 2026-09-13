#!/usr/bin/env node
/**
 * Build data/papers.json : les publications arXiv de Fabien Polly, servies
 * a la bibliotheque du site (vue PAPERS).
 *
 * Memes principes que build-repos.mjs et build-social.mjs :
 *  - arXiv n est interroge qu ici, jamais par le navigateur du visiteur.
 *    L API repond 429 des qu une adresse tape un peu trop vite, une page
 *    qui appelle a chaque visite tombe en panne au premier pic de trafic.
 *  - Trois sources en cascade, de la plus riche a la plus resistante :
 *      1. l API Atom (resumes complets, decouverte automatique)
 *      2. la page de recherche HTML (renvoie au moins la liste d identifiants)
 *      3. les pages /abs/ID une par une (metadonnees citation_*)
 *  - Une source qui tombe ne casse rien : le snapshot precedent est conserve
 *    et le script sort en erreur plutot que d ecrire une bibliotheque vide.
 *
 * Usage: node scripts/build-papers.mjs [--author "Fabien Polly"]
 *                                      [--query 'au:"Polly_F"']
 *                                      [--out data/papers.json]
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const args = process.argv.slice(2);
const argOf = (flag, dflt) => {
    const i = args.indexOf(flag);
    return i !== -1 && args[i + 1] ? args[i + 1] : dflt;
};

const AUTHOR = argOf('--author', 'Fabien Polly');
const QUERY = argOf('--query', 'au:"Polly_F"');
const OUT = argOf('--out', 'data/papers.json');

const UA = 'infinition-site-papers-builder/1.0 (+https://infinition.github.io)';

/* Le nom d auteur doit matcher pour qu un homonyme ne rentre pas dans la
   bibliotheque. "Polly, Fabien", "Fabien Polly" et "F. Polly" passent. */
const SURNAME = AUTHOR.split(/\s+/).pop().toLowerCase();
const GIVEN = AUTHOR.split(/\s+/)[0].toLowerCase();

/* Nom au format arXiv pour la recherche, "Fabien Polly" -> "Polly, Fabien". */
const SEARCH_NAME = [AUTHOR.split(/\s+/).pop(), ...AUTHOR.split(/\s+/).slice(0, -1)].join(', ');
const SEARCH_URL = `https://arxiv.org/search/?searchtype=author&query=${encodeURIComponent(SEARCH_NAME)}`;

/* Identifiants connus, au cas ou la decouverte automatique ne reponde pas du
   tout. Ils ne sont jamais la seule source : s ils sont deja trouves par
   l API ils ne sont pas refetches. */
const SEED_IDS = ['2607.05300', '2607.06634', '2603.21315'];

/* Preprints qui n ont pas encore d identifiant arXiv public.
 *
 * pdf_source designe le PDF chez son auteur. Il est recopie sous
 * assets/papers pour etre servi par le site : GitHub sert les PDF bruts en
 * application/octet-stream avec X-Frame-Options deny, donc ni affichables
 * dans la liseuse ni rendus par le navigateur.
 *
 * Le titre et le resume sont laissés vides : build-paper-assets.py les lit
 * dans le PDF lui meme, pour que la page ne raconte jamais autre chose que
 * le document. A vider quand l identifiant arXiv arrive, la decouverte
 * automatique prend alors le relais.
 */
const preprint = fields => ({
    version: '',
    authors: [AUTHOR],
    abstract: '',
    comment: '',
    doi: '',
    journal_ref: '',
    pdf_url: '',
    status: 'pending',
    ...fields,
    updated: fields.updated || fields.published
});

const UNPUBLISHED = [
    preprint({
        id: 'drift-bounded-spectral-updates',
        title: 'Drift-Bounded Spectral Updates for Deep Local Learning',
        categories: ['cs.LG'],
        primary_category: 'cs.LG',
        published: '2026-07-01T00:00:00.000Z',
        abs_url: 'https://github.com/infinition/drift-contract',
        pdf_source: 'https://raw.githubusercontent.com/infinition/drift-contract/main/paper/paper.pdf'
    }),
    preprint({
        id: 'digital-abelian-logical-phase-control',
        title: 'Digital Abelian Logical Phase Control in a Correlated-Hopping Ladder',
        categories: ['quant-ph', 'cond-mat.str-el'],
        primary_category: 'quant-ph',
        published: '2026-07-20T00:00:00.000Z',
        abs_url: 'https://github.com/infinition/antler',
        pdf_source: 'https://raw.githubusercontent.com/infinition/antler/main/paper/Digital_Abelian_Logical_Phase_Control_in_a_Correlated_Hopping_Ladder__2_.pdf'
    }),
    preprint({
        id: 'it-from-fix',
        title: 'It from Fix: The Kernel Principle',
        categories: ['gr-qc', 'hep-th'],
        primary_category: 'gr-qc',
        published: '2026-07-15T00:00:00.000Z',
        comment: 'Working note v0.3.0, with toy models, controls and negative results.',
        abs_url: 'https://github.com/infinition/it-from-fix',
        pdf_source: 'https://raw.githubusercontent.com/infinition/it-from-fix/main/paper/v0.3.0/main.pdf'
    })
];

/* Ou sont deposes les PDF recopies et les couvertures. */
const ASSET_DIR = argOf('--assets', 'assets/papers');

const sleep = ms => new Promise(r => setTimeout(r, ms));

/* arXiv sert un 429 "Rate exceeded" sans en tete Retry-After. Trois essais
   espaces suffisent en pratique, au dela c est que l adresse est punie pour
   plus longtemps et il vaut mieux garder le snapshot precedent. */
async function getText(url, attempts = 3) {
    let lastErr = null;
    for (let i = 0; i < attempts; i++) {
        if (i > 0) await sleep(5000 * Math.pow(3, i - 1));
        try {
            const res = await fetch(url, {
                headers: { 'User-Agent': UA, 'Accept': 'application/atom+xml, text/html;q=0.9, */*;q=0.5' }
            });
            if (res.status === 429) {
                lastErr = new Error('HTTP 429 rate exceeded');
                continue;
            }
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.text();
        } catch (e) {
            lastErr = e;
        }
    }
    throw lastErr || new Error('unreachable');
}

function decodeXml(s) {
    return String(s || '')
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#0?39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim();
}

const stripTags = s => String(s || '').replace(/<[^>]+>/g, ' ');

/* "2607.05300v2" donne { id: "2607.05300", version: "v2" } */
function splitVersion(raw) {
    const m = String(raw || '').trim().match(/^(\d{4}\.\d{4,5})(v\d+)?$/);
    if (!m) return { id: String(raw || '').trim(), version: '' };
    return { id: m[1], version: m[2] || '' };
}

function isTargetAuthor(names) {
    return names.some(n => {
        const low = String(n || '').toLowerCase();
        if (!low.includes(SURNAME)) return false;
        return low.includes(GIVEN) || new RegExp(`\\b${GIVEN[0]}\\.?\\b`).test(low);
    });
}

function makePaper(fields) {
    const { id, version } = splitVersion(fields.id);
    const cats = [...new Set((fields.categories || []).filter(Boolean))];
    return {
        id,
        version: version || fields.version || '',
        title: fields.title || '',
        authors: fields.authors || [],
        abstract: fields.abstract || '',
        categories: cats,
        primary_category: fields.primary_category || cats[0] || '',
        published: fields.published || '',
        updated: fields.updated || fields.published || '',
        abs_url: `https://arxiv.org/abs/${id}`,
        pdf_url: `https://arxiv.org/pdf/${id}`,
        comment: fields.comment || '',
        doi: fields.doi || '',
        journal_ref: fields.journal_ref || '',
        status: 'published'
    };
}

/* --- Source 1 : API Atom ------------------------------------------------ */

function parseAtom(xml) {
    const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(m => m[1]);
    const papers = [];

    for (const e of entries) {
        const rawId = (e.match(/<id>\s*https?:\/\/arxiv\.org\/abs\/([^<\s]+)\s*<\/id>/) || [])[1];
        if (!rawId) continue;

        const authors = [...e.matchAll(/<name>([\s\S]*?)<\/name>/g)].map(m => decodeXml(m[1]));
        if (!isTargetAuthor(authors)) continue;

        papers.push(makePaper({
            id: rawId,
            title: decodeXml((e.match(/<title>([\s\S]*?)<\/title>/) || [])[1]),
            authors,
            abstract: decodeXml((e.match(/<summary>([\s\S]*?)<\/summary>/) || [])[1]),
            categories: [...e.matchAll(/<category[^>]*term="([^"]+)"/g)].map(m => m[1]),
            primary_category: (e.match(/<arxiv:primary_category[^>]*term="([^"]+)"/) || [])[1] || '',
            published: decodeXml((e.match(/<published>([\s\S]*?)<\/published>/) || [])[1]),
            updated: decodeXml((e.match(/<updated>([\s\S]*?)<\/updated>/) || [])[1]),
            comment: decodeXml((e.match(/<arxiv:comment[^>]*>([\s\S]*?)<\/arxiv:comment>/) || [])[1]),
            doi: decodeXml((e.match(/<arxiv:doi[^>]*>([\s\S]*?)<\/arxiv:doi>/) || [])[1]),
            journal_ref: decodeXml((e.match(/<arxiv:journal_ref[^>]*>([\s\S]*?)<\/arxiv:journal_ref>/) || [])[1])
        }));
    }
    return papers;
}

async function fromApi(searchQuery) {
    const url = 'https://export.arxiv.org/api/query'
        + `?search_query=${encodeURIComponent(searchQuery)}`
        + '&start=0&max_results=100&sortBy=submittedDate&sortOrder=descending';
    return parseAtom(await getText(url));
}

async function fromApiIds(ids) {
    if (ids.length === 0) return [];
    const url = `https://export.arxiv.org/api/query?id_list=${ids.join(',')}&max_results=${ids.length}`;
    return parseAtom(await getText(url));
}

/* --- Source 2 : page de recherche HTML ---------------------------------- */

/* L API est la premiere bridee, la recherche HTML tient souvent quand elle
   ne repond plus. Elle ne sert qu a decouvrir des identifiants, les
   metadonnees viennent ensuite de /abs/ID. */
async function idsFromSearchPage() {
    const html = await getText(SEARCH_URL);
    const ids = [...html.matchAll(/arxiv\.org\/abs\/(\d{4}\.\d{4,5})/g)].map(m => m[1]);
    return [...new Set(ids)];
}

/* --- Source 3 : page /abs/ID -------------------------------------------- */

async function fromAbsPage(id) {
    const html = await getText(`https://arxiv.org/abs/${id}`);
    const meta = name => decodeXml((html.match(new RegExp(`<meta name="${name}" content="([^"]*)"`)) || [])[1]);
    const metaAll = name => [...html.matchAll(new RegExp(`<meta name="${name}" content="([^"]*)"`, 'g'))].map(m => decodeXml(m[1]));

    const title = meta('citation_title');
    if (!title) throw new Error('no citation_title');

    /* "Polly, Fabien" dans la meta, "Fabien Polly" partout ailleurs. */
    const authors = metaAll('citation_author').map(a => {
        const parts = a.split(',').map(s => s.trim()).filter(Boolean);
        return parts.length === 2 ? `${parts[1]} ${parts[0]}` : a;
    });
    if (!isTargetAuthor(authors)) throw new Error('author mismatch');

    const absBlock = (html.match(/<blockquote class="abstract[^"]*">([\s\S]*?)<\/blockquote>/) || [])[1] || '';
    const abstract = decodeXml(stripTags(absBlock).replace(/^\s*Abstract:?/i, ''));

    const primary = (html.match(/<span class="primary-subject">([^<]+)<\/span>/) || [])[1] || '';
    const subjects = (html.match(/<td class="tablecell subjects">([\s\S]*?)<\/td>/) || [])[1] || '';
    const categories = [...(`${primary} ${subjects}`).matchAll(/\(([a-z-]+(?:\.[A-Za-z-]+)?)\)/g)].map(m => m[1]);

    const date = meta('citation_date');
    const iso = date ? new Date(`${date.replace(/\//g, '-')}T00:00:00Z`).toISOString() : '';

    return makePaper({
        id,
        title,
        authors,
        abstract,
        categories,
        primary_category: categories[0] || '',
        published: iso,
        updated: iso,
        comment: decodeXml(stripTags((html.match(/<td class="tablecell comments[^"]*">([\s\S]*?)<\/td>/) || [])[1] || '')),
        doi: meta('citation_doi'),
        journal_ref: meta('citation_journal_title')
    });
}

/* ----------------------------------------------------------------------- */

async function readPrevious() {
    try {
        return JSON.parse(await readFile(OUT, 'utf8'));
    } catch {
        return null;
    }
}

const prev = await readPrevious();
const found = new Map();

/* Une entree deja connue n est remplacee que par une plus riche : l API et
   la page /abs/ donnent le resume, la decouverte par identifiant seul non. */
const add = p => {
    if (!p || !p.id) return;
    const old = found.get(p.id);
    if (!old || (p.abstract || '').length > (old.abstract || '').length) found.set(p.id, p);
};

let apiWorked = false;
try {
    const viaApi = await fromApi(QUERY);
    viaApi.forEach(add);
    apiWorked = viaApi.length > 0;
    console.log(`api: ${viaApi.length} publication(s)`);
} catch (e) {
    console.warn(`  api indisponible (${e.message})`);
}

let discovered = [];
if (!apiWorked) {
    try {
        discovered = await idsFromSearchPage();
        console.log(`recherche html: ${discovered.length} identifiant(s)`);
    } catch (e) {
        console.warn(`  recherche html indisponible (${e.message})`);
    }
}

/* Les identifiants connus, ceux decouverts par la recherche HTML et ceux du
   snapshot precedent : un papier deja publie sur le site n est jamais perdu. */
const previousIds = ((prev && prev.papers) || [])
    .filter(p => p.status !== 'pending')
    .map(p => p.id);

const missing = [...new Set([...SEED_IDS, ...discovered, ...previousIds])]
    .filter(id => /^\d{4}\.\d{4,5}$/.test(id) && !found.has(id));

if (missing.length > 0) {
    try {
        const viaIds = await fromApiIds(missing);
        viaIds.forEach(add);
        console.log(`api id_list: ${viaIds.length} publication(s)`);
    } catch (e) {
        console.warn(`  api id_list indisponible (${e.message})`);
    }
}

for (const id of missing.filter(i => !found.has(i))) {
    try {
        add(await fromAbsPage(id));
        console.log(`abs/${id}: ok`);
    } catch (e) {
        console.warn(`  abs/${id}: ${e.message}`);
    }
}

/* Un papier connu du snapshot precedent mais introuvable aujourd hui reste
   affiche : arXiv ne depublie pas, c est la collecte qui a echoue. */
for (const p of (prev && prev.papers) || []) {
    if (p.status !== 'pending' && !found.has(p.id)) found.set(p.id, p);
}

/* Recopie le PDF d un preprint sous assets/papers pour que le site le serve
   lui meme. Un echec n est pas fatal : si la copie precedente est encore la,
   elle fait l affaire. */
async function localisePdf(paper) {
    if (!paper.pdf_source) return paper;

    const name = `${paper.id}.pdf`;
    const target = `${ASSET_DIR}/${name}`;

    try {
        const res = await fetch(paper.pdf_source, { headers: { 'User-Agent': UA } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const bytes = Buffer.from(await res.arrayBuffer());
        if (bytes.length < 1024) throw new Error('fichier trop court pour un PDF');

        await mkdir(ASSET_DIR, { recursive: true });
        await writeFile(target, bytes);
        console.log(`${name}: ${Math.round(bytes.length / 1024)} ko`);
        paper.pdf_url = target;
    } catch (e) {
        console.warn(`  ${name}: copie impossible (${e.message})`);
        try {
            await readFile(target);
            paper.pdf_url = target;
            console.log(`  ${name}: copie precedente conservee`);
        } catch {
            paper.pdf_url = '';
        }
    }
    return paper;
}

/* Les couvertures, et pour un preprint son titre et son resume, sont
   produits par build-paper-assets.py qui tourne apres ce script. On les
   reprend du snapshot precedent pour qu ils ne disparaissent pas le jour ou
   ce second passage echoue. */
function carryOver(paper, fields) {
    const old = ((prev && prev.papers) || []).find(p => p.id === paper.id);
    if (!old) return paper;

    for (const field of fields) {
        if (!paper[field] && old[field]) paper[field] = old[field];
    }
    return paper;
}

/* Le resume d un preprint n est repris que s il a bien ete lu dans le PDF.
   Sans ce garde-fou, un texte de depart ecrit a la main dans UNPUBLISHED
   ressusciterait a chaque passage et empecherait sa propre relecture. */
function carryOverPreprint(paper) {
    const old = ((prev && prev.papers) || []).find(p => p.id === paper.id);
    const fields = ['title', 'cover'];

    if (old && old.abstract_source === 'pdf') {
        fields.push('abstract');
        paper.abstract_source = 'pdf';
    }
    return carryOver(paper, fields);
}

const unpublished = await Promise.all(
    UNPUBLISHED.map(p => localisePdf(carryOverPreprint({ ...p })))
);

const papers = [...found.values()]
    .map(p => carryOver(p, ['cover']))
    .concat(unpublished)
    .sort((a, b) => new Date(b.published || 0) - new Date(a.published || 0));

const published = papers.filter(p => p.status === 'published');

if (published.length === 0) {
    console.error('Aucune publication recuperee, rien n est ecrit.');
    process.exit(1);
}

const out = {
    generated_at: new Date().toISOString(),
    author: AUTHOR,
    author_search: SEARCH_URL,
    count: papers.length,
    papers
};

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, `${JSON.stringify(out, null, 2)}\n`, 'utf8');

console.log(`${published.length} publication(s) arXiv, ${papers.length - published.length} preprint(s) sans identifiant`);

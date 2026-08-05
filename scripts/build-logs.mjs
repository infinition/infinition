#!/usr/bin/env node
/**
 * Build data/logs.json : l'index des Data Logs et de la Knowledge Base.
 *
 * Pourquoi : la page listait les articles en tapant l'API GitHub a chaque
 * visite, un appel pour lister chaque dossier plus un appel par fichier
 * pour la date de commit. En anonyme la limite est de soixante appels par
 * heure, donc la liste tombait en panne des qu'il y avait un peu de trafic.
 * Ici tout est resolu une fois, dans le runner.
 *
 * Les articles sont lus sur le disque du checkout, pas via l'API, et les
 * dates viennent de git. Seul ArtStation demande un appel reseau.
 *
 * Tolerance aux pannes :
 *  - un article supprime ou renomme suit simplement l'arborescence du repo
 *  - si ArtStation ne repond pas, la derniere liste connue est conservee
 *  - si aucun article n'est trouve, on n'ecrit rien
 *
 * Usage: node scripts/build-logs.mjs [--out data/logs.json]
 */

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { dirname, join, posix } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

const args = process.argv.slice(2);
const argOf = (flag, dflt) => {
    const i = args.indexOf(flag);
    return i !== -1 && args[i + 1] ? args[i + 1] : dflt;
};

const OUT = argOf('--out', 'data/logs.json');
const USER = argOf('--user', 'infinition');
const REPO = argOf('--repo', 'infinition');
const BRANCH = argOf('--branch', 'main');
const PATHS = ['articles', 'kb'];

const RAW_BASE = `https://raw.githubusercontent.com/${USER}/${REPO}/${BRANCH}`;

async function walk(dir) {
    let out = [];
    let entries;
    try {
        entries = await readdir(dir, { withFileTypes: true });
    } catch {
        return out;
    }
    for (const e of entries) {
        const full = join(dir, e.name);
        if (e.isDirectory()) out = out.concat(await walk(full));
        else if (e.name.toLowerCase().endsWith('.md')) out.push(full.split('\\').join('/'));
    }
    return out;
}

/** Date du dernier commit touchant le fichier, sinon la date frontmatter. */
async function commitDate(path) {
    try {
        const { stdout } = await run('git', ['log', '-1', '--format=%cI', '--', path]);
        const iso = stdout.trim();
        if (iso) return new Date(iso).toISOString();
    } catch { /* pas de git ou fichier non suivi */ }
    return null;
}

/** Premiere image du markdown, ramenee en URL absolue. */
function firstImage(text, filePath) {
    const m = text.match(/!\[.*?\]\((.*?)\)|<img.*?src=["'](.*?)["']/);
    if (!m) return null;

    let url = (m[1] || m[2] || '').trim();
    if (!url || url.startsWith('data:')) return null;
    if (/^https?:\/\//i.test(url)) return url;

    /* Chemin relatif : d'abord au fichier, sinon a la racine du repo. */
    url = url.replace(/^\.\//, '');
    if (url.startsWith('/')) return `${RAW_BASE}${url}`;

    const dir = posix.dirname(filePath.split('\\').join('/'));
    const resolved = posix.normalize(posix.join(dir, url));
    return `${RAW_BASE}/${resolved}`;
}

async function buildArticles() {
    const files = (await Promise.all(PATHS.map(walk))).flat();
    if (files.length === 0) throw new Error('no markdown found in articles/ or kb/, refusing to overwrite');

    return Promise.all(files.map(async path => {
        const text = await readFile(path, 'utf8');
        const title = (text.match(/^# (.*)/m) || [])[1]
            || path.split('/').pop().replace(/\.md$/i, '');

        let date = await commitDate(path);
        if (!date) {
            const inline = (text.match(/(?:\*\*|__)?Date(?:\*\*|__)?:\s*(.*)/i) || [])[1];
            date = inline ? inline.trim() : 'Unknown';
        }

        return {
            id: `log-${path.replace(/[^a-zA-Z0-9]/g, '-')}`,
            type: 'article',
            file: path,
            title: title.trim(),
            date,
            icon: path.startsWith('kb') ? 'fas fa-book-medical' : 'fas fa-file-alt',
            image: firstImage(text, path),
            content: text,
            download_url: `${RAW_BASE}/${path}`
        };
    }));
}

function decodeXml(s) {
    return s
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&')
        .trim();
}

/* Toutes les oeuvres n'ont pas les memes derives : les plus anciennes n'ont
   aucune vignette carree et ArtStation repond 403 au lieu de 404. On essaie
   donc du plus leger au plus lourd et on ne garde qu'une URL qui repond,
   sinon la carte affichait un cadre noir. */
const THUMB_SIZES = ['smaller_square', 'small_square', 'small', 'medium', 'large'];

async function pickThumbnail(rawUrl) {
    if (!rawUrl) return '';
    if (!rawUrl.includes('/large/')) return rawUrl;

    for (const size of THUMB_SIZES) {
        const candidate = rawUrl.replace('/large/', `/${size}/`);
        try {
            const res = await fetch(candidate, { method: 'HEAD' });
            if (res.ok) return candidate;
        } catch { /* on tente la taille suivante */ }
    }
    return rawUrl;
}

/**
 * ArtStation renvoie 403 sur projects.json, autant depuis un serveur que
 * depuis un navigateur, et sans en tete CORS. Le flux RSS, lui, repond.
 * C'est donc lui la source.
 */
async function buildArtworks(previous) {
    try {
        const res = await fetch(`https://www.artstation.com/${USER}.rss`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; infinition-logs-builder)',
                'Accept': 'application/rss+xml, application/xml, text/xml'
            }
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);

        const xml = await res.text();
        const blocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => m[1]);
        if (blocks.length === 0) throw new Error('empty feed');

        const items = await Promise.all(blocks.map(async block => {
            const pick = tag => {
                const m = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
                return m ? decodeXml(m[1]) : '';
            };

            const url = pick('link');
            const html = pick('content:encoded') || pick('description');
            const raw = (html.match(/<img[^>]+src=["']([^"']+)["']/i) || [])[1] || '';

            /* Le premier paragraphe est la description, le reste est le pied
               de page automatique du flux. */
            const firstP = (html.match(/<p>([\s\S]*?)<\/p>/i) || [])[1] || '';
            const content = firstP.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

            const hash = (url.match(/\/artwork\/([A-Za-z0-9_-]+)/) || [])[1] || '';
            const published = pick('pubDate');

            return {
                id: `art-${hash || url}`,
                type: 'artwork',
                file: `art_${hash}.png`,
                title: pick('title').replace(/\s+by\s+[^,]*$/i, '').trim(),
                date: published ? new Date(published).toISOString() : '',
                icon: 'fab fa-artstation',
                image: await pickThumbnail(raw),
                content,
                url
            };
        }));

        const usable = items.filter(a => a.url && a.image);

        if (usable.length === 0) throw new Error('no usable item in the feed');
        return usable;
    } catch (err) {
        console.warn(`artstation failed (${err.message}), keeping the previous list`);
        return previous;
    }
}

async function loadPrevious(path) {
    try {
        return JSON.parse(await readFile(path, 'utf8'));
    } catch {
        return {};
    }
}

async function main() {
    const previous = await loadPrevious(OUT);

    const articles = await buildArticles();
    console.log(`${articles.length} markdown entries`);

    const artworks = await buildArtworks(Array.isArray(previous.artworks) ? previous.artworks : []);
    console.log(`${artworks.length} artstation entries`);

    const payload = {
        generated_at: new Date().toISOString(),
        articles: articles.sort((a, b) => new Date(b.date) - new Date(a.date)),
        artworks
    };

    await mkdir(dirname(OUT), { recursive: true }).catch(() => { });
    await writeFile(OUT, JSON.stringify(payload) + '\n', 'utf8');

    const kb = articles.filter(a => a.file.startsWith('kb')).length;
    console.log(`wrote ${OUT}`);
    console.log(`  articles: ${articles.length - kb} | kb: ${kb} | artworks: ${artworks.length}`);
}

main().catch(err => {
    console.error('build failed, previous data left untouched:', err.message);
    process.exit(1);
});

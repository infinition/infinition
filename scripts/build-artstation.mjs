#!/usr/bin/env node
/**
 * Build data/artstation.json : la galerie ArtStation affichee par la vue ART.
 *
 * Deux sources, dans cet ordre :
 *  1. l instantane produit par scripts/collect-artstation.py, qui passe le
 *     challenge Cloudflare avec curl_cffi et ramene compteurs et images
 *     pleine taille ;
 *  2. le flux RSS public, qui repond toujours mais ne donne ni vues, ni
 *     likes, ni images multiples.
 *
 * Si les deux echouent, le snapshot precedent est conserve tel quel. Le
 * script sort en erreur plutot que d ecrire une galerie vide, comme
 * build-repos.mjs et build-social.mjs.
 *
 * Usage: node scripts/build-artstation.mjs [--user infinition]
 *                                          [--raw .artstation-raw.json]
 *                                          [--out data/artstation.json]
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const args = process.argv.slice(2);
const argOf = (flag, dflt) => {
    const i = args.indexOf(flag);
    return i !== -1 && args[i + 1] ? args[i + 1] : dflt;
};

const USER = argOf('--user', 'infinition');
const RAW = argOf('--raw', '.artstation-raw.json');
const OUT = argOf('--out', 'data/artstation.json');

const UA = 'Mozilla/5.0 (compatible; infinition-artstation-builder)';

/* Les vignettes carrees sont trop petites pour une grille plein ecran et les
   "large" sont lourdes. On vise medium, avec repli sur ce qui repond. */
const CARD_SIZES = ['medium', 'large', 'small'];

function decodeXml(s) {
    return String(s || '')
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#0?39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, '&')
        .trim();
}

const stripTags = s => String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

/* Toutes les oeuvres n ont pas les memes derives : les plus anciennes n ont
   pas toutes les tailles et ArtStation repond 403 au lieu de 404. On essaie
   du plus utile au plus lourd et on ne garde qu une URL qui repond, sinon la
   carte affichait un cadre noir. */
async function pickSize(url) {
    if (!url) return '';
    const known = url.match(/\/(micro_square|smaller_square|small_square|small|medium|large|original)\//);
    if (!known) return url;

    for (const size of CARD_SIZES) {
        const candidate = url.replace(known[0], `/${size}/`);
        try {
            const res = await fetch(candidate, { method: 'HEAD', headers: { 'User-Agent': UA } });
            if (res.ok) return candidate;
        } catch { /* on tente la taille suivante */ }
    }
    return url;
}

function makeArtwork(fields) {
    return {
        id: fields.hash_id || fields.id || '',
        hash_id: fields.hash_id || '',
        title: fields.title || 'Untitled',
        description: fields.description || '',
        published_at: fields.published_at || '',
        url: fields.url || '',
        thumb_url: fields.thumb_url || '',
        cover_url: fields.cover_url || fields.thumb_url || '',
        image_url: fields.image_url || fields.cover_url || '',
        width: fields.width || 0,
        height: fields.height || 0,
        likes_count: fields.likes_count || 0,
        views_count: fields.views_count || 0,
        tags: fields.tags || [],
        software: fields.software || [],
        images: fields.images || []
    };
}

/* --- Source 1 : instantane du collecteur Python ------------------------- */

async function fromSnapshot() {
    const raw = JSON.parse(await readFile(RAW, 'utf8'));
    if (!raw || !Array.isArray(raw.projects) || raw.projects.length === 0) {
        throw new Error('instantane vide');
    }

    const artworks = await Promise.all(raw.projects.map(async p => makeArtwork({
        hash_id: p.hash_id,
        id: p.id,
        title: p.title,
        description: p.description,
        published_at: p.published_at ? new Date(p.published_at).toISOString() : '',
        url: p.permalink,
        thumb_url: p.thumb_url,
        cover_url: await pickSize(p.cover_url || p.image_url),
        image_url: p.image_url,
        width: p.width,
        height: p.height,
        likes_count: p.likes_count,
        views_count: p.views_count,
        tags: p.tags,
        software: p.software,
        images: (p.images || []).map(img => ({
            url: img.url,
            width: img.width || 0,
            height: img.height || 0
        }))
    })));

    return { profile: raw.profile, artworks, source: 'api' };
}

/* --- Source 2 : flux RSS public ----------------------------------------- */

/* Les endpoints .json repondent 403 sans empreinte TLS de navigateur, le flux
   RSS lui repond toujours. Il ne porte ni compteur ni image secondaire, la
   galerie tourne alors en mode degrade mais elle tourne. */
async function fromRss() {
    const res = await fetch(`https://www.artstation.com/${USER}.rss`, {
        headers: { 'User-Agent': UA, 'Accept': 'application/rss+xml, application/xml, text/xml' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const xml = await res.text();
    const blocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => m[1]);
    if (blocks.length === 0) throw new Error('flux vide');

    const artworks = await Promise.all(blocks.map(async block => {
        const pick = tag => {
            const m = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
            return m ? decodeXml(m[1]) : '';
        };

        const url = pick('link');
        const html = pick('content:encoded') || pick('description');
        const image = (html.match(/<img[^>]+src=["']([^"']+)["']/i) || [])[1] || '';

        /* Le premier paragraphe est la description, le reste est le pied de
           page automatique du flux. */
        const firstP = (html.match(/<p>([\s\S]*?)<\/p>/i) || [])[1] || '';
        const hash = (url.match(/\/artwork\/([A-Za-z0-9_-]+)/) || [])[1] || '';
        const published = pick('pubDate');
        const cover = await pickSize(image);

        return makeArtwork({
            hash_id: hash,
            title: pick('title').replace(/\s+by\s+[^,]*$/i, '').trim(),
            description: stripTags(firstP),
            published_at: published ? new Date(published).toISOString() : '',
            url,
            thumb_url: image,
            cover_url: cover,
            image_url: image,
            images: cover ? [{ url: cover, width: 0, height: 0 }] : []
        });
    }));

    const usable = artworks.filter(a => a.url && a.cover_url);
    if (usable.length === 0) throw new Error('aucune oeuvre exploitable');

    return { profile: null, artworks: usable, source: 'rss' };
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

let result = null;
try {
    result = await fromSnapshot();
    console.log(`instantane: ${result.artworks.length} creation(s)`);
} catch (e) {
    console.warn(`  instantane indisponible (${e.message}), passage par le flux RSS`);
    try {
        result = await fromRss();
        console.log(`rss: ${result.artworks.length} creation(s)`);
    } catch (err) {
        console.warn(`  rss indisponible (${err.message})`);
    }
}

const previousArtworks = (prev && Array.isArray(prev.artworks)) ? prev.artworks : [];

if (!result && previousArtworks.length > 0) {
    console.warn('  aucune source disponible, le snapshot precedent est conserve');
    result = { profile: prev.profile, artworks: previousArtworks, source: prev.source || 'cache' };
}

if (!result) {
    console.error('Aucune creation ArtStation recuperee, rien n est ecrit.');
    process.exit(1);
}

/**
 * Fusion avec le snapshot precedent.
 *
 * Cloudflare refuse les adresses des runners GitHub : en pratique le
 * collecteur ne passe que depuis un poste, et l integration continue tourne
 * au flux RSS. Or le RSS ne porte ni like, ni vue, ni image secondaire, et il
 * est tronque aux dernieres publications. Le laisser remplacer un snapshot
 * collecte par l API revenait a effacer tous les compteurs a chaque passage
 * quotidien, et a perdre les creations sorties du flux.
 *
 * Regle : l API fait autorite et remplace tout. Le RSS, lui, n ajoute que ce
 * qu il apporte vraiment, les creations encore inconnues. Tout ce qui est
 * deja connu garde ce que la derniere collecte complete avait ramene.
 */
function mergeWithPrevious(fresh, source) {
    if (source === 'api' || previousArtworks.length === 0) return fresh;

    const known = new Map(previousArtworks.map(a => [a.id, a]));
    let added = 0;

    for (const art of fresh) {
        if (known.has(art.id)) continue;
        known.set(art.id, art);
        added += 1;
    }

    console.log(`rss: ${added} nouvelle(s) creation(s), `
        + `${previousArtworks.length} conservee(s) du snapshot precedent`);

    return [...known.values()];
}

const merged = mergeWithPrevious(result.artworks, result.source);

/* Une galerie servie par le RSS mais adossee a une collecte complete n est
   pas dans le meme etat qu une galerie qui n a jamais vu l API : le champ le
   dit, la page sait alors que les compteurs sont ceux de la derniere
   collecte et non ceux du jour. */
const source = (result.source === 'rss' && previousArtworks.length > 0)
    ? 'rss+cache'
    : result.source;

/* Le flux RSS ne porte pas le profil. Plutot que d afficher des compteurs a
   zero, on garde ceux du dernier passage reussi du collecteur. */
const profile = result.profile || (prev && prev.profile) || {
    username: USER,
    full_name: '',
    headline: '',
    location: '',
    avatar_url: '',
    profile_url: `https://www.artstation.com/${USER}`,
    followers_count: 0,
    following_count: 0,
    projects_count: result.artworks.length,
    skills: [],
    software: []
};

const artworks = merged
    .slice()
    .sort((a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0));

const out = {
    generated_at: new Date().toISOString(),
    source,
    username: USER,
    profile,
    totals: {
        artworks: artworks.length,
        likes: artworks.reduce((n, a) => n + (a.likes_count || 0), 0),
        views: artworks.reduce((n, a) => n + (a.views_count || 0), 0),
        followers: profile.followers_count || 0
    },
    artworks
};

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, `${JSON.stringify(out, null, 2)}\n`, 'utf8');

console.log(`${out.totals.artworks} creations, ${out.totals.likes} likes, `
    + `${out.totals.views} vues, ${out.totals.followers} abonnes (source ${out.source})`);

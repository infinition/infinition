#!/usr/bin/env node
/**
 * Build data/showcase.json : les objets 3D publies sur Fab et les
 * publications Instagram, pour les faire remonter dans les Data Logs.
 *
 * Pourquoi un navigateur et pas un simple fetch :
 *  - Fab est derriere Cloudflare et renvoie 403 a toute requete serveur,
 *    y compris sur son sitemap. Depuis une vraie page, son API interne
 *    /i/listings/search repond parfaitement.
 *  - Instagram ne sert qu'une coquille JavaScript, le HTML brut ne
 *    contient aucune publication.
 *
 * Les vignettes Instagram sont signees et expirent en quelques jours, elles
 * sont donc recopiees dans img/instagram/ et servies par le site. Celles de
 * Fab sont des URLs stables, on les laisse chez eux.
 *
 * Tolerance aux pannes :
 *  - chaque source est independante, si l'une echoue l'autre passe quand meme
 *  - une source en echec conserve sa derniere liste connue
 *  - une publication deja miroitee n'est jamais retelechargee
 *  - les vignettes des publications supprimees sont nettoyees
 *  - si les deux sources echouent et qu'il n'y a rien en cache, on n'ecrit pas
 *
 * Usage: node scripts/build-showcase.mjs [--out data/showcase.json]
 */

import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const argOf = (flag, dflt) => {
    const i = args.indexOf(flag);
    return i !== -1 && args[i + 1] ? args[i + 1] : dflt;
};

const OUT = argOf('--out', 'data/showcase.json');
const FAB_SELLER = argOf('--fab', 'infinition');
const IG_USER = argOf('--instagram', 'fabien_polly');
const IG_DIR = argOf('--instagram-dir', 'img/instagram');
const NAV_TIMEOUT = 45000;

const sleep = ms => new Promise(r => setTimeout(r, ms));

/* Fab et Instagram traitent differemment un navigateur de bureau et une IP
   de datacenter. Quand ca coince, on veut voir la page reellement servie. */
async function describePage(page, label) {
    try {
        const info = await page.evaluate(() => ({
            url: location.href,
            title: document.title,
            text: (document.body ? document.body.innerText : '').replace(/\s+/g, ' ').slice(0, 300)
        }));
        console.warn(`  [${label}] url=${info.url}`);
        console.warn(`  [${label}] title=${info.title}`);
        console.warn(`  [${label}] body=${info.text}`);
    } catch (err) {
        console.warn(`  [${label}] could not describe the page: ${err.message}`);
    }
}

async function loadPrevious(path) {
    try {
        return JSON.parse(await readFile(path, 'utf8'));
    } catch {
        return {};
    }
}

/* ---------------- FAB ---------------- */

async function buildFab(context, previous) {
    const page = await context.newPage();
    try {
        await page.goto(`https://www.fab.com/sellers/${FAB_SELLER}`, {
            waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT
        });
        /* La page doit finir de s'initialiser pour que l'appel interne passe. */
        await page.waitForSelector('a[href*="/listings/"]', { timeout: NAV_TIMEOUT });

        const listings = await page.evaluate(async seller => {
            const res = await fetch(`/i/listings/search?seller=${encodeURIComponent(seller)}&count=100&sort_by=-createdAt`, {
                headers: { Accept: 'application/json' }
            });
            if (!res.ok) throw new Error('listings HTTP ' + res.status);
            const json = await res.json();
            return json.results || [];
        }, FAB_SELLER);

        if (!listings.length) throw new Error('no listing returned');

        return listings.map(l => {
            const thumb = (l.thumbnails || [])[0] || {};
            const media = thumb.mediaUrl || (thumb.mediaUrls || [])[0] || '';
            const price = l.isFree ? 'Free' : (l.startingPrice && l.startingPrice.price != null
                ? `$${l.startingPrice.price}` : '');
            const bits = [l.listingType, price].filter(Boolean).join(' // ');

            return {
                id: `fab-${l.uid}`,
                type: 'fab',
                title: l.title,
                date: l.publishedAt || '',
                icon: 'fas fa-cube',
                image: media,
                content: bits,
                url: `https://www.fab.com/listings/${l.uid}`,
                category: (l.category && l.category.name) || null,
                rating: l.averageRating || null,
                reviews: l.reviewCount || 0
            };
        });
    } catch (err) {
        console.warn(`fab failed (${err.message}), keeping the previous list`);
        await describePage(page, 'fab');
        return previous;
    } finally {
        await page.close().catch(() => { });
    }
}

/* ---------------- INSTAGRAM ---------------- */

const MONTHS = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
};

/** Le alt des vignettes porte la date : "Photo by X on September 14, 2025." */
function dateFromAlt(alt) {
    const m = (alt || '').match(/on\s+([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})/);
    if (!m) return null;
    const month = MONTHS[m[1].toLowerCase()];
    if (month === undefined) return null;
    return new Date(Date.UTC(Number(m[3]), month, Number(m[2]))).toISOString();
}

async function buildInstagram(context, previous) {
    const page = await context.newPage();
    try {
        await page.goto(`https://www.instagram.com/${IG_USER}/`, {
            waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT
        });
        await page.waitForSelector('a[href*="/p/"], a[href*="/reel/"]', { timeout: NAV_TIMEOUT });
        await sleep(2500); // laisse les vignettes se charger

        const posts = await page.evaluate(() => {
            const seen = new Set();
            const out = [];
            for (const a of document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]')) {
                const href = a.getAttribute('href') || '';
                const m = href.match(/\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
                if (!m || seen.has(m[1])) continue;
                seen.add(m[1]);

                const img = a.querySelector('img');
                out.push({
                    code: m[1],
                    isReel: href.includes('/reel/'),
                    src: img ? img.src : '',
                    alt: img ? img.alt : ''
                });
            }
            return out;
        });

        if (!posts.length) throw new Error('no post found, the page is probably gated');

        await mkdir(IG_DIR, { recursive: true }).catch(() => { });
        const byCode = new Map((previous || []).map(p => [p.code, p]));
        const results = [];

        for (const post of posts) {
            const prev = byCode.get(post.code);
            const file = join(IG_DIR, `${post.code}.jpg`).split('\\').join('/');

            /* Deja miroitee : on ne retelecharge rien. */
            if (prev && existsSync(file)) {
                results.push({ ...prev, image: file });
                continue;
            }

            if (!post.src) {
                console.warn(`  no thumbnail for ${post.code}`);
                continue;
            }

            try {
                /* Le telechargement passe par le contexte du navigateur : les
                   URLs sont signees et refusent les clients inconnus. */
                const buffer = await page.evaluate(async src => {
                    const res = await fetch(src);
                    const blob = await res.blob();
                    const bytes = new Uint8Array(await blob.arrayBuffer());
                    return Array.from(bytes);
                }, post.src);

                await writeFile(file, Buffer.from(buffer));
            } catch (err) {
                console.warn(`  thumbnail failed for ${post.code}: ${err.message}`);
                continue;
            }

            const date = dateFromAlt(post.alt) || (prev && prev.date) || new Date().toISOString();
            const caption = (post.alt || '')
                .replace(/^Photo by .*? on .*?\.\s*/i, '')
                .replace(/May be an image of/i, 'Image of')
                .trim();

            results.push({
                code: post.code,
                id: `ig-${post.code}`,
                type: 'instagram',
                title: post.isReel ? 'Reel' : 'Post',
                date,
                icon: 'fab fa-instagram',
                image: file,
                content: caption,
                url: `https://www.instagram.com/${post.isReel ? 'reel' : 'p'}/${post.code}/`
            });
        }

        if (!results.length) throw new Error('nothing could be mirrored');

        /* Nettoyage des vignettes devenues orphelines. */
        const keep = new Set(results.map(r => `${r.code}.jpg`));
        try {
            for (const name of await readdir(IG_DIR)) {
                if (name.endsWith('.jpg') && !keep.has(name)) {
                    await unlink(join(IG_DIR, name));
                    console.log(`  pruned ${name}`);
                }
            }
        } catch { /* dossier absent, rien a nettoyer */ }

        return results.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (err) {
        console.warn(`instagram failed (${err.message}), keeping the previous list`);
        await describePage(page, 'instagram');
        return previous;
    } finally {
        await page.close().catch(() => { });
    }
}

/* ---------------- MAIN ---------------- */

async function main() {
    const previous = await loadPrevious(OUT);

    const browser = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });
    const context = await browser.newContext({
        locale: 'en-US',
        timezoneId: 'UTC',
        viewport: { width: 1400, height: 1000 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
    });

    let fab = [], instagram = [];
    try {
        fab = await buildFab(context, Array.isArray(previous.fab) ? previous.fab : []);
        console.log(`${fab.length} fab listings`);

        instagram = await buildInstagram(context, Array.isArray(previous.instagram) ? previous.instagram : []);
        console.log(`${instagram.length} instagram posts`);
    } finally {
        await context.close().catch(() => { });
        await browser.close().catch(() => { });
    }

    if (fab.length === 0 && instagram.length === 0) {
        const hadSomething = (previous.fab || []).length || (previous.instagram || []).length;
        if (hadSomething) {
            /* Cas courant depuis une IP de datacenter : Cloudflare sert un
               controle anti robot sur Fab et Instagram redirige vers sa page
               de connexion. On ne touche a rien et on sort proprement. */
            console.warn('les deux sources sont injoignables, le snapshot precedent est conserve');
            return;
        }
        throw new Error('both sources are empty and there is nothing to keep');
    }

    const payload = {
        generated_at: new Date().toISOString(),
        fab_seller: FAB_SELLER,
        instagram_user: IG_USER,
        fab,
        instagram
    };

    await mkdir(dirname(OUT), { recursive: true }).catch(() => { });
    await writeFile(OUT, JSON.stringify(payload, null, 2) + '\n', 'utf8');

    console.log(`wrote ${OUT}`);
    console.log(`  fab: ${fab.length} | instagram: ${instagram.length}`);
}

main().catch(err => {
    console.error('build failed, previous data left untouched:', err.message);
    process.exit(1);
});

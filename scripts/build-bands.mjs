#!/usr/bin/env node
/**
 * Build data/bands.json for the Audio Frequency page.
 *
 * Pourquoi ce script existe : l'API iTunes bride a une vingtaine d'appels
 * par minute et renvoie 403 ensuite. Avec plus de cent groupes, le
 * navigateur ne peut pas resoudre la liste, la grille restait vide.
 * On resout donc les pochettes ici, une fois, tranquillement, et la page
 * ne fait plus qu'un seul fetch sur un fichier local.
 *
 * Tolerance aux pannes :
 *  - une entree deja connue et fraiche n'est pas redemandee, donc un run
 *    quotidien ne consomme quasiment rien
 *  - un 403 declenche une attente puis un nouvel essai
 *  - un groupe introuvable garde sa derniere pochette connue
 *  - un groupe retire de bands.md disparait du JSON
 *  - si bands.md est vide ou illisible, on n'ecrit rien
 *
 * Usage: node scripts/build-bands.mjs [--in bands/bands.md] [--out data/bands.json]
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const args = process.argv.slice(2);
const argOf = (flag, dflt) => {
    const i = args.indexOf(flag);
    return i !== -1 && args[i + 1] ? args[i + 1] : dflt;
};

const IN = argOf('--in', 'bands/bands.md');
const OUT = argOf('--out', 'data/bands.json');
const REFRESH_DAYS = Number(argOf('--refresh-days', '14'));
/* iTunes tolere une vingtaine d'appels par minute, on reste dessous. */
const DELAY_MS = Number(argOf('--delay', '3500'));
/* Plafond d'appels par run : la resolution s'etale sur plusieurs passages
   au lieu de se faire jeter par iTunes. */
const MAX_FETCHES = Number(argOf('--max-fetches', '45'));
const THROTTLE_STREAK = Number(argOf('--throttle-streak', '4'));

const sleep = ms => new Promise(r => setTimeout(r, ms));
const key = s => s.trim().toLowerCase();

async function readBands(path) {
    const text = await readFile(path, 'utf8');
    const list = text.split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0 && !l.startsWith('#'));
    if (list.length === 0) throw new Error(`${path} is empty, refusing to overwrite`);
    return [...new Set(list)];
}

async function loadPrevious(path) {
    try {
        const parsed = JSON.parse(await readFile(path, 'utf8'));
        const list = Array.isArray(parsed) ? parsed : parsed.bands || [];
        return new Map(list.map(b => [key(b.band), b]));
    } catch {
        return new Map();
    }
}

class Throttled extends Error { }

async function lookup(band, retries = 2) {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(band)}&entity=album&limit=5`;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const res = await fetch(url, { headers: { 'User-Agent': 'infinition-bands-builder' } });

            if (res.status === 403 || res.status === 429) {
                if (attempt === retries) throw new Throttled('rate limited');
                const wait = 15000 * (attempt + 1);
                console.warn(`  throttled on ${band}, waiting ${wait / 1000}s`);
                await sleep(wait);
                continue;
            }
            if (!res.ok) throw new Error('HTTP ' + res.status);

            /* iTunes repond en text/javascript, d'ou le parse manuel. */
            const data = JSON.parse(await res.text());
            if (!data.results || data.results.length === 0) return null;

            const needle = key(band);
            const album = data.results.find(a => (a.artistName || '').toLowerCase().includes(needle)) || data.results[0];

            return {
                band,
                artist: album.artistName || band,
                image: album.artworkUrl100 ? album.artworkUrl100.replace('100x100bb', '600x600bb') : null,
                url: album.artistViewUrl || album.collectionViewUrl || '',
                genre: album.primaryGenreName || null
            };
        } catch (err) {
            if (attempt === retries) throw err;
            await sleep(3000 * (attempt + 1));
        }
    }
    throw new Error('exhausted retries');
}

async function main() {
    const bands = await readBands(IN);
    const previous = await loadPrevious(OUT);
    console.log(`${bands.length} bands listed, ${previous.size} known`);

    const now = new Date();
    const cutoff = now.getTime() - REFRESH_DAYS * 86400000;

    const out = [];
    let fetched = 0, reused = 0, kept = 0, failed = 0;
    let streak = 0, budget = MAX_FETCHES, stopped = false;

    for (const band of bands) {
        const prev = previous.get(key(band));
        const checked = prev ? Date.parse(prev.checked_at || 0) : NaN;

        /* Entree fraiche : on ne redemande pas, l'API reste tranquille. */
        if (prev && prev.image && Number.isFinite(checked) && checked > cutoff) {
            out.push(prev);
            reused++;
            continue;
        }

        /* Disjoncteur : iTunes bride dur. Plutot que d'insister pendant des
           heures, on garde ce qu'on sait deja et le prochain run terminera.
           Idem pour le budget d'appels : la resolution est incrementale. */
        if (stopped || budget <= 0) {
            if (prev && prev.image) { out.push(prev); kept++; }
            continue;
        }

        budget--;

        try {
            const found = await lookup(band);
            streak = 0;

            if (found && found.image) {
                out.push({ ...found, checked_at: now.toISOString() });
                fetched++;
            } else if (prev && prev.image) {
                /* Introuvable aujourd'hui : la derniere pochette connue reste. */
                out.push({ ...prev, checked_at: now.toISOString(), stale: true });
                kept++;
            } else {
                console.warn(`  no result: ${band}`);
                failed++;
            }
        } catch (err) {
            if (err instanceof Throttled) {
                streak++;
                if (streak >= THROTTLE_STREAK) {
                    stopped = true;
                    console.warn(`  throttled ${streak} times in a row, stopping lookups for this run`);
                }
            } else {
                streak = 0;
            }

            if (prev && prev.image) {
                out.push({ ...prev, checked_at: prev.checked_at, stale: true });
                kept++;
                console.warn(`  failed, keeping previous: ${band} (${err.message})`);
            } else {
                failed++;
                console.warn(`  failed: ${band} (${err.message})`);
            }
        }

        await sleep(DELAY_MS);
    }

    if (out.length === 0) throw new Error('nothing resolved, refusing to overwrite');

    const payload = {
        generated_at: now.toISOString(),
        count: out.length,
        listed: bands.length,
        bands: out
    };

    await mkdir(dirname(OUT), { recursive: true }).catch(() => { });
    await writeFile(OUT, JSON.stringify(payload, null, 2) + '\n', 'utf8');

    console.log(`wrote ${OUT}`);
    console.log(`  resolved: ${out.length}/${bands.length} | fetched: ${fetched} | reused: ${reused} | kept stale: ${kept} | failed: ${failed}`);
}

main().catch(err => {
    console.error('build failed, previous data left untouched:', err.message);
    process.exit(1);
});

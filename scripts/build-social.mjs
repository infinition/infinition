#!/usr/bin/env node
/**
 * Build data/social.json : le nombre d'abonnes Reddit et de membres Discord
 * affiches sur les badges du portail.
 *
 * Principes, les memes que build-repos.mjs :
 *  - Les API externes ne sont tapees qu'ici, jamais par le navigateur du
 *    visiteur. Reddit repond 403 aux requetes de navigateur, et Discord
 *    n'a aucune raison d'etre appele a chaque visite.
 *  - Une source qui tombe ne casse rien : on garde la valeur precedente.
 *  - Si une valeur n'a jamais pu etre lue, le script sort en erreur et le
 *    workflow ne commite pas de fichier a moitie vide.
 *
 * Usage: node scripts/build-social.mjs [--sub Bjorn_CyberViking]
 *                                      [--invite B3ZH9taVfT]
 *                                      [--out data/social.json]
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const args = process.argv.slice(2);
const argOf = (flag, dflt) => {
    const i = args.indexOf(flag);
    return i !== -1 && args[i + 1] ? args[i + 1] : dflt;
};

const SUB = argOf('--sub', 'Bjorn_CyberViking');
const INVITE = argOf('--invite', 'B3ZH9taVfT');
const OUT = argOf('--out', 'data/social.json');

const UA = 'infinition-site-social-builder';

/* Meme format que le badge stars : 1439 -> 1.4k */
const fmtCount = n => n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'k' : String(n || 0);

/* "4.5k" -> 4500, pour garder un ordre de grandeur exploitable quand la
   seule source disponible est deja formatee. */
function parseShort(txt) {
    const m = String(txt || '').trim().match(/^([\d.]+)\s*([km])?$/i);
    if (!m) return null;
    const n = parseFloat(m[1]);
    if (!isFinite(n)) return null;
    const mult = m[2] ? (m[2].toLowerCase() === 'k' ? 1e3 : 1e6) : 1;
    return Math.round(n * mult);
}

async function getJson(url, headers = {}) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, ...headers } });
    if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
    return res.json();
}

/* Reddit bloque les IP de datacenter sur about.json ; shields.io, lui, passe
   et sert deja le chiffre abrege. On tente le direct, puis le relais. */
async function fetchReddit() {
    try {
        const d = await getJson(`https://www.reddit.com/r/${SUB}/about.json`);
        const subs = d && d.data && Number(d.data.subscribers);
        if (subs > 0) return { subscribers: subs, label: fmtCount(subs) };
    } catch (e) {
        console.warn(`  reddit about.json indisponible (${e.message}), passage par shields.io`);
    }

    const s = await getJson(`https://img.shields.io/reddit/subreddit-subscribers/${SUB}.json`);
    const label = String(s && s.value || '').trim();
    const subs = parseShort(label);
    if (!subs) throw new Error(`valeur shields.io illisible: ${label}`);
    return { subscribers: subs, label };
}

async function fetchDiscord() {
    const d = await getJson(`https://discord.com/api/v10/invites/${INVITE}?with_counts=true`);
    const members = Number(d && d.approximate_member_count);
    if (!(members > 0)) throw new Error('approximate_member_count absent');
    return {
        members,
        online: Number(d.approximate_presence_count) || 0,
        label: fmtCount(members)
    };
}

async function readPrevious() {
    try {
        return JSON.parse(await readFile(OUT, 'utf8'));
    } catch {
        return null;
    }
}

const prev = await readPrevious();

const [reddit, discord] = await Promise.all([
    fetchReddit().catch(e => {
        console.warn(`  reddit: ${e.message}`);
        return null;
    }),
    fetchDiscord().catch(e => {
        console.warn(`  discord: ${e.message}`);
        return null;
    })
]);

const out = {
    generated_at: new Date().toISOString(),
    reddit: reddit
        ? { subreddit: SUB, ...reddit }
        : (prev && prev.reddit) || null,
    discord: discord
        ? { invite: INVITE, ...discord }
        : (prev && prev.discord) || null
};

if (!out.reddit || !out.discord) {
    console.error('Aucune valeur disponible pour reddit ou discord, rien n est ecrit.');
    process.exit(1);
}

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(out) + '\n', 'utf8');

console.log(`reddit ${out.reddit.label} (${out.reddit.subscribers}), discord ${out.discord.label} (${out.discord.members})`);

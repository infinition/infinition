#!/usr/bin/env node
/**
 * Build data/repos.json for the REPOS grid page.
 *
 * Design goals (fault tolerance):
 *  - The GitHub API is only touched here, never by the visitors browser.
 *  - Every repo is keyed by its numeric id, so a RENAME keeps its history.
 *  - A repo that disappears from the API is kept for GRACE_DAYS with
 *    "missing": true before being dropped, so one flaky API answer never
 *    wipes the grid.
 *  - A README that fails to parse falls back to the previously known image.
 *  - If the repo listing itself fails, the previous JSON is left untouched
 *    and the script exits non zero.
 *
 * Usage: node scripts/build-repos.mjs [--user infinition] [--out data/repos.json]
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const args = process.argv.slice(2);
const argOf = (flag, dflt) => {
    const i = args.indexOf(flag);
    return i !== -1 && args[i + 1] ? args[i + 1] : dflt;
};

const USER = argOf('--user', 'infinition');
const OUT = argOf('--out', 'data/repos.json');
const GRACE_DAYS = 7;
const TOKEN = process.env.GITHUB_TOKEN || '';

const HEADERS = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': `${USER}-repos-grid-builder`,
    ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {})
};

/* Badges and shields are never a good app icon. */
const BADGE_RE = /(shields\.io|img\.shields|badgen|badge|travis-ci|circleci|codecov|coveralls|appveyor|forthebadge|opencollective|visitor-badge|hits\.|profile-counter|starchart|star-history)/i;
const IMG_EXT_RE = /\.(png|jpe?g|gif|webp|svg|avif)(\?|#|$)/i;
/* GitHub attachment uploads carry no file extension, both shapes are valid images. */
const ATTACHMENT_RE = /^https:\/\/github\.com\/(user-attachments\/assets\/|[^/]+\/[^/]+\/assets\/)/i;

async function ghFetch(url, { retries = 3, json = true } = {}) {
    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const res = await fetch(url, { headers: HEADERS });
            if (res.status === 404) return null;
            if (res.status === 403 || res.status === 429) {
                const reset = Number(res.headers.get('x-ratelimit-reset') || 0) * 1000;
                const waitMs = reset ? Math.min(Math.max(reset - Date.now(), 0) + 1000, 60000) : 5000 * (attempt + 1);
                console.warn(`  rate limited on ${url}, waiting ${Math.round(waitMs / 1000)}s`);
                await sleep(waitMs);
                continue;
            }
            if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
            return json ? await res.json() : await res.text();
        } catch (err) {
            lastErr = err;
            await sleep(800 * (attempt + 1));
        }
    }
    throw lastErr || new Error(`failed: ${url}`);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function listRepos(user) {
    const all = [];
    for (let page = 1; page <= 10; page++) {
        const batch = await ghFetch(`https://api.github.com/users/${user}/repos?per_page=100&page=${page}&type=owner&sort=updated`);
        if (!Array.isArray(batch) || batch.length === 0) break;
        all.push(...batch);
        if (batch.length < 100) break;
    }
    if (all.length === 0) throw new Error('repo listing came back empty, refusing to overwrite');
    return all;
}

/** First real image of the README, absolute URL, badges excluded. */
async function readmeImage(user, repo, branch) {
    const candidates = ['README.md', 'readme.md', 'README.MD', 'README.rst', 'README'];
    for (const name of candidates) {
        let text;
        try {
            const res = await fetch(`https://raw.githubusercontent.com/${user}/${repo}/${branch}/${name}`, {
                headers: { 'User-Agent': HEADERS['User-Agent'] }
            });
            if (!res.ok) continue;
            text = await res.text();
        } catch { continue; }

        const re = /!\[[^\]]*\]\(\s*<?([^)\s>]+)[^)]*\)|<img[^>]+src\s*=\s*["']([^"']+)["']/gi;
        let m;
        while ((m = re.exec(text)) !== null) {
            let url = (m[1] || m[2] || '').trim();
            if (!url || url.startsWith('data:')) continue;
            if (BADGE_RE.test(url)) continue;

            if (!/^https?:\/\//i.test(url)) {
                url = url.replace(/^\.\//, '').replace(/^\//, '');
                url = `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${encodeURI(url)}`;
            } else if (url.includes('/blob/')) {
                /* github.com/.../blob/... serves HTML, the raw host serves the pixels */
                url = url.replace('https://github.com/', 'https://raw.githubusercontent.com/')
                    .replace('/blob/', '/');
            }

            const isAttachment = ATTACHMENT_RE.test(url);
            const isRawHost = /githubusercontent\.com/i.test(url);
            if (!isAttachment && !isRawHost && !IMG_EXT_RE.test(url)) continue;
            return url;
        }
        return null; // README found but no usable image
    }
    return null;
}

/** HEAD check so a dead image URL never ships to the page. */
async function imageAlive(url) {
    if (!url) return false;
    try {
        const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
        if (res.ok) return true;
        const get = await fetch(url, { method: 'GET', redirect: 'follow' });
        return get.ok;
    } catch { return false; }
}

function siteUrl(repo) {
    const home = (repo.homepage || '').trim();
    if (home && /^https?:\/\//i.test(home)) return home;
    if (repo.has_pages) return `https://${repo.owner.login}.github.io/${repo.name}/`;
    return null;
}

async function loadPrevious(path) {
    try {
        const raw = await readFile(path, 'utf8');
        const parsed = JSON.parse(raw);
        const list = Array.isArray(parsed) ? parsed : parsed.repos || [];
        return new Map(list.map(r => [String(r.id), r]));
    } catch {
        return new Map();
    }
}

async function mapWithConcurrency(items, limit, fn) {
    const out = new Array(items.length);
    let cursor = 0;
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (cursor < items.length) {
            const i = cursor++;
            try { out[i] = await fn(items[i], i); }
            catch (err) { out[i] = { __error: String(err) }; }
        }
    }));
    return out;
}

async function main() {
    const previous = await loadPrevious(OUT);
    console.log(`previous entries: ${previous.size}`);

    const raw = await listRepos(USER);
    console.log(`fetched ${raw.length} repos from the API`);

    const now = new Date().toISOString();

    const repos = await mapWithConcurrency(raw, 6, async r => {
        const prev = previous.get(String(r.id)) || {};
        let image = null;
        let imageStatus = 'none';

        try {
            image = await readmeImage(USER, r.name, r.default_branch || 'main');
            if (image && !(await imageAlive(image))) image = null;
            imageStatus = image ? 'readme' : 'none';
        } catch (err) {
            console.warn(`  README failed for ${r.name}: ${err.message}`);
        }

        /* Keep the last known good cover if this run could not resolve one. */
        if (!image && prev.image) {
            image = prev.image;
            imageStatus = 'stale';
        }

        if (prev.name && prev.name !== r.name) {
            console.log(`  renamed: ${prev.name} -> ${r.name} (id ${r.id})`);
        }

        return {
            id: r.id,
            name: r.name,
            full_name: r.full_name,
            url: r.html_url,
            site: siteUrl(r),
            description: (r.description || '').trim(),
            stars: r.stargazers_count,
            forks_count: r.forks_count,
            watchers: r.subscribers_count ?? r.watchers_count ?? 0,
            open_issues: r.open_issues_count,
            language: r.language,
            topics: Array.isArray(r.topics) ? r.topics.slice(0, 6) : [],
            license: r.license?.spdx_id || null,
            is_fork: !!r.fork,
            is_archived: !!r.archived,
            is_template: !!r.is_template,
            default_branch: r.default_branch,
            created_at: r.created_at,
            pushed_at: r.pushed_at,
            image,
            image_status: imageStatus,
            previous_name: prev.name && prev.name !== r.name ? prev.name : (prev.previous_name || null),
            first_seen: prev.first_seen || now,
            last_seen: now,
            missing: false
        };
    });

    const failed = repos.filter(r => r && r.__error);
    if (failed.length) console.warn(`${failed.length} entries errored, they are skipped`);
    const clean = repos.filter(r => r && !r.__error);

    /* Repos that vanished from the API: kept in a grace period, then dropped. */
    const liveIds = new Set(clean.map(r => String(r.id)));
    const cutoff = Date.now() - GRACE_DAYS * 86400000;
    let kept = 0, dropped = 0;
    for (const [id, prev] of previous) {
        if (liveIds.has(id)) continue;
        const lastSeen = Date.parse(prev.last_seen || prev.first_seen || 0);
        if (Number.isFinite(lastSeen) && lastSeen > cutoff) {
            clean.push({ ...prev, missing: true });
            kept++;
            console.log(`  missing (grace): ${prev.name}`);
        } else {
            dropped++;
            console.log(`  dropped: ${prev.name}`);
        }
    }

    clean.sort((a, b) => b.stars - a.stars || a.name.localeCompare(b.name));

    const visible = clean.filter(r => !r.missing);
    const payload = {
        generated_at: now,
        user: USER,
        count: visible.length,
        total_stars: visible.reduce((sum, r) => sum + (r.stars || 0), 0),
        total_forks: visible.reduce((sum, r) => sum + (r.forks_count || 0), 0),
        covers: visible.filter(r => r.image).length,
        repos: clean
    };

    await mkdir(dirname(OUT), { recursive: true }).catch(() => { });
    await writeFile(OUT, JSON.stringify(payload, null, 2) + '\n', 'utf8');

    /* Resume minuscule, lu par le badge du portail : inutile d'y charger
       tout le snapshot pour afficher un seul chiffre. */
    const summaryPath = OUT.replace(/\.json$/, '-summary.json');
    await writeFile(summaryPath, JSON.stringify({
        generated_at: now,
        count: payload.count,
        total_stars: payload.total_stars,
        total_forks: payload.total_forks
    }) + '\n', 'utf8');

    console.log(`wrote ${OUT} and ${summaryPath}`);
    console.log(`  repos: ${payload.count} | stars: ${payload.total_stars} | covers: ${payload.covers} | grace: ${kept} | dropped: ${dropped}`);
}

main().catch(err => {
    console.error('build failed, previous data left untouched:', err.message);
    process.exit(1);
});

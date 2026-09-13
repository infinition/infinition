#!/usr/bin/env node
/**
 * Build data/library.json : les rayons de textes markdown de la vue LIBRARY.
 *
 * Les publications arXiv ont leur propre chaine (build-papers.mjs) parce
 * qu'elles viennent d'une source distante. Ici tout est dans le depot : le
 * script se contente de lire les en-tetes, de compter les mots et de dater.
 *
 * Le texte lui meme n'est pas recopie dans le JSON. Un essai pese des
 * dizaines de milliers de caracteres, les embarquer tous dans l'index
 * obligerait chaque visiteur a telecharger toute la bibliotheque pour n'en
 * lire qu'une page. La page va chercher le markdown a l'ouverture.
 *
 * Usage: node scripts/build-library.mjs [--dir library] [--out data/library.json]
 */

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { dirname, join, basename } from 'node:path';

const args = process.argv.slice(2);
const argOf = (flag, dflt) => {
    const i = args.indexOf(flag);
    return i !== -1 && args[i + 1] ? args[i + 1] : dflt;
};

const DIR = argOf('--dir', 'library');
const OUT = argOf('--out', 'data/library.json');

/* Un rayon par dossier, dans l'ordre d'affichage. Le libelle est celui que
   voit le lecteur, l'accent la couleur de la tranche des livres.
   Pour ajouter un rayon : creer le dossier et l'inscrire ici. */
const SHELVES = [
    { id: 'essays', label: 'Essays', accent: 'green' },
    { id: 'fiction', label: 'Fiction', accent: 'red' }
];

/* Une minute de lecture pour deux cent vingt mots, ce qui est la moyenne
   admise pour de la prose suivie en francais comme en anglais. */
const WORDS_PER_MINUTE = 220;

/* ----------------------------------------------------------------------- */

/**
 * Lecture d'en-tete YAML, volontairement limitee a ce que ces fichiers
 * utilisent : des scalaires, des listes en ligne et des blocs repliants.
 * Une vraie bibliotheque YAML serait une dependance de plus pour analyser
 * huit cles connues d'avance.
 */
function parseFrontMatter(raw) {
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (!match) return { meta: {}, body: raw };

    const meta = {};
    const lines = match[1].split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const entry = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
        if (!entry) continue;

        const key = entry[1];
        let value = entry[2].trim();

        /* Bloc replie : "summary: >" suivi de lignes indentees. */
        if (value === '>' || value === '|' || value === '>-' || value === '|-') {
            const block = [];
            while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) {
                block.push(lines[++i].trim());
            }
            meta[key] = block.join(value.startsWith('|') ? '\n' : ' ');
            continue;
        }

        /* Liste en ligne : "tags: [a, b]" */
        if (value.startsWith('[') && value.endsWith(']')) {
            meta[key] = value.slice(1, -1)
                .split(',')
                .map(v => v.trim().replace(/^["']|["']$/g, ''))
                .filter(Boolean);
            continue;
        }

        meta[key] = value.replace(/^["']|["']$/g, '');
    }

    return { meta, body: raw.slice(match[0].length) };
}

/* Compte les mots du texte seul : ni balises, ni blocs de code, ni URL. */
function countWords(body) {
    const prose = body
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/`[^`]*`/g, ' ')
        .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/^[#>\-*+\s]+/gm, ' ')
        .replace(/[*_~]/g, ' ');
    return (prose.match(/[\p{L}\p{N}][\p{L}\p{N}'-]*/gu) || []).length;
}

/* A defaut de resume declare, les premieres phrases du texte. Mieux vaut un
   extrait honnete qu'une carte vide. */
function fallbackSummary(body) {
    const firstBlock = body
        .split(/\r?\n\r?\n/)
        .map(b => b.trim())
        .find(b => b && !b.startsWith('#') && !b.startsWith('>'));
    if (!firstBlock) return '';

    const flat = firstBlock.replace(/[*_`]/g, '').replace(/\s+/g, ' ').trim();
    return flat.length > 260 ? `${flat.slice(0, 257).trimEnd()}...` : flat;
}

async function readShelf(shelf) {
    const dir = join(DIR, shelf.id);

    let files = [];
    try {
        files = (await readdir(dir)).filter(f => f.toLowerCase().endsWith('.md'));
    } catch {
        /* Un rayon peut ne pas exister encore, ce n'est pas une erreur. */
        return { ...shelf, count: 0, entries: [] };
    }

    const entries = [];
    for (const file of files.sort()) {
        const path = join(dir, file).replace(/\\/g, '/');
        const raw = await readFile(path, 'utf8');
        const { meta, body } = parseFrontMatter(raw);

        if ((meta.status || 'published').toLowerCase() === 'draft') {
            console.log(`  ${path}: brouillon, ignore`);
            continue;
        }

        const slug = basename(file, '.md');
        const words = countWords(body);

        if (!meta.title) {
            console.warn(`  ${path}: pas de titre dans l'en-tete, ignore`);
            continue;
        }

        entries.push({
            id: `${shelf.id}/${slug}`,
            shelf: shelf.id,
            title: meta.title,
            subtitle: meta.subtitle || '',
            summary: meta.summary || fallbackSummary(body),
            date: meta.date || '',
            lang: (meta.lang || 'en').toLowerCase(),
            tags: Array.isArray(meta.tags) ? meta.tags : [],
            path,
            words,
            reading_minutes: Math.max(1, Math.round(words / WORDS_PER_MINUTE))
        });
    }

    entries.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    return { ...shelf, count: entries.length, entries };
}

/* ----------------------------------------------------------------------- */

const shelves = await Promise.all(SHELVES.map(readShelf));

/* Un rayon vide n'est pas servi : la page n'a pas a decider quoi cacher. */
const filled = shelves.filter(s => s.count > 0);

const out = {
    generated_at: new Date().toISOString(),
    total: filled.reduce((n, s) => n + s.count, 0),
    shelves: filled
};

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, `${JSON.stringify(out, null, 2)}\n`, 'utf8');

console.log(filled.length === 0
    ? 'aucun texte publie, bibliotheque vide'
    : filled.map(s => `${s.label}: ${s.count}`).join(', '));

#!/usr/bin/env node
/**
 * Build data/photos.json et les derivees de assets/photos, pour la vue PHOTOS.
 *
 * Le dossier photos/ ne contient que les originaux, deposes tels quels. Tout
 * le reste se deduit du nom du fichier :
 *
 *     lune.astronomy.png          titre "Lune",        tag astronomy
 *     pont-de-nuit.urbex.nuit.jpg titre "Pont de nuit", tags urbex et nuit
 *
 * Le dernier segment est l'extension, le premier le titre, tout ce qu'il y a
 * entre les deux est un tag. Un fichier sans point interieur n'a pas de tag,
 * il apparait quand meme.
 *
 * Deux derivees par photo, parce qu'un original de telephone pese dix mega et
 * que personne ne telecharge dix mega pour une vignette :
 *   - une vignette carree pour la grille serree ;
 *   - une version grand cote borne pour la visionneuse.
 * Les originaux ne sont jamais servis au visiteur.
 *
 * Une derivee deja calculee n'est pas refaite : la comparaison porte sur une
 * empreinte du contenu du fichier source, memorisee dans l'index. La date de
 * modification ne conviendrait pas, git ne la preservant pas d'une extraction
 * a l'autre : le cache ne serait jamais touche sur le runner, la ou il sert.
 *
 * Usage: node scripts/build-photos.mjs [--dir photos] [--out data/photos.json]
 *                                      [--assets assets/photos]
 */

import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { dirname, join, extname, basename } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const args = process.argv.slice(2);
const argOf = (flag, dflt) => {
    const i = args.indexOf(flag);
    return i !== -1 && args[i + 1] ? args[i + 1] : dflt;
};

const DIR = argOf('--dir', 'photos');
const OUT = argOf('--out', 'data/photos.json');
const ASSETS = argOf('--assets', 'assets/photos');
const FORCE = args.includes('--force');

const SOURCES = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff', '.avif']);

/* La grille serree affiche des cases d'environ 200 px, doublees pour les
   ecrans a forte densite. La visionneuse borne le grand cote a 2000 px, ce
   qui reste net en plein ecran sans faire exploser le poids du depot. */
const THUMB = 420;
const FULL = 2000;
const QUALITY = 80;

/* Un tag ecrit "Nuit", "nuit" ou "NUIT" doit rester un seul tag. */
const normalizeTag = t => t.trim().toLowerCase().replace(/[_\s]+/g, '-');

/* "pont-de-nuit" donne "Pont de nuit". */
function titleize(slug) {
    const words = slug.replace(/[_-]+/g, ' ').trim();
    return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * "lune.astronomy.png" donne { slug, title, tags }.
 * Le nom est la seule source : pas de fichier de metadonnees a tenir a jour
 * en parallele, donc rien qui puisse diverger.
 */
function parseName(file) {
    const ext = extname(file);
    const stem = basename(file, ext);
    const parts = stem.split('.').filter(Boolean);

    const slug = (parts.shift() || stem).trim();
    const tags = [...new Set(parts.map(normalizeTag).filter(Boolean))];

    return { slug: normalizeTag(slug), title: titleize(slug), tags };
}

async function readPrevious() {
    try {
        return JSON.parse(await readFile(OUT, 'utf8'));
    } catch {
        return null;
    }
}

async function listSources() {
    try {
        const files = await readdir(DIR);
        return files.filter(f => SOURCES.has(extname(f).toLowerCase())).sort();
    } catch {
        return null;
    }
}

const prev = await readPrevious();
const files = await listSources();

if (files === null) {
    console.error(`Le dossier ${DIR} n'existe pas, rien a construire.`);
    process.exit(1);
}

await mkdir(ASSETS, { recursive: true });

const known = new Map(((prev && prev.photos) || []).map(p => [p.file, p]));
const photos = [];
const expected = new Set();
let built = 0;
let kept = 0;
let failed = 0;

for (const file of files) {
    const source = join(DIR, file);
    const { slug, title, tags } = parseName(file);

    const thumb = `${ASSETS}/${slug}-thumb.webp`;
    const full = `${ASSETS}/${slug}.webp`;
    expected.add(`${slug}-thumb.webp`);
    expected.add(`${slug}.webp`);

    let stamp;
    try {
        stamp = createHash('sha1').update(await readFile(source)).digest('hex').slice(0, 16);
    } catch (e) {
        console.warn(`  ${file}: illisible (${e.message})`);
        failed += 1;
        continue;
    }

    const old = known.get(file);

    /* Le fichier n'a pas bouge et ses derivees existent deja : on reprend
       l'entree telle quelle plutot que de reencoder pour rien. */
    if (!FORCE && old && old.stamp === stamp && old.width) {
        photos.push({ ...old, title, tags, slug });
        kept += 1;
        continue;
    }

    try {
        const image = sharp(source, { failOn: 'none' }).rotate();
        const meta = await image.metadata();

        await image
            .clone()
            .resize(THUMB, THUMB, { fit: 'cover', position: 'attention' })
            .webp({ quality: QUALITY })
            .toFile(thumb);

        await image
            .clone()
            .resize(FULL, FULL, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: QUALITY })
            .toFile(full);

        /* rotate() applique l'orientation EXIF : apres coup, une photo prise
           en portrait a bien sa hauteur superieure a sa largeur. */
        const turned = (meta.orientation || 0) >= 5;
        const width = turned ? meta.height : meta.width;
        const height = turned ? meta.width : meta.height;

        photos.push({
            id: slug,
            slug,
            file,
            title,
            tags,
            thumb,
            full,
            width: width || 0,
            height: height || 0,
            ratio: width && height ? Number((width / height).toFixed(4)) : 1,
            stamp
        });
        built += 1;
        console.log(`${file}: ${width}x${height}, tags [${tags.join(', ') || 'aucun'}]`);
    } catch (e) {
        console.warn(`  ${file}: conversion impossible (${e.message})`);
        failed += 1;
    }
}

/* Un dossier vide n est pas une erreur : c est l etat de depart, et la vue
   sait afficher une galerie sans photo. Seul un dossier ou tout a echoue
   justifie de refuser d ecrire. */
if (photos.length === 0 && failed > 0) {
    console.error('Aucune photo exploitable alors que le dossier n est pas vide.');
    process.exit(1);
}

/* Les derivees d une photo renommee ou supprimee ne servent plus a rien. */
let removed = 0;
for (const name of await readdir(ASSETS)) {
    if (name.endsWith('.webp') && !expected.has(name)) {
        await unlink(join(ASSETS, name));
        removed += 1;
    }
}

/* Les tags sont comptes ici : la page n a pas a parcourir toute la
   collection pour savoir quels filtres proposer. */
const counts = new Map();
for (const photo of photos) {
    for (const tag of photo.tags) counts.set(tag, (counts.get(tag) || 0) + 1);
}

const tags = [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

const out = {
    generated_at: new Date().toISOString(),
    count: photos.length,
    tags,
    photos
};

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, `${JSON.stringify(out, null, 2)}\n`, 'utf8');

console.log(`${photos.length} photo(s), ${built} encodee(s), ${kept} conservee(s), `
    + `${removed} derivee(s) obsolete(s) effacee(s), ${failed} en echec`);
console.log(tags.length ? `tags: ${tags.map(t => `${t.name} (${t.count})`).join(', ')}` : 'aucun tag');

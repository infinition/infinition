# library

Les textes signés, affichés en rayonnage dans la vue LIBRARY du site
(`#papers`). Un dossier par rayon, un fichier markdown par texte.

Ce dossier ne fait pas double emploi avec les deux autres sources du site :

| Dossier     | Ce qu'on y met                            | Où ça sort           |
|-------------|-------------------------------------------|----------------------|
| `library/`  | des oeuvres finies, signées, avec une couverture | LIBRARY, en rayonnage |
| `articles/` | des notes et des synthèses au fil de l'eau | DATA LOGS, en flux    |
| `kb/`       | de la documentation de référence           | KNOWLEDGE, en arbre   |

Les publications arXiv et les preprints n'ont rien à faire ici : ils sont
récupérés automatiquement par `scripts/build-papers.mjs`, leur couverture
étant la première page de leur PDF.

## Rayons

- `essays/` : prose argumentée, non fictionnelle. Chroniques, manifestes,
  notes de travail, réflexions. C'est le rayon fourre-tout du texte sérieux,
  et le sous-genre se met en `tags` plutôt qu'en dossier séparé.
- `fiction/` : récits. Nouvelles, fragments narratifs.

Un rayon vide n'apparaît pas sur le site. Pour en ajouter un, créer le
dossier et déclarer son libellé dans `scripts/build-library.mjs`.

## En-tête d'un fichier

```markdown
---
title: Le titre complet, tel qu'il doit s'afficher
subtitle: Optionnel, une ligne
date: 2026-07-24
lang: fr
status: published
tags: [cognition, mémoire]
summary: >
  Deux ou trois phrases. C'est ce que le lecteur voit avant d'ouvrir,
  et ce sur quoi porte la recherche.
---

Le texte commence ici, sans répéter le titre.
```

`status: draft` garde le fichier hors du site. `date`, `lang` et `summary`
sont attendus ; le reste est facultatif. Le nom du fichier sert
d'identifiant, il apparaît dans l'URL sous la forme `#read:essays/mon-texte`.

## Après édition

Rien à lancer : `.github/workflows/site-data.yml` reconstruit
`data/library.json` à chaque poussée touchant ce dossier. En local,
`npm run library` fait la même chose.

# photos

Les originaux de la galerie du site (`#photos`). Déposez vos images ici, il
n'y a rien d'autre à faire.

## Les sous-dossiers sont des albums

Une photo posée à la racine n'appartient à aucun album. Un sous-dossier en
crée un, et la profondeur n'est pas limitée.

```
photos/
  golden-hour.sunset.sea.jpg        aucun album
  storms/
    lightning-strike.storm.jpg      album Storms
  voyages/
    lagoon-jetty.travel.sea.jpg     album Voyages
    mexique/
      jaguar.wildlife.jpg           album Voyages / Mexique
```

Choisir un album parent montre aussi ce que contiennent ses sous-dossiers :
Voyages affiche le Mexique. Le menu n'apparaît que s'il existe au moins un
sous-dossier, et la galerie montre tout par défaut.

Deux albums peuvent contenir un fichier du même nom, l'identifiant portant
l'album. Renommer ou déplacer une photo régénère ses dérivées et efface les
anciennes.

## Le nom du fichier porte les tags

Le premier segment est le titre, le dernier est l'extension, tout ce qu'il y a
entre les deux devient un tag.

| Fichier | Titre | Tags |
|---|---|---|
| `lune.astronomy.png` | Lune | `astronomy` |
| `pont-de-nuit.urbex.nuit.jpg` | Pont de nuit | `urbex`, `nuit` |
| `portrait.jpg` | Portrait | aucun |

Les tirets bas et les tirets du titre deviennent des espaces, `pont-de-nuit`
s'affiche « Pont de nuit ». Les tags sont ramenés en minuscules, donc `Nuit`,
`nuit` et `NUIT` ne font qu'un seul tag.

Formats acceptés : `jpg`, `jpeg`, `png`, `webp`, `tif`, `tiff`, `avif`.

## Ce que la construction fabrique

`scripts/build-photos.mjs` produit deux dérivées par photo dans
`assets/photos/`, une vignette carrée de 420 px pour la grille serrée et une
version de 2000 px de grand côté pour la visionneuse. Les originaux de ce
dossier ne sont jamais servis au visiteur, ils ne servent qu'à fabriquer ces
deux fichiers.

L'orientation EXIF est appliquée, une photo prise en portrait sort donc dans
le bon sens. Une dérivée déjà calculée n'est pas refaite : seul un fichier
ajouté ou modifié est réencodé.

## Après avoir déposé des photos

Rien à lancer : `.github/workflows/site-data.yml` reconstruit la galerie à
chaque poussée touchant ce dossier. En local, `npm run photos` fait la même
chose.

## Un mot sur le poids

Les originaux sont versionnés, ce qui permet de tout régénérer et de changer
les tailles de dérivées plus tard. Un original de téléphone pèse volontiers
dix mégaoctets, et git garde chaque version pour toujours. Si la collection
grossit beaucoup, il vaut mieux déposer des fichiers déjà réduits, par exemple
à 3000 px de grand côté, plutôt que les fichiers bruts de l'appareil.

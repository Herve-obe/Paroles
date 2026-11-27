# Paroles

Application locale qui pilote l'affichage des paroles et du jeu depuis la régie, pour le tournage pédagogique « N'oubliez pas les paroles » (BTS Audiovisuel, Saint-Genès La Salle).

La référence est le cahier des charges : [CDC_Application_Paroles.md](CDC_Application_Paroles.md).

> **Version provisoire (lot 1 sur 7).** À ce stade, seul le « noyau » existe : les règles de calcul (découpage en mots, `_`, comparaison, import et export `.txt`). L'écran opérateur arrive au lot 2. Ce fichier sera complété au fil des lots : lancement, écrans de sortie, déroulé d'une chanson, jokers, raccourcis.

## Contenu du dossier

| Dossier ou fichier | Rôle |
|:---|:---|
| `app/` | L'application, à copier sur la clé USB (l'écran opérateur `index.html` arrive au lot 2) |
| `app/exemples/` | 2 chansons d'exemple aux paroles inventées |
| `tests/` | Tests automatiques |
| `CDC_Application_Paroles.md` | Cahier des charges |

## Lancer les tests

**Sans rien installer (Chrome ou Edge) :** ouvre le dossier `tests` et double-clique sur `tests.html`. Le bandeau du haut doit être vert : « Tous les tests passent ».

**Avec Node.js** (pour le développement, version 22 ou plus) : dans un terminal ouvert à la racine du dossier :

```bash
npm test
```

La commande lance aussi le test des chansons d'exemple, que la page `tests.html` ne peut pas faire.

## Format des fichiers `.txt`

Un fichier par chanson, en UTF-8, modifiable dans le Bloc-notes :

```
# titre: Le café du port
# artiste: Les Marées Basses
# candidat: 1
# categorie: 20
# theme: Chansons de bord de mer
# mode: ORCHESTRE
# note: remarque libre
# faux1: tous les matins d'hiver que le premier bateau
# faux2: toutes les nuits d'automne que le petit navire

Sur le quai, les mouettes se disputent le matin
Moi j'attends sur le banc [tous les soirs d'été]
[Que le dernier ferry] me ramène à toi
Mais le ferry s'en va, et je reste là
```

- Seul `titre` est obligatoire. `candidat` : 1 à 4. `categorie` : `10`, `20`, `30`, `40`, `50`, `meme` ou `finale`. `mode` : `ORCHESTRE` ou `PLAYBACK`.
- Les mots à trouver sont entre crochets. Un seul passage à trou par chanson, sur une ou plusieurs lignes qui se suivent. Un crochet se ferme sur la même ligne et entoure des mots entiers.
- `faux1` et `faux2` (pour le joker « 3 propositions ») doivent avoir exactement le même nombre de mots que le passage à trou.
- Le détail complet est dans la section 4.2 du cahier des charges.

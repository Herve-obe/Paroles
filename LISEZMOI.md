# Paroles

Application locale qui pilote l'affichage des paroles et du jeu depuis la régie, pour le tournage pédagogique « N'oubliez pas les paroles » (BTS Audiovisuel, Saint-Genès La Salle).

La référence est le cahier des charges : [CDC_Application_Paroles.md](CDC_Application_Paroles.md).

> **Version provisoire (lot 3 sur 7).** Disponible : la conduite, l'éditeur de chansons, l'import et l'export `.txt`, le défilement des lignes, les 2 écrans de sortie (prompteur et incrustation), « Noir ». À venir : saisie et révélation (lot 4), jokers (lot 5), préférences et sauvegarde (lot 6). **Rien n'est encore sauvegardé** : un rechargement de la page vide la conduite (la sauvegarde arrive au lot 6). Gardez vos chansons en fichiers `.txt` avec « Exporter la chanson ».

## Lancer l'application

1. Copiez le dossier `app` où vous voulez (clé USB, bureau). Aucune installation, aucun réseau.
2. Double-cliquez sur `app/index.html`. Il s'ouvre dans le navigateur par défaut ; s'il ne s'agit pas de Chrome ou d'Edge : clic droit sur `index.html`, « Ouvrir avec », « Google Chrome » ou « Microsoft Edge ».
3. Mettez la fenêtre en plein écran avec F11 si vous le souhaitez.

## Ouvrir les écrans de sortie

1. Cliquez sur « Ouvrir un écran de sortie » (ou F2) : l'écran 1 s'ouvre dans une fenêtre. Cliquez une seconde fois pour l'écran 2.
2. Glissez chaque fenêtre sur l'écran voulu (prompteur du candidat, entrée de la régie vidéo).
3. Double-cliquez dans la fenêtre : elle passe en plein écran, sans curseur ni texte. Un second double-clic (ou Échap) en sort.
4. Les voyants du bandeau indiquent l'état de chaque écran : gris = fermé, orange = ouvert en fenêtre, vert = ouvert en plein écran. **Un clic sur un voyant** ouvre cet écran s'il est fermé, ou le ferme (après confirmation) s'il est ouvert.

Par défaut, l'écran 1 est le **prompteur** (fond noir, gros caractères) et l'écran 2 l'**incrustation** (bandeau en bas de l'image sur fond noir ; le bandeau a son propre fond opaque, donc les mots verts ne sont jamais découpés par une incrustation sur fond vert). Les réglages (mode de chaque écran, fond vert, nombre de lignes) arrivent au lot 6.

- **Noir** (ou F1) vide tous les écrans de sortie : le prompteur passe au noir, l'incrustation ne garde que son fond. Un second appui réaffiche.
- Les aperçus en bas de la zone centrale montrent en temps réel ce qu'affiche chaque écran.
- Un écran de sortie fermé ou rechargé (F5) retrouve tout seul l'affichage en cours ; il faut seulement refaire le double-clic pour le plein écran.
- Si l'écran de sortie a le focus (après le double-clic), ses touches agissent quand même sur l'écran opérateur : Espace fait passer à la ligne suivante.
- Si le navigateur bloque l'ouverture de la fenêtre, autorisez les fenêtres pop-up pour cette page (icône à droite de la barre d'adresse).

## Préparer les chansons

- **Importer** : bouton « Importer .txt » (plusieurs fichiers à la fois), ou glisser-déposer des fichiers `.txt` n'importe où sur la fenêtre. Deux exemples sont fournis dans `app/exemples`.
- **Nouvelle chanson** : remplir le formulaire, taper ou coller les paroles (une ligne de texte = une ligne à l'écran), sélectionner à la souris les mots à trouver puis cliquer sur « Marquer comme mots à trouver ». Les mots marqués apparaissent entre crochets et surlignés. « Démarquer » retire le marquage des mots sélectionnés.
- **Fausses propositions** : l'éditeur indique le nombre de mots attendu et refuse un nombre différent.
- **Aperçu** : montre la chanson avec les `_` à la place des mots à trouver.
- **Exporter la chanson** : enregistre le `.txt` de la chanson sélectionnée (Chrome et Edge ouvrent une fenêtre « Enregistrer sous »).
- **Conduite** : un clic sélectionne une chanson ; « Modifier », « Monter », « Descendre », « Supprimer » agissent sur la chanson sélectionnée.

## Dérouler une chanson

1. Sélectionnez la chanson et cliquez sur « Charger » (ou double-cliquez dessus). Étape : « Chanson chargée ».
2. « Afficher le titre » (facultatif, apparaît en fondu), puis « Commencer » :
   - si le titre était affiché, il disparaît en fondu et l'écran reste sans paroles pendant l'intro ; « Afficher la première ligne » (ou Espace) lance la ligne 1 ;
   - sinon, la ligne 1 s'affiche directement.
   La ligne à l'antenne est surlignée en jaune, la suivante repérée en pointillés. Sur le prompteur, les lignes défilent du bas vers le haut : la ligne à chanter au milieu, la suivante en dessous, plus petite et plus foncée.
3. « Ligne suivante » / « Ligne précédente » en suivant le chant. Le passage à trou est encadré en violet, les mots à trouver restent lisibles pour l'opérateur.
4. Le défilement s'arrête à la dernière ligne du passage à trou : la suite (saisie de la proposition) arrive au lot 4.
5. « Annuler la dernière action » revient en arrière à tout moment.
6. « Arrêter la chanson » ferme la chanson en cours et vide les écrans (confirmation si elle a commencé).

Changer de chanson pendant qu'une chanson est en cours demande une confirmation.

## Raccourcis clavier

Chaque raccourci a son bouton à l'écran. Les touches actives sont rappelées en bas à droite de l'écran opérateur.

| Action | Touche |
|:---|:---|
| Ligne suivante | Espace ou flèche droite |
| Ligne précédente | Flèche gauche |
| Commencer, puis première ligne après l'intro | Entrée |
| Chanson précédente / suivante (hors chanson en cours) | Flèche haut / bas |
| Annuler la dernière action | Ctrl+Z |
| Noir (second appui : réaffiche) | F1 |
| Ouvrir un écran de sortie | F2 |

Les raccourcis ne fonctionnent pas quand on tape dans un champ (l'éditeur par exemple). Une touche maintenue enfoncée ne répète pas l'action.

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

## Contenu du dossier

| Dossier ou fichier | Rôle |
|:---|:---|
| `app/` | L'application, à copier sur la clé USB |
| `app/index.html` | Écran opérateur |
| `app/sortie.html` | Écran de sortie (ouvert par l'écran opérateur, ne pas ouvrir directement) |
| `app/exemples/` | 2 chansons d'exemple aux paroles inventées |
| `app/polices/` | Police Atkinson Hyperlegible et sa licence (SIL OFL 1.1) |
| `tests/` | Tests automatiques |
| `CDC_Application_Paroles.md` | Cahier des charges |

## Lancer les tests

**Sans rien installer (Chrome ou Edge) :** ouvrez le dossier `tests` et double-cliquez sur `tests.html`. Le bandeau du haut doit être vert : « Tous les tests passent ».

**Avec Node.js** (développement, version 22 ou plus), dans un terminal ouvert à la racine du dossier :

```bash
npm test
```

Cette commande lance les tests des règles (et celui des chansons d'exemple, que `tests.html` ne peut pas faire). Les tests de l'interface, qui pilotent un vrai navigateur, demandent en plus Playwright :

```bash
npm run test:interface
```

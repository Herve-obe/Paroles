# État d'avancement de l'application « Paroles »

Journal des versions livrées, la plus récente en tête (protocole de livraison, étape 3). Chaque version est construite et testée par la CI ; elle n'est « validée » qu'une fois essayée par Hervé.

## Situation actuelle : 0.4.0

Livrée le 28 novembre 2026. Lot 4 : saisie de la proposition, blocage, révélation, correction et statut.

**Ce qui change**

- « Saisir la proposition » (Entrée) au passage à trou : une case par mot à trouver ; Espace, Tab ou Entrée passe à la case suivante, Maj+Tab revient ; chaque lettre part en jaune sur les écrans de sortie.
- De la saisie à la révélation, toutes les lignes du trou ensemble sur les écrans ; dans l'incrustation, le bandeau s'agrandit le temps du jeu (réponse d'Hervé).
- « Bloquer » (Ctrl+Entrée ; Entrée seule ne bloque jamais) : proposition en bleu, cases verrouillées ; « Débloquer » avec confirmation tant que rien n'est révélé.
- Suggestion « Juste » / « Faux » par mot, basculable d'un clic par l'opérateur.
- « Révéler le mot suivant » (R), « Tout révéler » (Maj+R) : juste en vert ; faux ou case vide en rouge, remplacé 1,5 s plus tard par le bon mot en blanc sur rouge ; puis « Bonne réponse » ou « Mauvaise réponse ».
- Résultat inscrit dans la conduite ; « Chanson suivante » ; « Ligne suivante » pour la suite de la chanson après le trou.
- « Annuler la dernière action » couvre les nouvelles actions, case par case pour la saisie.
- CI : outils GitHub mis à jour (fin de l'avertissement sur l'ancienne version de Node.js).

**Pourquoi** : lot 4 du cahier des charges, après validation du lot 3.

**Demande nouvelle, acceptée par Hervé : sortie « découpe et remplissage » (key et fill)**

Demande du formateur en technique vidéo : sortir le bandeau d'incrustation en deux signaux, remplissage (fill) et découpe (key), vers le mélangeur Sony MVS-3000A, idéalement par une carte Blackmagic DeckLink à deux sorties SDI.

- Une page web ne peut pas piloter une carte DeckLink : seul un logiciel qui utilise le pilote Blackmagic (Desktop Video) le peut, et toutes les cartes ne savent pas sortir fill et key (par exemple DeckLink Duo 2, 4K Extreme 12G, 8K Pro, Studio 4K : oui ; Mini Monitor, SDI 4K : non, d'après une liste tierce à vérifier sur la fiche du modèle).
- Piste avec la DeckLink : OBS Studio (gratuit) capture la sortie d'incrustation et l'envoie à la carte avec son « keyer » réglé sur « External » (fill et key sur deux sorties SDI). À vérifier sur le matériel : modèle de carte, installation d'OBS sur le PC d'exploitation, réglage de la capture.
- Piste sans DeckLink : deux écrans de sortie « remplissage » et « découpe » dans Paroles, sur deux sorties de la carte graphique, chacune suivie d'un convertisseur HDMI vers SDI.
- À trancher : la piste retenue (selon le matériel), puis le lot où la faire.

**Ce qui reste ouvert**

- Essai de la 0.4.0 par Hervé, puis validation du lot 4.
- Sortie key et fill : informations sur le matériel (modèle de la carte DeckLink, sorties de la carte graphique), choix de la piste, planification.
- Lots 5 à 7 : jokers et « Rejouer la chanson » ; préférences (dont la couleur du fond d'incrustation), raccourcis modifiables, sauvegarde et journal ; « La même chanson ».
- Non vérifiable hors du PC d'exploitation : plein écran sur un second moniteur, rendu au mélangeur.

## Version 0.3.2

Livrée le 27 novembre 2026. Correctif du lot 3 après l'essai de la 0.3.1.

**Ce qui change**

- Incrustation : seule la ligne à chanter est affichée (plus de ligne suivante), centrée verticalement dans le bandeau ; le bandeau est moins haut.
- Le nombre de lignes affichées se règle désormais par mode d'écran : prompteur 2, incrustation 1 (réglage dans les préférences au lot 6).

**Pourquoi** : retour d'Hervé après l'essai de la 0.3.1.

**Décisions d'Hervé**

- Prompteur conservé tel quel : la ligne chantée disparaît aussitôt ; l'effet « rouleau » envisagé pour le lot 4 est abandonné.
- Choix de la couleur du fond d'incrustation (noir, vert, bleu) : au lot 6, avec les préférences.

**Essai d'Hervé** : concluant sur tous les points ; **lot 3 validé** le 28 novembre 2026.

## Version 0.3.1

Livrée le 27 novembre 2026. Lot 3 (écrans de sortie) avec les retours du premier essai d'Hervé.

**Ce qui change**

- Voyants des écrans de sortie cliquables : un clic ouvre l'écran fermé, ou ferme l'écran ouvert après confirmation.
- Double-clic sur un écran de sortie sans sélection de texte.
- Après le titre, « Commencer » fait disparaître le titre en fondu vers un écran sans paroles (intro) ; « Afficher la première ligne » lance la ligne 1.
- Défilement du bas vers le haut : la ligne à chanter au milieu du prompteur, la suivante en dessous, plus petite et plus foncée. La ligne qui vient d'être chantée disparaît aussitôt (seules la ligne à chanter et la suivante sont affichées).
- Bouton « Arrêter la chanson ».
- Numéro de version affiché dans le bandeau de l'écran opérateur ; CI GitHub qui lance les tests et fournit l'application à télécharger (artefact `Paroles-app-test`).

**Pourquoi** : retours d'Hervé après l'essai du lot 3, et mise en place du protocole de livraison.

**Essai d'Hervé** : validés : voyants cliquables avec avertissement, fondu du titre, « Arrêter la chanson », fluidité des effets, prompteur tel quel. À corriger : l'incrustation affichait aussi la ligne suivante (corrigé dans la 0.3.2).

## Version 0.3.0

Lot 3, première livraison (pull request n° 3) : écrans de sortie prompteur et incrustation, plein écran au double-clic, « Noir » (F1), « Ouvrir un écran de sortie » (F2), voyants, aperçus, resynchronisation. Essai d'Hervé : F1 et F2 fonctionnent ; retours traités dans la 0.3.1.

## Version 0.2.0

Lot 2 (pull request n° 2) : écran opérateur, conduite, éditeur de chansons, import et export `.txt`, défilement des lignes. Validé par Hervé.

## Version 0.1.0

Lot 1 (pull request n° 1) : noyau (découpage en mots, « _ », comparaison, format `.txt`) et tests des règles 1 à 5 et 8. Validé par Hervé.

# État d'avancement de l'application « Paroles »

Journal des versions livrées, la plus récente en tête (protocole de livraison, étape 3). Chaque version est construite et testée par la CI ; elle n'est « validée » qu'une fois essayée par Hervé.

## Situation actuelle : 0.3.1

Livrée le 27 novembre 2026. Lot 3 (écrans de sortie) avec les retours du premier essai d'Hervé.

**Ce qui change**

- Voyants des écrans de sortie cliquables : un clic ouvre l'écran fermé, ou ferme l'écran ouvert après confirmation.
- Double-clic sur un écran de sortie sans sélection de texte.
- Après le titre, « Commencer » fait disparaître le titre en fondu vers un écran sans paroles (intro) ; « Afficher la première ligne » lance la ligne 1.
- Défilement du bas vers le haut : la ligne à chanter au milieu du prompteur, la suivante en dessous, plus petite et plus foncée. La ligne qui vient d'être chantée disparaît aussitôt (seules la ligne à chanter et la suivante sont affichées).
- Bouton « Arrêter la chanson ».
- Numéro de version affiché dans le bandeau de l'écran opérateur ; CI GitHub qui lance les tests et fournit l'application à télécharger (artefact `Paroles-app-test`).

**Pourquoi** : retours d'Hervé après l'essai du lot 3, et mise en place du protocole de livraison.

**Ce qui reste ouvert**

- Essai de la 0.3.1 par Hervé (lot 3 non encore validé).
- Lots 4 à 7 : saisie, blocage, révélation et statut ; jokers ; préférences, raccourcis modifiables, sauvegarde et journal ; « La même chanson ».
- Non vérifiable hors du PC d'exploitation : plein écran sur un second moniteur, comportement de F1 dans Edge.

## Version 0.3.0

Lot 3, première livraison (pull request n° 3) : écrans de sortie prompteur et incrustation, plein écran au double-clic, « Noir » (F1), « Ouvrir un écran de sortie » (F2), voyants, aperçus, resynchronisation. Essai d'Hervé : F1 et F2 fonctionnent ; retours traités dans la 0.3.1.

## Version 0.2.0

Lot 2 (pull request n° 2) : écran opérateur, conduite, éditeur de chansons, import et export `.txt`, défilement des lignes. Validé par Hervé.

## Version 0.1.0

Lot 1 (pull request n° 1) : noyau (découpage en mots, « _ », comparaison, format `.txt`) et tests des règles 1 à 5 et 8. Validé par Hervé.

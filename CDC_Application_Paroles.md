# Cahier des charges : application « Paroles »

Émission « N'oubliez pas les paroles », édition BTS Audiovisuel, Saint-Genès La Salle (Bordeaux)
Tournage pédagogique en condition du direct le samedi 16 janvier 2027, sans public ni diffusion.
Rédaction : Hervé Obejero, formateur. Date : 27 novembre 2026.

---

## 0. Consignes pour le développement (à lire en premier)

- Tu développes une application web **100 % locale et hors ligne**, livrée comme un dossier statique qui s'ouvre par double-clic sur `index.html` : pas de serveur, pas d'installation, pas de CDN, pas d'appel réseau.
- Stack conseillée : HTML, CSS et JavaScript (ou TypeScript compilé) sans framework lourd. Une étape de build est acceptée pendant le développement si le livrable final reste un dossier statique autonome.
- Code commenté en français, structuré en modules (paroles et éditeur, déroulé du jeu, comparaison, écran opérateur, écrans de sortie, sauvegarde).
- **Chaque action de l'opérateur a un bouton visible à l'écran.** Les raccourcis clavier sont un plus, jamais le seul moyen d'agir.
- Avance par lots (section 14) et fais valider chaque lot avant de passer au suivant.
- Si une exigence te paraît ambiguë ou contradictoire, pose la question au lieu de deviner. Signale toute exigence que tu ne peux pas tenir avec les API du navigateur.
- Écris des tests automatisés pour les règles de la section 13.

---

## 1. Ce que fait l'application

Les étudiants recréent le jeu télévisé « N'oubliez pas les paroles ». Un candidat chante sur un orchestre ou sur un playback en lisant les paroles à l'écran. Sur un passage de la chanson, les mots disparaissent et sont remplacés par des `_` : la musique continue et le candidat doit chanter les mots exacts. Ensuite, il donne sa proposition au présentateur, peut demander un joker, la bloque, et la réponse est révélée.

Un opérateur pilote l'application depuis la régie. Elle remplit **six fonctions**, dans cet ordre :

| N° | Fonction | Ce que fait l'opérateur | Ce que voit le candidat |
|:---|:---|:---|:---|
| 1 | Préparer les paroles | Avant l'émission, tape les paroles dans l'application ou importe un `.txt`, et marque les mots à trouver | Rien |
| 2 | Faire défiler | Pendant la chanson, passe à la ligne suivante en suivant le chant | Les paroles ligne par ligne, puis des `_` à la place des mots à trouver |
| 3 | Saisir la proposition | Tape les mots que le candidat propose, et les corrige s'il change d'avis | Ses mots en **jaune** à la place des `_` |
| 4 | Donner un joker | Sur demande du candidat, déclenche un joker « 2 mots » ou « 3 propositions » | L'aide du joker |
| 5 | Bloquer | Quand le candidat dit « je bloque », verrouille la proposition | Sa proposition en **bleu** |
| 6 | Révéler | Révèle la réponse mot par mot | Chaque mot en **vert** (juste) ou **rouge** (faux), les mots faux remplacés par les bons, puis « Bonne réponse » ou « Mauvaise réponse » |

**Hors périmètre :** aucune lecture audio, aucune synchronisation automatique (MIDI, timecode), aucun gain d'argent ou palier.

---

## 2. Environnement

| Élément | Exigence |
|:---|:---|
| Poste d'exploitation | PC sous Windows 10 ou 11 |
| Navigateur | Google Chrome ou Microsoft Edge à jour ; Firefox en secours |
| Écrans | 1 écran opérateur + 1 ou 2 écrans de sortie (prompteur candidat, régie vidéo), en 1920 × 1080 |
| Réseau | Aucun ; l'application fonctionne câble débranché |
| Polices | Embarquées dans le dossier (licence libre, très lisible) |

---

## 3. Les écrans

### 3.1 Écran opérateur

Une seule fenêtre en 1920 × 1080, en trois zones :

- **À gauche, la conduite :** la liste des chansons de l'émission dans l'ordre, avec pour chacune le candidat, la catégorie (thème à 10, 20, 30, 40 ou 50 points, « La même chanson », finale), le mode ORCHESTRE ou PLAYBACK, et l'état (à venir, en cours, jouée). Boutons : « Nouvelle chanson », « Modifier », « Monter », « Descendre », « Supprimer ».
- **Au centre, la chanson en cours :** toutes les lignes, la ligne affichée à l'antenne surlignée, la ligne suivante repérée, le passage à trou encadré. Les mots à trouver restent lisibles en clair pour l'opérateur.
- **À droite, le pilotage :**
  - les gros boutons de l'étape en cours (section 3.3) ;
  - la zone de saisie de la proposition (section 6) ;
  - les boutons de jokers avec le nombre restant pour le candidat (section 7) ;
  - l'aperçu de chaque écran de sortie, en temps réel.
- **Bandeau du haut :** nom de l'émission, voyant par écran de sortie ouvert, boutons « Ouvrir un écran de sortie », « Noir », « Préférences », « Enregistrer l'émission ».

### 3.2 Écrans de sortie

- Ouverts par le bouton « Ouvrir un écran de sortie », glissés sur l'écran voulu, puis mis en plein écran par un double-clic (le navigateur exige un geste de l'utilisateur).
- Jusqu'à **2 écrans de sortie**, chacun avec son mode :
  - **Prompteur :** fond sombre, gros caractères, pour le candidat ;
  - **Incrustation :** paroles dans un bandeau en bas de l'image, sur un fond uni noir ou vert, pour l'incrustation à la régie vidéo.
- Rien d'autre ne s'affiche sur un écran de sortie : pas de curseur, pas de bouton une fois en plein écran.
- Si un écran de sortie est fermé ou rechargé, il retrouve automatiquement l'affichage en cours à sa réouverture.

### 3.3 Boutons d'étape

L'écran opérateur ne montre en grand que les boutons utiles à l'étape en cours, pour éviter les erreurs :

| Étape | Boutons principaux |
|:---|:---|
| Chanson chargée | « Afficher le titre », « Commencer » |
| Défilement | « Ligne suivante », « Ligne précédente » |
| Passage à trou | « Ligne suivante », « Saisir la proposition » |
| Saisie | Champs de saisie, « Joker 2 mots », « Joker 3 propositions », « Bloquer » |
| Bloqué | « Révéler le mot suivant », « Tout révéler », « Débloquer » |
| Révélé | « Chanson suivante », « Rejouer la chanson » |

« Noir » (vide tous les écrans de sortie, un second clic réaffiche) et « Annuler la dernière action » restent toujours accessibles.

---

## 4. Fonction 1 : préparer les paroles

### 4.1 Éditeur intégré

- **Nouvelle chanson :** formulaire avec titre (obligatoire), artiste, candidat, catégorie, points, mode ORCHESTRE ou PLAYBACK, note libre.
- **Paroles :** grande zone de texte où l'opérateur tape ou colle les paroles, **une ligne de texte = une ligne affichée à l'écran**. Les lignes vides sont ignorées.
- **Mots à trouver :** l'opérateur sélectionne les mots à la souris puis clique sur « Marquer comme mots à trouver » ; ils apparaissent surlignés. « Démarquer » annule. Il y a **un seul passage à trou par chanson**, sur une ou plusieurs lignes qui se suivent.
- **Fausses propositions** (pour le joker « 3 propositions », section 7.2), rédigées en amont par les étudiants : deux champs « Fausse proposition 1 » et « Fausse proposition 2 », chacun avec **exactement le même nombre de mots** que le passage à trou. L'éditeur affiche le nombre de mots attendu et refuse un nombre différent.
- **Aperçu :** un bouton montre la chanson telle qu'elle s'affichera, `_` compris.
- **Contrôles à l'enregistrement**, avec un message clair : titre manquant, aucun mot à trouver, deux passages à trou séparés, fausses propositions absentes ou du mauvais nombre de mots (avertissement seulement : le joker « 3 propositions » sera alors indisponible pour cette chanson).

### 4.2 Import et export d'un fichier texte

Un fichier `.txt` en UTF-8 par chanson, éditable aussi dans le Bloc-notes :

```
# titre: Titre de la chanson
# artiste: Nom de l'artiste
# candidat: 1
# categorie: 20
# mode: ORCHESTRE
# faux1: autre suite de mots
# faux2: encore une autre suite

Première ligne de l'extrait
Deuxième ligne de l'extrait
Et je chante [ces mots à trouver]
[et la suite du trou] jusqu'ici
```

- Les lignes commençant par `#` sont des informations ; `titre` est obligatoire.
- `categorie` vaut `10`, `20`, `30`, `40`, `50`, `meme` (« La même chanson ») ou `finale`.
- Les mots à trouver sont entre crochets `[ ]` ; plusieurs groupes entre crochets sur des lignes qui se suivent forment un seul passage à trou.
- Import : glisser-déposer d'un ou plusieurs `.txt` sur l'écran opérateur, ou bouton « Importer ». Une erreur indique le fichier et le numéro de ligne.
- Export : « Exporter la chanson » crée le `.txt` correspondant.

### 4.3 Découpage en mots

- Un mot est une suite de caractères séparée par des espaces.
- Une apostrophe reste dans le mot : `j'ai` et `aujourd'hui` comptent chacun pour un mot.
- Un trait d'union reste dans le mot : `peut-être` compte pour un mot.
- La ponctuation collée au mot (`, . ! ? ; :`) est affichée dans les lignes normales mais ignorée dans le passage à trou et dans la comparaison.

---

## 5. Fonction 2 : faire défiler les paroles

- « Ligne suivante » (ou Espace) affiche la ligne suivante immédiatement, sans animation qui retarde (moins de 50 ms entre le clic et l'affichage).
- Les écrans de sortie montrent 2 lignes par défaut : la ligne en cours bien visible, la suivante atténuée (réglable à 1 ou 3 lignes).
- « Ligne précédente » permet de corriger une erreur à tout moment.
- Quand une ligne du passage à trou arrive, les mots à trouver sont remplacés par des `_` :
  - **un `_` par lettre** (accentuée ou non) ou par chiffre ;
  - l'apostrophe et le trait d'union restent visibles : `j'ai` devient `_'__`, `peut-être` devient `____-____` ;
  - la ponctuation n'est pas affichée ;
  - un léger espacement sépare les `_` d'un même mot pour qu'on puisse compter les lettres, et un espace nettement plus large sépare deux mots ;
  - les mots hors crochets de la même ligne restent affichés normalement ;
  - si une ligne est trop longue, sa taille de texte diminue automatiquement ; un mot n'est jamais coupé.

---

## 6. Fonction 3 : saisir la proposition du candidat

- « Saisir la proposition » affiche une **case par mot à trouver**, dans l'ordre (s'il y a 5 mots à trouver, il y a 5 cases).
- L'opérateur tape un mot par case ; Espace ou Tab passe à la case suivante, Maj+Tab revient à la précédente.
- Chaque mot tapé remplace ses `_` en **jaune** sur les écrans de sortie, en temps réel.
- Une case vide laisse ses `_` affichés ; à la révélation, elle comptera comme fausse.
- Tant que la proposition n'est pas bloquée, l'opérateur peut tout corriger : le candidat a le droit de changer d'avis.

---

## 7. Fonction 4 : les jokers

### 7.1 Joker « 2 mots »

- Révèle **2 mots** du passage à trou : ils s'affichent en **vert** à la place de leurs `_` et leurs cases de saisie sont remplies et verrouillées.
- Par défaut, ce sont les 2 premiers mots encore vides ; l'opérateur peut en choisir d'autres en cliquant sur les cases avant de confirmer.
- Si le passage à trou compte 2 mots ou moins, le joker est indisponible pour cette chanson.

### 7.2 Joker « 3 propositions »

- Affiche sur les écrans de sortie **3 versions du passage à trou**, repérées A, B et C : la bonne et les deux fausses propositions préparées dans l'éditeur.
- L'ordre est tiré au hasard au déclenchement du joker, puis reste fixe.
- Le candidat choisit ; l'opérateur clique sur la version choisie, qui remplit les cases de saisie (en jaune). Les 3 versions disparaissent alors de l'écran.
- Le joker est indisponible si la chanson n'a pas ses deux fausses propositions.

### 7.3 Règles communes

- Le **nombre de jokers de chaque type par candidat** se règle dans les préférences, pour toute l'émission (par défaut : 1 de chaque).
- L'écran opérateur affiche le nombre restant ; un bouton de joker est grisé quand il ne reste rien ou que le joker est indisponible pour la chanson.
- Un joker peut être annulé par « Annuler la dernière action » (erreur de clic) : il est alors rendu au candidat.
- Un joker n'est utilisable qu'avant le blocage.

---

## 8. Fonction 5 : bloquer

- « Bloquer » est possible même si des cases sont vides (le candidat peut bloquer sans tout trouver ; les cases vides compteront fausses).
- La proposition passe en **bleu** sur les écrans de sortie et les cases ne sont plus modifiables.
- « Débloquer » (avec confirmation) est réservé aux erreurs de manipulation.

---

## 9. Fonction 6 : révéler, afficher le statut et la correction

### 9.1 Comparaison des mots

L'application compare chaque case au mot attendu à la même place, après avoir ignoré :

- les majuscules ;
- la ponctuation ;
- la différence entre apostrophe droite `'` et typographique `’` ;
- les espaces en trop ;
- les accents, **selon le réglage** « tolérant » (par défaut) ou « strict ».

Le résultat calculé est **une suggestion** : avant et pendant la révélation, l'opérateur peut basculer un mot de juste à faux ou l'inverse d'un clic sur l'écran opérateur (par exemple pour une faute de frappe, ou un mot mal orthographié mais bien chanté). Un mot révélé par le joker « 2 mots » est toujours juste.

### 9.2 Révélation

- « Révéler le mot suivant » révèle les mots un par un, de gauche à droite ; « Tout révéler » révèle les mots restants d'un coup.
- **Mot juste :** passe du bleu au **vert**.
- **Mot faux :** passe en **rouge**, puis après un court délai (1,5 s par défaut, réglable) **il est remplacé par le bon mot**. Le bon mot reste marqué comme une correction (par défaut en blanc sur fond rouge, réglable) pour que l'on voie toujours quels mots étaient faux.
- Une case vide se comporte comme un mot faux : ses `_` passent en rouge puis sont remplacés par le bon mot.

### 9.3 Statut de la réponse

- Quand tous les mots sont révélés, les écrans de sortie affichent **« Bonne réponse »** si tous les mots sont justes, sinon **« Mauvaise réponse »** (textes et couleurs réglables).
- Le résultat est enregistré dans la conduite et dans le journal (section 12).

---

## 10. Conduite et candidats

- Les noms des candidats se saisissent dans les préférences (par défaut « Candidat 1 » et « Candidat 2 »).
- Chaque chanson est attribuée à un candidat ; c'est ce candidat dont les jokers sont décomptés.
- **« La même chanson » (souhaitable) :** deux propositions sont saisies séparément, une par candidat ; l'opérateur choisit laquelle afficher, puis les révèle l'une après l'autre.
- « Rejouer la chanson » remet la chanson au début et efface la proposition, pour refaire une prise. Une boîte de dialogue demande, avant de relancer, quoi faire des jokers utilisés sur cette chanson :
  - **« Rendre les jokers »** : le compteur du candidat revient à sa valeur d'avant la chanson ;
  - **« Garder les jokers consommés »** : le compteur reste tel quel ;
  - le choix par défaut proposé dans la boîte est réglable dans les préférences ; « Annuler » ferme la boîte sans rien relancer.
- Un bouton « Réinitialiser les jokers » dans les préférences remet les compteurs de tous les candidats à leur valeur de départ (avec confirmation), par exemple avant la générale ou le tournage.

---

## 11. Préférences

| Réglage | Valeurs | Défaut |
|:---|:---|:---|
| Noms des candidats | Texte libre | Candidat 1, Candidat 2 |
| Jokers par candidat | Nombre de « 2 mots » et de « 3 propositions », de 0 à 5 | 1 et 1 |
| Mode de chaque écran de sortie | Prompteur / Incrustation | Écran 1 prompteur, écran 2 incrustation |
| Nombre de lignes affichées | 1, 2, 3 | 2 |
| Taille du texte | Automatique ou fixe | Automatique |
| Fond de l'incrustation | Noir, vert, couleur libre | Noir |
| Couleurs | Proposé, bloqué, juste, faux, correction | Jaune, bleu, vert, rouge, blanc sur rouge |
| Délai avant correction d'un mot faux | 0 à 5 s | 1,5 s |
| Jokers à « Rejouer la chanson » | Choix proposé par défaut : rendre / garder | Rendre |
| Textes du statut | Texte libre | « Bonne réponse », « Mauvaise réponse » |
| Accents à la comparaison | Tolérant / strict | Tolérant |
| Raccourcis clavier | Modifiables (section 11.1) | Table de la section 11.1 |

Les couleurs et la typographie forment un thème propre à l'émission de l'école : **ne pas reproduire l'habillage ni le logo du programme télévisé**.

### 11.1 Raccourcis clavier

Configuration par défaut (pendant la saisie d'une proposition, les touches de lettres servent à taper et ne déclenchent aucun raccourci) :

| Action | Touche par défaut |
|:---|:---|
| Ligne suivante | Espace ou flèche droite (hors saisie) |
| Ligne précédente | Flèche gauche (hors saisie) |
| Étape suivante (commencer, saisir, bloquer) | Entrée |
| Case suivante / précédente pendant la saisie | Espace ou Tab / Maj+Tab |
| Révéler le mot suivant | R (hors saisie) |
| Tout révéler | Maj+R (hors saisie) |
| Chanson précédente / suivante dans la conduite | Flèche haut / bas (hors saisie) |
| Annuler la dernière action | Ctrl+Z |
| Noir | F1 |
| Ouvrir un écran de sortie | F2 |

Dans les préférences, un onglet « Raccourcis » permet de les modifier :

- clic sur une action, puis appui sur la nouvelle touche ou combinaison (Ctrl, Maj, Alt acceptés) ;
- si la touche est déjà utilisée, l'application le signale et propose de remplacer ou d'annuler ;
- les combinaisons que le navigateur ou Windows ne laissent pas intercepter (par exemple Ctrl+W, Alt+F4) sont refusées avec un message ;
- un bouton rétablit les touches par défaut ;
- l'aide-mémoire affiché à l'écran opérateur montre toujours les touches réellement actives.

---

## 12. Sauvegarde, sécurité et journal

- **Fichier d'émission :** « Enregistrer l'émission » crée un fichier `.json` qui contient toutes les chansons, la conduite, les candidats, les jokers restants et les préférences ; « Ouvrir une émission » le recharge. Le format comporte un numéro de schéma (`"schema": 1`).
- **Sauvegarde automatique** dans le navigateur à chaque action : après un rechargement accidentel ou un plantage, l'application propose « Reprendre là où on en était ».
- Un rappel s'affiche si l'émission a été modifiée depuis le dernier enregistrement du fichier.
- Aucune fenêtre bloquante du navigateur (`alert`, `confirm`) : les confirmations s'affichent dans la page.
- Fonctionnement continu pendant 4 heures sans ralentissement.
- **Journal :** chaque événement est horodaté avec l'heure du PC (chanson lancée, passage à trou, joker utilisé, proposition bloquée, résultat). Export en `.csv` pour retrouver les moments clés au montage.

---

## 13. Règles à tester automatiquement

1. Import `.txt` : bonnes lignes, bons mots, bon passage à trou, fausses propositions lues ; fichiers invalides refusés avec un message qui donne la ligne.
2. Affichage des `_` : `soir` → `____` ; `j'ai` → `_'__` ; `peut-être,` → `____-____` ; `été` → `___`.
3. Comparaison : `J'AI` = `j’ai` ; `toi,` = `toi` ; `coeur` = `cœur` et `ete` = `été` en mode tolérant, mais pas en mode strict.
4. Case vide = mot faux ; tous les mots justes = « Bonne réponse » ; un seul faux = « Mauvaise réponse ».
5. Une bascule manuelle juste ou faux l'emporte sur le calcul.
6. Joker « 2 mots » : révèle les 2 premiers mots vides, décrémente le compteur, indisponible à 0 ou si le trou compte 2 mots ou moins ; annulation = joker rendu.
9. « Rejouer la chanson » : avec « Rendre les jokers », le compteur revient à sa valeur d'avant la chanson ; avec « Garder les jokers consommés », il ne change pas.
7. Joker « 3 propositions » : 3 versions dont la bonne, ordre fixe après tirage, indisponible sans fausses propositions ; le choix remplit les cases.
8. Une fausse proposition qui n'a pas le même nombre de mots que le passage à trou est refusée par l'éditeur.

---

## 14. Lots de développement et recette

| Lot | Contenu | Validation |
|:---|:---|:---|
| 1 | Modèle de données, import/export `.txt`, découpage en mots, `_`, comparaison, tests de la section 13 (règles 1 à 5 et 8) | Tous les tests passent |
| 2 | Écran opérateur : conduite, éditeur de chansons, défilement des lignes | Une chanson tapée dans l'éditeur se déroule à l'écran opérateur, à la souris et au clavier |
| 3 | Écrans de sortie prompteur et incrustation, plein écran, « Noir », resynchronisation | 2 écrans de sortie suivent l'opérateur sans décalage visible |
| 4 | Saisie, blocage, révélation, correction, statut | Scénarios tout juste, partiellement faux et cases vides conformes |
| 5 | Jokers « 2 mots » et « 3 propositions », compteurs par candidat, « Rejouer la chanson » avec choix sur les jokers, tests 6, 7 et 9 | Jokers conformes aux sections 7 et 10 |
| 6 | Préférences, raccourcis modifiables, sauvegarde automatique, fichier d'émission, journal | Rechargement en pleine chanson sans perte ; raccourci modifié actif et conservé |
| 7 | « La même chanson » (souhaitable) | Selon le temps disponible |

**Recette finale sur le PC d'exploitation :**

- le dossier copié depuis une clé USB fonctionne hors ligne ;
- 8 chansons saisies ou importées, une émission complète jouée de bout en bout avec les deux jokers, sur 2 écrans de sortie en plein écran ;
- test de panne : fermeture d'un écran de sortie, rechargement de l'écran opérateur ;
- 4 heures de fonctionnement continu.

---

## 15. Livrables

- Le dossier de l'application (`index.html` et ses ressources), prêt à copier.
- Un fichier `LISEZMOI.md` : lancement, ouverture des écrans de sortie, déroulé d'une chanson, jokers, raccourcis, format des fichiers `.txt`.
- 2 chansons d'exemple aux paroles inventées (aucune parole protégée dans le dépôt).
- Les tests automatisés et la commande pour les lancer.

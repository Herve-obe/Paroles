# Protocole de livraison : du changement au test par Hervé

Ce document décrit la marche à suivre, toujours la même, pour toute session Claude Code qui modifie AV Diagram. Il est référencé par `CLAUDE.md`, donc chargé à chaque session. Rédigé le 27 novembre 2026 d'après la pratique des versions 0.5.32 à 0.5.38.

Principe : une modification n'est « livrée » que lorsque la CI est verte sur le commit poussé et qu'Hervé a reçu le lien de l'installeur. Elle n'est « validée » que lorsqu'Hervé l'a essayée.

## Repères fixes

| Élément | Valeur |
|---|---|
| Dépôt | `Herve-obe/AV-DIAGRAM_Claude-Code` |
| Branche de travail | `claude/audiovisual-schema-app-wxgoez` |
| Pull request | n° 1, ouverte sur cette branche. Ne pas en créer d'autre sans demande. La fusion est une décision d'Hervé. |
| Installeur Windows de test | artefact `AV-Diagram-Windows-test` du workflow CI |
| Image macOS de test | artefact `AV-Diagram-macOS-universal-test` |
| Manuel PDF de test | artefact `AV-Diagram-Manual-test` |
| Durée de conservation des artefacts | 30 jours |

Dans une session en ligne, le dépôt de travail peut être cloné à côté du dossier principal de la session (par exemple `/home/user/av-diagram_claude-code` à côté de `/home/user/AV-DIAGRAM`). Vérifier le dépôt avec `git remote -v` avant toute modification.

## Étape 1. Comprendre et cadrer

1. Relire la demande d'Hervé et la section concernée de `CLAUDE.md`.
2. Lire `docs/etat-avancement.md` (section « Situation actuelle ») pour connaître la dernière version et ce qui reste ouvert.
3. `git fetch` puis `git status` : partir de la tête de la branche de travail, arbre propre.
4. Si la demande est ambiguë sur un point que seul Hervé peut trancher, poser la question avant de coder. Sinon, avancer.

## Étape 2. Développer

1. Règle métier dans `src/model/`, avec son test dans un fichier `*.test.ts` du même dossier. État dans `src/store/`. Interface dans `src/editor/` et `src/ui/`.
2. Tout texte visible dans `src/i18n/fr.json` et `src/i18n/en.json`, mêmes clés.
3. Couleurs : uniquement les variables de `src/styles/tokens.css`.
4. Pour un correctif : écrire d'abord le test qui reproduit le défaut, le voir échouer, puis corriger.
5. Fiche d'équipement : rien d'inventé, une source datée par fiche vérifiée (règles de la section Bibliothèque de `CLAUDE.md`).

## Étape 3. Numéro de version

Changer de version dès que le contenu livré change : code, bibliothèque, textes de l'interface, manuel. Pas de changement de version pour une modification de documentation interne seule (`docs/developpement`, `docs/inventaire`, `CLAUDE.md`).

Incrémenter le dernier chiffre (0.5.38 devient 0.5.39) dans ces six endroits, puis régénérer le manuel :

1. `package.json`
2. `package-lock.json` (deux occurrences, en tête de fichier)
3. `src-tauri/Cargo.toml`
4. `src-tauri/Cargo.lock` (bloc `name = "av-diagram"`)
5. `src-tauri/tauri.conf.json`
6. `docs/manuel-utilisateur.md` (ligne « Version … · Édition du … », mettre aussi la date)

Puis :

- ajouter en tête de `docs/etat-avancement.md` une section « Situation actuelle — X.Y.Z » (l'ancienne devient « Version X.Y.Z ») : ce qui change, pourquoi, ce qui reste ouvert ;
- mettre à jour le manuel si un comportement visible change ;
- régénérer le manuel : `python -m pip install reportlab==4.4.9` (dans un environnement virtuel si le système le refuse), puis `python scripts/build-manual.py`. Le fichier `public/manuel.html` doit être modifié en conséquence.

## Étape 4. Contrôles locaux, avant tout commit

Dans cet ordre, et tous au vert :

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

- Si le Rust de `src-tauri/` a changé et que la chaîne Rust est disponible : `cargo test --locked --manifest-path src-tauri/Cargo.toml --lib`.
- Ce qui ne se vérifie que par la CI (à dire tel quel dans le compte-rendu, sans le présenter comme vérifié) : construction de l'installeur Windows, disposition de la fenêtre native, installation silencieuse, image macOS.
- Un test qui échoue ne se désactive pas et ne se contourne pas. S'il fige un état devenu faux, on l'adapte en expliquant pourquoi dans le commit.

## Étape 5. Commit

1. Relire son propre diff (`git diff`) comme le ferait un relecteur : rien d'étranger à la demande, aucun fichier temporaire, aucun cache non voulu.
2. Un commit par changement cohérent. Message en français : une ligne de titre qui dit le résultat et porte la version entre parenthèses, puis le pourquoi en quelques lignes.
3. Terminer le message par les lignes d'attribution que la session fournit. Ne rien y ajouter.
4. Ne jamais réécrire l'historique déjà poussé (pas de `--amend` ni de `push --force` sur la branche partagée).

## Étape 6. Push

```bash
git push -u origin claude/audiovisual-schema-app-wxgoez
```

En cas d'erreur réseau, réessayer jusqu'à quatre fois en espaçant. Ne pousser sur aucune autre branche sans accord explicite.

## Étape 7. CI : attendre et lire le résultat

Chaque push lance le workflow `CI` (environ 7 minutes) avec quatre jobs utiles :

| Job | Machine | Ce qu'il prouve |
|---|---|---|
| `check` | Ubuntu | manuel, lint, typage, tests, construction |
| `native` | Windows | tests Rust, construction de l'installeur NSIS, fenêtre native après relances |
| `windows-installer` | Windows | installation silencieuse de l'installeur produit par `native` |
| `macos` | macOS | construction de l'image universelle |

Les jobs marqués « skipped » sur la page de la pull request sont normaux : ce sont les doublons de l'événement pull request et les jobs du workflow `Desktop`, qui ne tournent que sur un tag `v*` ou un commit dont le message contient `[build]`.

Marche à suivre :

1. Après le push, programmer un contrôle différé (environ 25 minutes) plutôt que d'attendre en boucle.
2. Lire les check runs de la pull request n° 1 sur le commit de tête.
3. Tout est vert : passer à l'étape 8.
4. Un job est rouge : lire ses journaux, trouver la cause, corriger, refaire les étapes 4 à 7. « Instable » n'est pas une cause. Une seule relance des jobs échoués est admise, et seulement si l'échec est survenu avant tout test (installation, perte de la machine) ; un second échec est réel.
5. Ne jamais annoncer « la CI est verte » sans l'avoir lue sur le commit exact.

Le workflow `Local AI` (essai du modèle réel) ne bloque rien : il tourne à la demande ou le lundi.

## Étape 8. Remise à Hervé

Message de remise, dans cet ordre :

1. ce qui est livré, en une ou deux phrases, avec le numéro de version et le commit ;
2. l'état de la CI, job par job si l'un d'eux mérite une remarque ;
3. le lien direct du run, de la forme `https://github.com/Herve-obe/AV-DIAGRAM_Claude-Code/actions/runs/<numéro>`, et le nom de l'artefact à télécharger ;
4. ce qu'il faut essayer, pas à pas, et le résultat attendu ;
5. ce qui n'a pas pu être vérifié et ce qui reste ouvert.

Ne pas présenter comme vérifié ce qui ne l'a pas été. Si un essai a échoué ou a été sauté, le dire.

## Étape 9. Essai par Hervé

1. Ouvrir le lien du run, descendre à « Artifacts », télécharger `AV-Diagram-Windows-test` (archive zip contenant `…-setup.exe`). Il faut être connecté à GitHub.
2. Installer par-dessus la version précédente. L'installeur n'est pas signé : Windows affiche un avertissement, choisir « Informations complémentaires » puis « Exécuter quand même ».
3. Vérifier le numéro de version dans le logiciel avant tout essai : il doit être celui annoncé.
4. Suivre les pas d'essai du message de remise. Pour l'assistant IA : projet vide, conversation effacée, moteur local uniquement (aucun essai payant sans accord).
5. Rapporter à la session : la version essayée, ce qui a été fait, ce qui était attendu, ce qui s'est produit, le temps de réponse affiché si l'assistant est en cause, et une capture d'écran si l'affichage est en cause.

## Étape 10. Après le retour d'Hervé

- Essai concluant : le noter dans `docs/etat-avancement.md` au prochain changement de version. La fusion de la pull request reste à sa main.
- Défaut constaté : le reproduire par un test, puis reprendre à l'étape 2. Un correctif est une nouvelle version, jamais une réécriture de la précédente.
- Sans retour : ne pas considérer l'essai comme fait. Le rappeler dans la liste de ce qui reste ouvert.

## Ce qui ne se fait pas sans accord explicite

- créer une pull request, fusionner, pousser sur une autre branche ;
- utiliser une clé d'IA payante pour un essai ;
- supprimer des fiches du dépôt (une fiche écartée passe par `src/library/excluded.json`) ;
- contourner un site qui refuse l'accès automatisé ;
- envoyer vers un service extérieur autre chose que des noms de marques et de modèles.

# Paroles : consignes pour les sessions Claude Code

Application web locale et hors ligne qui pilote l'affichage des paroles du jeu « N'oubliez pas les paroles » recréé par les BTS Audiovisuel (tournage le 16 janvier 2027). Interlocuteur : Hervé Obejero, formateur, non développeur : expliquer pas à pas, sans jargon, en français.

## Références

- **Cahier des charges** : `CDC_Application_Paroles.md`, référence unique. Toute règle changée par Hervé y est reportée dans le même commit (section 16 pour l'historique des décisions).
- **Protocole de livraison** : `protocole-de-livraison.md`. Rédigé pour un autre projet d'Hervé (AV Diagram) ; il s'applique à Paroles avec les correspondances ci-dessous.
- **État d'avancement** : `docs/etat-avancement.md` (section « Situation actuelle » en tête).

## Application du protocole de livraison à Paroles

| Protocole (AV Diagram) | Paroles |
|---|---|
| Dépôt `Herve-obe/AV-DIAGRAM_Claude-Code` | `Herve-obe/Paroles` |
| Branche de travail | celle indiquée par la session (jusqu'ici `claude/elegant-noether-eg3nlh`) |
| Pull request n° 1 unique | une pull request par lot (décision 27 du cahier des charges) ; la fusion est la décision d'Hervé |
| Règles métier `src/model/` + tests `*.test.ts` | `app/js/noyau/` + tests `tests/unitaires/*.test.js` ; interface : `tests/interface/*.test.js` |
| Textes `src/i18n/` | interface entièrement en français, textes dans le code |
| Version : 6 endroits | 4 endroits, vérifiés par `tests/unitaires/version.test.js` : `app/js/version.js`, `package.json`, `LISEZMOI.md` (ligne « Version … · Édition du … »), `docs/etat-avancement.md` (« Situation actuelle : X.Y.Z ») |
| Manuel PDF | `LISEZMOI.md` (mis à jour à chaque changement visible) |
| `npm run lint && typecheck && test && build` | `npm run verifier` (tests des règles puis tests de l'interface) |
| Workflow `CI`, jobs check / native / windows-installer / macos | workflow `CI`, job `check` (Ubuntu) : tests des règles, tests de l'interface dans Chromium, artefact |
| Artefact `AV-Diagram-Windows-test` | artefact `Paroles-app-test` : dossier `Paroles` (`app/` + `LISEZMOI.md`), à extraire puis double-cliquer sur `app/index.html` ; pas d'installation |
| Vérifier la version dans le logiciel | version affichée en haut à gauche de l'écran opérateur (« version X.Y.Z ») |
| Ce qui ne se vérifie que sur le poste | Windows, Chrome et Edge réels, deux moniteurs, plein écran sur le second écran, touche F1, mise à l'échelle Windows |

## Règles du projet

- Dossier statique ouvert par double-clic : pas de serveur, pas de CDN, aucun appel réseau, scripts classiques (pas de modules JavaScript, bloqués en `file://`).
- Chaque action a un bouton visible ; les raccourcis sont un plus.
- Aucune fenêtre bloquante du navigateur (`alert`, `confirm`) : confirmations dans la page.
- Aucune parole de chanson protégée dans le dépôt ; ne pas reproduire le logo ni l'habillage du programme télévisé.
- Développement par lots (section 14 du cahier des charges) ; tests d'abord ; arrêt après chaque lot jusqu'à « lot validé ».
- Ne jamais réécrire l'historique poussé ni supprimer sans accord d'Hervé.

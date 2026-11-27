/*
 * Utilisé seulement par Node.js : charge l'outil de test et les modules
 * du noyau de l'application, dans le même ordre que dans index.html.
 * Dans le navigateur, c'est tests/tests.html qui charge ces fichiers.
 */
require('./outil-tests.js');
require('../app/js/noyau/mots.js');
require('../app/js/noyau/comparaison.js');
require('../app/js/noyau/chanson.js');
require('../app/js/noyau/format-txt.js');
require('../app/js/noyau/emission.js');
require('../app/js/noyau/jeu.js');
require('../app/js/noyau/edition.js');
require('../app/js/noyau/preferences.js');
require('../app/js/noyau/affichage.js');

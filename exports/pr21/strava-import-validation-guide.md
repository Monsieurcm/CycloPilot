# PR21 - Guide de validation d'import FIT dans Strava

## Objectif
Valider qu'un FIT exporte depuis CycloPilot est accepte sans erreur par Strava et que les metriques essentielles sont bien reconnues.

## 1) Export FIT depuis CycloPilot
1. Ouvrir l'application web CycloPilot.
2. Importer un fichier GPX avec le bouton d'import.
3. Lancer la simulation avec la strategie de puissance souhaitee.
4. Laisser la simulation atteindre l'etat termine.
5. Cliquer sur Exporter l'activite (.FIT).
6. Noter le nom du fichier telecharge et le nombre de points exportes affiche par l'UI.

Resultat attendu:
- Un fichier .fit est telecharge localement.
- Un message de succes post-export est visible dans l'interface.

## 2) Import manuel dans Strava
1. Se connecter a son compte Strava sur le web.
2. Ouvrir le menu Upload activity.
3. Choisir File upload.
4. Selectionner le fichier .fit exporte depuis CycloPilot.
5. Valider l'import.

Resultat attendu:
- Aucune erreur bloquante a l'import.
- L'activite apparait dans le flux.

## 3) Champs a verifier dans Strava
Verifier systematiquement les champs suivants entre CycloPilot et Strava:

1. Distance: la distance totale est presente et coherente.
2. Duree: la duree totale est presente et coherente.
3. Denivele: le denivele positif est present et plausible.
4. Vitesse moyenne: valeur visible et cohérente avec la simulation.
5. Puissance moyenne: valeur visible et cohérente avec la simulation.
6. Calories: valeur presente et non nulle si la simulation a de la puissance.
7. Date/heure: date de debut et heure de debut correctes.
8. Trace GPS: trace visible sur la carte et sans points aberrants.

## 4) Grille de verification rapide
- Import Strava: OK / KO
- Distance: OK / KO
- Duree: OK / KO
- Denivele: OK / KO
- Vitesse moyenne: OK / KO
- Puissance moyenne: OK / KO
- Calories: OK / KO
- Date/heure: OK / KO
- Trace GPS: OK / KO
- Commentaires / ecarts constates: ...

## 5) Regles de correction si ecart
1. Corriger uniquement les champs FIT necessaires a l'import/reconnaissance.
2. Ne pas modifier le moteur de simulation.
3. Ne pas ajouter de metrique nouvelle.
4. Re-exporter, re-tester dans Strava, puis consigner le resultat.

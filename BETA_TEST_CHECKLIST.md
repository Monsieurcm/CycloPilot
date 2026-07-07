# CycloPilot - Beta Test Checklist

## Scope
Objectif: valider sur le terrain la boucle complete GPX -> simulation -> export FIT -> import Strava.

Contraintes de cette phase beta:
- aucun changement du moteur physique;
- aucune nouvelle metrique;
- aucune meteo;
- aucune fatigue;
- aucun vent.

## 0. Pre-flight technique
1. Recuperer la derniere version de main.
2. Executer `pnpm build` a la racine du repo.
3. Verifier qu'aucun artefact de build n'est versionne:
   - `.next`
   - `.turbo`
   - `*.tsbuildinfo`
   - `apps/web/next-env.d.ts`
4. Verifier les prealables PR precedentes:
   - export FIT disponible en fin de simulation;
   - metadonnees FIT enrichies (sport/sous-sport, distance, duree, moyennes, calories, energie);
   - tests FIT automatiques passent pendant le build.

## 1. Import d'un GPX
1. Ouvrir l'application CycloPilot (web).
2. Importer un GPX.
3. Verifier que le trace est charge et visible.

Checks:
- [ ] GPX charge sans erreur.
- [ ] Le parcours est visible sur la carte.

## 2. Simulation
1. Choisir la strategie de puissance deja disponible.
2. Lancer la simulation.
3. Laisser terminer la simulation.

Checks:
- [ ] La simulation se termine sans crash.
- [ ] Les metriques UI evoluent de maniere coherente.

## 3. Verification des metriques avant export
Verifier le panneau de resume complet avant export:
- duree simulee;
- distance;
- vitesse moyenne;
- puissance moyenne;
- denivele positif;
- energie estimee (kJ);
- calories estimees.

Checks:
- [ ] Toutes les metriques sont presentes.
- [ ] Les valeurs sont plausibles pour le parcours.

## 4. Export FIT
1. Cliquer sur exporter FIT en fin de simulation.
2. Verifier le message de succes.
3. Noter:
   - nom du fichier;
   - nombre de points exportes.

Checks:
- [ ] Fichier `.fit` telecharge.
- [ ] Message de succes affiche.
- [ ] Nom fichier et nombre de points affiches.

## 5. Import manuel dans Strava
1. Se connecter a Strava web.
2. Ouvrir Upload activity -> File upload.
3. Importer le fichier FIT exporte.

Checks:
- [ ] Import accepte sans erreur bloquante.
- [ ] Activite visible dans le flux.

## 6. Points a controler apres import Strava
Comparer Strava avec CycloPilot.

Checks:
- [ ] Distance
- [ ] Duree
- [ ] D+ (denivele positif)
- [ ] Vitesse moyenne
- [ ] Calories
- [ ] Trace GPS
- [ ] Date
- [ ] Heure

## 7. Journal d'ecarts (si besoin)
Pour chaque ecart detecte:
1. Identifier le champ impacte.
2. Noter la valeur CycloPilot et la valeur Strava.
3. Classer la severite (bloquant / mineur).
4. Ouvrir un correctif FIT cible (sans changement fonctionnel).

# CycloPilot

CycloPilot est un simulateur de cyclisme virtuel visant à proposer une expérience de course réaliste à partir de traces GPX, de données de simulation et de visualisation web.

## Structure du projet

```text
CycloPilot/
├── apps/
│   ├── api/                    # API NestJS
│   │   ├── src/
│   │   │   ├── app.controller.ts
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   └── package.json
│   └── web/                    # Interface web Next.js
│       ├── app/
│       │   ├── globals.css
│       │   ├── layout.tsx
│       │   ├── page.tsx
│       └── public/
├── packages/                   # Librairies partagées
│   ├── shared/                 # Types et utilitaires partagés
│   ├── ui/                     # Composants UI réutilisables
│   ├── gpx-engine/             # Parsing et traitement de traces GPX
│   ├── simulation-engine/      # Moteur physique de simulation
│   └── fit-engine/             # Parsing et traitement de fichiers FIT
├── .eslintrc.json
├── .prettierrc.json
├── .env.example
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
└── README.md
```

## Prérequis

- Node.js 20+
- pnpm 10+
- Docker Desktop (optionnel, pour la base de données locale)

## Démarrage rapide

1. **Cloner le repository et installer les dépendances** :

   ```bash
   git clone https://github.com/Monsieurcm/CycloPilot.git
   cd CycloPilot
   pnpm install
   ```

2. **Configurer l'environnement** :

   ```bash
   cp .env.example .env.local
   ```

3. **Démarrer les applications en mode développement** :
   ```bash
   pnpm dev
   ```
   - API accessible sur `http://localhost:4000`
   - Web accessible sur `http://localhost:3000`

## Scripts utiles

| Script           | Description                                 |
| ---------------- | ------------------------------------------- |
| `pnpm dev`       | Démarrer l'API et web en mode développement |
| `pnpm build`     | Compiler tous les packages et applications  |
| `pnpm lint`      | Lancer ESLint sur tout le code              |
| `pnpm typecheck` | Vérifier les types TypeScript               |
| `pnpm format`    | Formater le code avec Prettier              |
| `pnpm test`      | Lancer les tests (à configurer)             |

## Architecture

### Applications

- **API** (`apps/api/`) : Serveur NestJS pour la gestion des simulations et données
- **Web** (`apps/web/`) : Interface utilisateur Next.js avec React

### Packages

- **shared** : Types TypeScript partagés (`HealthResponse`, `RideMetrics`, `BikeProfile`, etc.)
- **gpx-engine** : Parsing et traitement des traces GPX
- **simulation-engine** : Moteur de simulation de la physique du cyclisme
- **fit-engine** : Parsing des fichiers FIT (format Garmin)
- **ui** : Composants UI réutilisables (en développement)

## Statut de développement

✅ Structure monorepo avec Turbo  
✅ Configuration TypeScript centralisée  
✅ ESLint et Prettier configurés  
✅ Types partagés entre applications  
✅ Packages engines avec structure de base

🚧 À faire:

- Implémenter les parsers GPX et FIT
- Développer le moteur de simulation physique
- Connecter l'API avec la base de données
- Créer les endpoints API
- Implémenter les tests

## Configuration ESLint

Les règles ESLint sont centralisées dans [.eslintrc.json](.eslintrc.json) :

- TypeScript strict enabled
- React plugins pour JSX
- Variables inutilisées détectées (sauf avec préfixe `_`)
- Logs en console limités aux warnings et erreurs

## Contribution

Les modifications doivent respecter :

- Le format TypeScript strict
- Les règles ESLint (lancées via `pnpm lint`)
- Le format Prettier (lancées via `pnpm format`)

```bash
pnpm build
pnpm lint
pnpm test
pnpm typecheck
```

## État actuel

Le projet est en phase de structure initiale. Les applications web et API sont prévues pour être développées dans les dossiers respectifs sous `apps/`.
packages/
└── gpx-engine/
├── package.json
├── tsconfig.json
└── src/
├── index.ts
├── parser.ts
├── haversine.ts
├── types.ts
└── statistics.ts
{
"name": "@cyclopilot/gpx-engine",
"version": "0.1.0",
"type": "module",
"main": "./dist/index.js",
"types": "./dist/index.d.ts",
"scripts": {
"build": "tsc -p tsconfig.json"
},
"dependencies": {
"fast-xml-parser": "^5.0.0"
}
}
export interface TrackPoint {
lat: number;
lon: number;
ele?: number;
time?: Date;
}

export interface RouteStatistics {
distance: number;
elevationGain: number;
elevationLoss: number;
points: number;
}

export interface ParsedRoute {
points: TrackPoint[];
statistics: RouteStatistics;
}
const EARTH_RADIUS = 6371000;

const toRad = (value: number) => value * Math.PI / 180;

export function haversineDistance(
lat1: number,
lon1: number,
lat2: number,
lon2: number
): number {

const dLat = toRad(lat2 - lat1);
const dLon = toRad(lon2 - lon1);

const a =
Math.sin(dLat / 2) ** 2 +
Math.cos(toRad(lat1)) *
Math.cos(toRad(lat2)) *
Math.sin(dLon / 2) ** 2;

return 2 * EARTH_RADIUS * Math.asin(Math.sqrt(a));

}
import { TrackPoint } from "./types";
import { haversineDistance } from "./haversine";

export function computeStatistics(points: TrackPoint[]) {

let distance = 0;
let gain = 0;
let loss = 0;

for (let i = 1; i < points.length; i++) {

    distance += haversineDistance(
      points[i - 1].lat,
      points[i - 1].lon,
      points[i].lat,
      points[i].lon
    );

    if (
      points[i].ele !== undefined &&
      points[i - 1].ele !== undefined
    ) {

      const diff = points[i].ele! - points[i - 1].ele!;

      if (diff > 0) gain += diff;
      else loss += Math.abs(diff);

    }

}

return {

    distance,

    elevationGain: gain,

    elevationLoss: loss,

    points: points.length

};

}
import { XMLParser } from "fast-xml-parser";
import { computeStatistics } from "./statistics";
import { ParsedRoute, TrackPoint } from "./types";

export function parseGPX(xml: string): ParsedRoute {

const parser = new XMLParser({
ignoreAttributes: false
});

const doc = parser.parse(xml);

const track =
doc.gpx.trk.trkseg.trkpt;

const points: TrackPoint[] = track.map((p: any) => ({

    lat: Number(p["@_lat"]),

    lon: Number(p["@_lon"]),

    ele: p.ele ? Number(p.ele) : undefined,

    time: p.time ? new Date(p.time) : undefined

}));

return {

    points,

    statistics: computeStatistics(points)

};

}
export * from "./parser";
export * from "./statistics";
export * from "./types";
apps/web/
├── app/
│ └── page.tsx
│
├── components/
│ ├── map/
│ │ └── MapView.tsx
│ │
│ ├── upload/
│ │ └── GpxUploader.tsx
│ │
│ └── sidebar/
│ └── StatisticsPanel.tsx
│
├── hooks/
│ └── useGpx.ts
│
└── stores/
└── simulationStore.ts
{
"dependencies": {
"@cyclopilot/gpx-engine": "workspace:*",
"zustand": "^5.0.5",
"maplibre-gl": "^5.6.0",
"react-dropzone": "^14.3.8"
}
}
import { create } from "zustand";
import type { ParsedRoute } from "@cyclopilot/gpx-engine";

interface SimulationState {
route?: ParsedRoute;
setRoute: (route: ParsedRoute) => void;
}

export const useSimulationStore =
create<SimulationState>((set) => ({
route: undefined,
setRoute: (route) => set({ route })
}));import { parseGPX } from "@cyclopilot/gpx-engine";

export async function loadGpx(file: File) {
const xml = await file.text();

return parseGPX(xml);
}
"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { loadGpx } from "@/hooks/useGpx";
import { useSimulationStore } from "@/stores/simulationStore";

export default function GpxUploader() {

    const setRoute = useSimulationStore(
        state => state.setRoute
    );

    const onDrop = useCallback(async(files:File[])=>{

        if(!files.length) return;

        const parsed = await loadGpx(files[0]);

        setRoute(parsed);

    },[]);

    const {getRootProps,getInputProps}=useDropzone({
        onDrop,
        accept:{
            "application/gpx+xml":[".gpx"]
        }
    });

    return(

        <div {...getRootProps()}>

            <input {...getInputProps()} />

            <h2>Déposer un GPX ici</h2>

        </div>

    );

}
"use client";

import { useSimulationStore } from "@/stores/simulationStore";

export default function StatisticsPanel(){

    const route=useSimulationStore(
        s=>s.route
    );

    if(!route){

        return <p>Aucun parcours chargé.</p>;

    }

    return(

        <div>

            <p>Distance :
            {(route.statistics.distance/1000).toFixed(2)} km</p>

            <p>D+ :
            {route.statistics.elevationGain.toFixed(0)} m</p>

            <p>D- :
            {route.statistics.elevationLoss.toFixed(0)} m</p>

            <p>Points :
            {route.statistics.points}</p>

        </div>

    );

}
export interface TrackPoint {

    lat:number;

    lon:number;

    ele:number;

    time?:Date;

    distance:number;

    cumulativeDistance:number;

    grade:number;

    heading:number;

}
packages/gpx-engine

src

parser.ts

statistics.ts

haversine.ts

bearing.ts

elevation.ts

simplify.ts

validator.ts

profile.ts

types.ts
export function bearing(
lat1:number,
lon1:number,
lat2:number,
lon2:number
){

// retourne 0-360°

}
grade =
deltaElevation /
deltaDistance

point.grade
4%

7%

-3%

etc.
[
{
distance:0,
elevation:52
},

{
distance:120,
elevation:55
}
]
XML

↓

Validation

↓

Tracks

↓

Segments

↓

Points

↓

Distance

↓

Altitude

↓

Heading

↓

Grade

↓

Statistics
tests/

parser.test.ts

statistics.test.ts

grade.test.ts

bearing.test.ts

simplify.test.ts
packages/
└── simulation-engine/
├── package.json
├── tsconfig.json
└── src/
├── index.ts
├── types.ts
├── SimulationController.ts
├── models/
│ ├── RiderModel.ts
│ ├── BikeModel.ts
│ ├── EnvironmentModel.ts
│ └── SimulationOptions.ts
├── physics/
│ ├── Gravity.ts
│ ├── RollingResistance.ts
│ ├── Aerodynamics.ts
│ └── PhysicsSolver.ts
├── engines/
│ ├── PowerEngine.ts
│ ├── CadenceEngine.ts
│ ├── SpeedEngine.ts
│ └── TimelineEngine.ts
└── tests/
export interface RiderModel {
weightKg: number;
ftpWatts: number;
maxHeartRate: number;
}export interface BikeModel {
weightKg: number;
crr: number;
cda: number;
export interface EnvironmentModel {
windSpeed: number;
windDirection: number;
temperature: number;
}export interface SimulationOptions {

    targetPower:number;

    cadence:number;

    timeStepSeconds:number;

}Puissance

↓

Force

↓

Résistance

↓

Vitesse théorique
Puissance cible
Cadence
Pente
Puissance réellement délivrée
Power

↓

Physics

↓

Grade
Speed (m/s)
export interface SimulationFrame {

    second:number;

    latitude:number;

    longitude:number;

    elevation:number;

    speed:number;

    distance:number;

    power:number;

    cadence:number;

}
GPX Engine

↓

TrackPoints

↓

PhysicsSolver

↓

SpeedEngine

↓

TimelineEngine

↓

Simulation Frames
POST /simulation/run
{
"routeId": "uuid",
"targetPower": 220,
"cadence": 90
}
{
"durationSeconds": 5142,
"distanceMeters": 42135,
"averageSpeed": 8.2,
"frames": 5142
}
apps/web/src/

components/
map/
MapView.tsx
RouteLayer.tsx
RiderMarker.tsx
StartMarker.tsx
FinishMarker.tsx

    simulation/
        SimulationControls.tsx
        PlaybackControls.tsx
        Timeline.tsx
        MetricsPanel.tsx

hooks/
useSimulation.ts

stores/
simulationStore.ts

services/
simulationApi.ts
ParsedRoute
TrackPoints

↓

GeoJSON

↓

MapLibre Source

↓

LineLayer
SimulationFrame

↓

Latitude

Longitude

Heading

↓

MapLibre Marker
Marker.setLngLat(...)
▶ Lecture

⏸ Pause

⏹ Stop

↺ Retour début
Vitesse :

0.5×

1×

2×

4×

8×
0 km ------------------------------- 42 km
●
Temps

Distance

Vitesse

Altitude

Pente

Puissance cible

Cadence
play()

pause()

stop()

seek()

speed()
TimelineEngine

↓

SimulationFrame

↓

Store Zustand

↓

Map

↓

Dashboard

↓

Timeline
+---------------------------------------------------------+
| Header |
+---------------------------------------------------------+
| |
| Carte MapLibre |
| |
| ● marqueur |
| |
+-------------------------+-------------------------------+
| Lecture | Temps |
| | Distance |
| ▶ ⏸ ⏹ | Vitesse |
| 1× 2× 4× | Altitude |
| | Pente |
+---------------------------------------------------------+
| Timeline ● |
+---------------------------------------------------------+
packages/
├── gpx-engine/
│ ├── cache/
│ │ ├── RouteCache.ts
│ │ └── MemoryCache.ts
│ ├── simplify/
│ │ ├── DouglasPeucker.ts
│ │ └── AdaptiveSimplifier.ts
│ └── profile/
│ └── ElevationProfile.ts
│
apps/web/
├── components/
│ ├── elevation/
│ │ ├── ElevationChart.tsx
│ │ └── ElevationCursor.tsx
│ ├── map/
│ │ ├── MapCamera.tsx
│ │ └── RouteRenderer.tsx
│ └── streetview/
│ └── StreetViewPlaceholder.tsx
Import GPX

↓

SHA256

↓

Cache

↓

Route déjà connue ?

↓

Oui → lecture cache

Non → parser GPX
GPX

↓

GeoJSON

↓

LineSource

↓

LineLayer
Calcul Bounding Box

↓

Padding 40 px

↓

map.fitBounds()
Distance

────────────────────

      /\

     /  \

****/ \_****_
Simulation Frame

↓

Store Zustand

↓

Carte

↓

Profil

↓

Tableau de bord

↓

Timeline
export interface PanoramaProvider {
hasCoverage(lat: number, lon: number): Promise<boolean>;
getPanorama(lat: number, lon: number): Promise<Panorama>;
}
RouteCache.test.ts
AdaptiveSimplifier.test.ts
ElevationProfile.test.ts
MapRenderer.test.tsx
apps/api/src/

modules/
│
├── auth/
├── users/
├── routes/
├── simulations/
├── analysis/
├── map/
├── export/
└── health/

core/
│
├── database/
├── events/
├── logger/
└── config/
id: UUID

email

passwordHash

createdAt

updatedAt
id

name

distance

elevationGain

elevationLoss

bbox

createdBy

createdAt
id

routeId

riderWeight

bikeWeight

targetPower

cadence

status

startedAt

finishedAt
simulationId

timestamp

latitude

longitude

elevation

speed

distance

power

cadence

POST /simulations

GET /simulations

GET /simulations/:id

POST /simulations/:id/start

POST /simulations/:id/cancel
Frontend

↓

API

↓

Redis Queue

↓

Worker

↓

Simulation Engine

↓

PostgreSQL
Dashboard

Routes

Simulations

Analysis

Settings
Nombre de parcours

Distance totale

Dernières simulations

Temps moyen

Accès rapide
Distance

D+

D-

Altitude max

Altitude min

Pente max

Pente moyenne

Longueur

Temps simulé
MapEngine

↓

Layers

↓

Sources

↓

Controls

↓

Renderer

export const AIR_DENSITY = 1.225;
export const GRAVITY = 9.80665;
export interface Rider {

    weightKg:number;

    ftp:number;

    height:number;

    cda:number;

}
export interface Bike {

    weightKg:number;

    crr:number;

    wheelRadius:number;

}
export interface Environment {

    temperature:number;

    pressure:number;

    windSpeed:number;

    windDirection:number;

}
GravityForce

RollingResistance

AerodynamicDrag

WindForce

Inertia
Puissance

↓

Forces résistantes

↓

Résolution numérique

↓

Vitesse
pour chaque seconde :

    récupérer pente

    calculer les forces

    résoudre la vitesse

    avancer sur le parcours

    enregistrer une frame
    interface SimulationFrame {

    second:number;

    latitude:number;

    longitude:number;

    elevation:number;

    speed:number;

    distance:number;

    cadence:number;

    power:number;

    grade:number;

}
GPX Engine
│
▼
Physics Engine
│
▼
Simulation Engine
│
▼
Timeline
│
├── Carte MapLibre
├── Profil d'altitude
└── Tableau de bord
apps/web/src/

components/
├── analysis/
│ ├── AnalysisWorkspace.tsx
│ ├── Dashboard.tsx
│ ├── MetricsGrid.tsx
│ └── ComparisonPanel.tsx
│
├── charts/
│ ├── ElevationChart.tsx
│ ├── SpeedChart.tsx
│ ├── GradeChart.tsx
│ ├── CadenceChart.tsx
│ ├── PowerChart.tsx
│ └── HeartRateChart.tsx
│
├── timeline/
│ ├── Timeline.tsx
│ ├── PlaybackBar.tsx
│ └── Cursor.tsx
│
└── map/
├── RiderLayer.tsx
├── CameraController.tsx
└── MapSynchronization.tsx
interface PlaybackState {

    currentFrame:number;

    playing:boolean;

    speed:number;

    selectedSimulation:string;

}
SimulationFrame

↓

Playback Store

↓

Map

↓

Charts

↓

Timeline

↓

Dashboard
Libre

↓

Suivi automatique
Heading

↓

Bearing

↓

Map rotation
packages/

charts-engine
interface ChartPoint{

distance:number;

time:number;

value:number;

}km/h

45 ─────

35 ────╮

25 ──╮ │

15 ╭─╯ ╰──

──────────────
Simulation A

────────────

Simulation B

---

Temps écoulé

Distance

Altitude

Pente

Vitesse

Cadence

Puissance

Progression (%)
AnalysisWorkspace.test.tsx

PlaybackStore.test.ts

ChartSynchronization.test.ts

ComparisonPanel.test.tsx
packages/
├── analysis-engine/
│
├── planning-engine/
│
├── charts-engine/
│
└── physics-engine/
analysis-engine

src/

SegmentDetector.ts

RouteAnalyzer.ts

MetricsCalculator.ts

DifficultyScore.ts

ClimbClassifier.ts

SummaryBuilder.ts
Plat

↓

Montée

↓

Descente

↓

Faux-plat

↓

Virages
interface RouteSegment{

id:string;

startDistance:number;

endDistance:number;

length:number;

averageGrade:number;

maxGrade:number;

category:"flat"|"climb"|"descent";

}
Distance

-

D+

-

Pente

-

Altitude

-

Nombre de montées

↓

Difficulty Score
22 /100

Facile
87 /100

Très difficile
Cycliste

-

Vélo

-

Parcours
Scénario A

Scénario B

Scénario C
220 W

────────────

250 W

---

280 W

............
Vert

↓

Jaune

↓

Orange

↓

Rouge
Distance

Temps estimé

D+

Montées

Altitude max

Indice de difficulté

Énergie estimée
interface RiderProfile{

name:string;

weight:number;

ftp:number;

height:number;

bikeWeight:number;

cda:number;

crr:number;

}
GET /analysis/:routeId

POST /planning/scenarios

GET /planning/:scenarioId
DifficultyScore.test.ts

SegmentDetector.test.ts

PlanningEngine.test.ts

HeatMap.test.ts
apps/
├── web/
├── api/
├── desktop/ (Tauri)
└── mobile/ (React Native)

packages/
├── gpx-engine/
├── simulation-engine/
├── physics-engine/
├── analysis-engine/
├── planning-engine/
├── plugin-sdk/
├── map-engine/
├── offline-engine/
└── ui/+--------------------------------------------------------------+
| Menu |
+--------------------------------------------------------------+
| Library | Carte | Analyse | Simulation | Rapports | Plugins |
+--------------------------------------------------------------+
interface RouteLibraryItem {
id: string;
name: string;
tags: string[];
distance: number;
elevationGain: number;
createdAt: Date;
favorite: boolean;
}GPX

↓

IndexedDB

↓

Map Tiles Cache

↓

Local Storage

↓

Workspace
packages/plugin-sdk

Plugin.ts

PluginContext.ts

PluginManager.ts

Hooks.ts

Events.ts
export interface CycloPilotPlugin {
id: string;
name: string;
version: string;
activate(context: PluginContext): Promise<void>;
deactivate(): Promise<void>;
}
MapEngine

↓

TileProvider

↓

LayerManager

↓

Renderer

↓

Camera
Commande

↓

Historique

↓

Undo

↓

Redo
Report Engine
+-------------------------------------------------------------+
| CycloPilot |
+-------------------------------------------------------------+
| Fichier | Simulation | Aide |
+-------------------------------------------------------------+
| Carte |
| |
| |
| |
+-----------------------------------------+-------------------+
| Paramètres | Analyse |
| | |
| Puissance | Distance |
| Cadence | D+ |
| Poids | Altitude max |
| | Temps estimé |
+-----------------------------------------+-------------------+
| ▶ Lecture ⏸ Pause ⏹ Stop |
+-------------------------------------------------------------+

Simulation

Puissance

[220]

Cadence

[90]

Poids

[75]

Vélo

[9]

Bouton :

Lancer
Distance

D+

D-

Altitude max

Altitude min

Temps simulé

Vitesse moyenne estimée
Distance

D+

D-

Altitude max

Altitude min

Temps simulé

Vitesse moyenne estimée
0 km ------------------------- 42 km
●
LocalStorage

↓

Dernier GPX

↓

Derniers paramètres

↓

Dernière simulation
src/
│
├── app/
│ ├── page.tsx
│ ├── layout.tsx
│ └── globals.css
│
├── components/
│ ├── Map.tsx
│ ├── Sidebar.tsx
│ ├── Playback.tsx
│ ├── Metrics.tsx
│ ├── UploadButton.tsx
│ └── Timeline.tsx
│
├── services/
│ ├── gpx.ts
│ ├── simulation.ts
│ └── map.ts
│
├── store/
│ └── appStore.ts
│
├── types/
│ ├── gpx.ts
│ └── simulation.ts
│
└── utils/
interface AppState {

    route?: ParsedRoute;

    simulation?: Simulation;

    playing:boolean;

    currentIndex:number;

    speed:number;

    power:number;

    cadence:number;

    riderWeight:number;

    bikeWeight:number;

}
Importer GPX

↓

Parser XML

↓

Créer ParsedRoute

↓

Store

↓

Carte
0 km ----------------------------- 52 km

                 ●
                 ▶ Lecture

⏸ Pause

⏹ Stop
Toutes les 100 ms

↓

index++

↓

Déplacer le marqueur

↓

Mettre à jour les métriques
Distance

18.4 km

Temps

00:36:12

Altitude

184 m

Vitesse

31.8 km/h

Progression

43 %
Puissance

220 W

Cadence

90 rpm

Poids

75 kg

Vélo

9 kg
[ Lancer ]
Temps écoulé

Distance

Altitude

Pente

Vitesse estimée

Progression
Route

↓

Simulation

↓

Paramètres

↓

localStorage
localStorage

↓

Restaurer

↓

Application prête
src/
│
├── components/
│ ├── Map.tsx
│ ├── Sidebar.tsx
│ ├── Playback.tsx
│ ├── Metrics.tsx
│ ├── Timeline.tsx
│ ├── ElevationChart.tsx
│ ├── SpeedChart.tsx
│ ├── StatsPanel.tsx
│ └── Layout.tsx
│
├── services/
│ ├── gpx.ts
│ ├── simulation.ts
│ ├── analysis.ts
│ └── chart.ts
GPX

↓

Analyse

↓

Distance

↓

D+

↓

D-

↓

Altitude max

↓

Altitude min

↓

Pente

↓

Statistiques
analyzeRoute(route: ParsedRoute): RouteAnalysis
interface RouteAnalysis {

    distance:number;

    elevationGain:number;

    elevationLoss:number;

    minElevation:number;

    maxElevation:number;

    averageGrade:number;

    maxGrade:number;

    points:number;

}
350 m

            /\

          /    \

_______ / \_____

0 km 42 km
currentIndex
Simulation

↓

Carte

↓

Timeline

↓

Profil

↓

Dashboard
Vert

0–2 %

Jaune

2–5 %

Orange

5–8 %

Rouge

> 8 %
> 35 ──────

30 ───╮

25 ╭──╯

20

──────────────
Distance

42.6 km

D+

612 m

Altitude max

284 m

Pente max

12 %

Temps simulé

1 h 38
200 000 points

↓

Simplification

↓

25 000 points affichés

↓

Original conservé
+---------------------------------------------------------+
| Barre supérieure |
+---------------------------------------------------------+

+---------------------------+-----------------------------+
| | Paramètres |
| | |
| | Puissance |
| Carte | Cadence |
| | Poids |
| | |
+---------------------------+-----------------------------+

Profil d'altitude

────────────────────────────────────

Temps Distance Altitude Vitesse

▶ ⏸ ■LocalStorage

↓

Dernière carte

↓

Dernier zoom

↓

Dernière simulation

↓

Dernier GPX
src/
│
├── app/
├── components/
│
│ ├── Map.tsx
│ ├── Sidebar.tsx
│ ├── Playback.tsx
│ ├── Timeline.tsx
│ ├── Metrics.tsx
│ ├── ElevationChart.tsx
│ ├── SpeedChart.tsx
│ ├── StatsPanel.tsx
│ ├── StatusBar.tsx
│ └── Toolbar.tsx
│
├── services/
│
│ ├── gpx.ts
│ ├── simulation.ts
│ ├── analysis.ts
│ └── storage.ts
│
├── store/
│
├── utils/
│
└── types/
100 ms

↓

Point suivant
requestAnimationFrame()

↓

Interpolation

↓

Déplacement fluide
◀ Début

▶ Lecture

⏸ Pause

⏹ Stop

▶▶ x2

▶▶ x4
GPX chargé

42.8 km

2458 points

Simulation prête
Ouvrir GPX

Réinitialiser

Exporter

Paramètres

Aide
0 km/h

↓

32 km/h

Distance

D+

D-

Altitude moyenne

Altitude max

Pente moyenne

Pente max

Nombre de points

Longueur moyenne des segments
XML

↓

ParsedRoute

↓

libération mémoire
Dernier GPX

↓

Dernière simulation

↓

Préférences

↓

Carte
storage.save()

storage.load()

storage.clear()
☑ Suivre automatiquement le cycliste

☑ Afficher le profil d'altitude

☑ Afficher les statistiques

☑ Sauvegarde automatique
+------------------------------------------------------------+
| Toolbar |
+------------------------------------------------------------+

+----------------------------+-------------------------------+
| | Paramètres |
| | |
| | Puissance |
| Carte | Cadence |
| | Poids |
| | |
+----------------------------+-------------------------------+

Profil d'altitude

────────────────────────────────────────────

Distance Temps Altitude Vitesse

◀ ▶ ⏸ ⏹ x2 x4

---

GPX chargé • 42.8 km • 2458 points • Simulation prête
+---------------------------------------------------------------+
| CycloPilot |
+---------------------------------------------------------------+
| Bibliothèque | Carte |
|---------------------------------------------------------------|
| 📍 Tour de Sicile | |
| 📍 Mont Royal | |
| 📍 Île Sainte-Thérèse | |
| 📍 Parcours Test | |
| | |
| [+ Importer] | |
+---------------------------------------------------------------+
src/
│
├── components/
│ ├── RouteLibrary.tsx
│ ├── RouteCard.tsx
│ ├── RouteSearch.tsx
│ └── ConfirmDialog.tsx
│
├── services/
│ ├── library.ts
│ ├── gpx.ts
│ ├── simulation.ts
│ └── storage.ts
interface RouteItem {

    id:string;

    name:string;

    created:string;

    distance:number;

    elevationGain:number;

    points:number;

}
🔍 Rechercher...

Tour

↓

Tour de Sicile
Nom

Distance

D+

Nombre de points

Date d'import
Ouvrir

Dupliquer

Renommer

Supprimer
Bibliothèque

↓

Route sélectionnée

↓

Carte

↓

Analyse

↓

Simulation
Cliquer

↓

Glisser

↓

Relâcher
Clic droit

↓

Supprimer
Clic sur un segment

↓

Nouveau point
Sélection

↓

Couper

↓

Créer deux parcours
Ctrl+Z

Ctrl+Y
Enregistrer
Montées

6

Longueur totale

8.3 km

Pente moyenne

5.2 %

Pente max

13 %

Section la plus difficile

km 18.4
🟢 plat

🟡 faux plat

🟠 montée

🔴 forte montée

🔵 descente
+--------------------------------------------------------------+
| CycloPilot - Préparation de sortie |
+--------------------------------------------------------------+

Carte Résumé

███████████████ Distance : 84,2 km

███████████████ D+ : 1 245 m

███████████████ Difficulté : ★★★★☆

███████████████ Temps estimé : 3 h 40

███████████████ Montées : 7

---

Profil d'altitude

──────────────────────────────────────────────────────────────

Segments du parcours

1. Échauffement
2. Première montée
3. Plateau
4. Descente
5. Montée principale
6. Retour
   Segment 1

0 → 8 km

Plat

---

Segment 2

8 → 14 km

Montée

---

Segment 3

14 → 22 km

Descente

---

Segment 4

22 → 40 km

Plat rapide
Longueur

Dénivelé

Pente moyenne

Pente maximale

Altitude

Temps estimé
Distance

84 km

D+

1245 m

Altitude max

612 m

Montées

7

Longueur plus longue montée

4.8 km

Pente max

11 %

Temps estimé

3 h 40
★☆☆☆☆ Très facile

★★☆☆☆ Facile

★★★☆☆ Modéré

★★★★☆ Difficile

★★★★★ Très difficileNom

Poids

Poids du vélo

Puissance de référence (FTP)

Cadence habituelle

src/

components/
PreparationPanel.tsx
SegmentList.tsx
SegmentCard.tsx
DifficultyBadge.tsx

services/
preparation.ts
analysis.ts
simulation.ts
gpx.tssrc/
├── services/
│ ├── gpx.ts
│ ├── analysis.ts
│ ├── simulation.ts
│ └── storage.ts
│
├── utils/
│ ├── geo.ts
│ ├── elevation.ts
│ └── simplify.ts
│
└── types/
└── gpx.ts
export interface TrackPoint {
latitude: number;
longitude: number;
elevation: number;
timestamp?: Date;

    distanceFromStart: number;
    grade: number;
    heading: number;

}
export interface RouteAnalysis {
distance: number;
elevationGain: number;
elevationLoss: number;
minElevation: number;
maxElevation: number;
maxGrade: number;
averageGrade: number;
pointCount: number;
}
┌───────────────────────────────────────────────────────────────┐
│ CycloPilot │
├───────────────────────────────────────────────────────────────┤
│ 📂 Ouvrir GPX ▶ Lecture ⏸ Pause ⚙ Paramètres │
├───────────────────────────────────────────────────────────────┤
│ │
│ │
│ Carte MapLibre │
│ │
│ │
├───────────────────────────────────────────────────────────────┤
│ Profil altitude │
│ ──────────────────────────────────────────────────────────── │
├───────────────────────────────────────────────────────────────┤
│ Distance Temps Altitude Vitesse D+ Pente │
└───────────────────────────────────────────────────────────────┘
Vert

↓

Jaune

↓

Orange

↓

Rouge
•
🚴
Point 1

↓

Point 2

↓

Point 3
◀

▶

⏸

■

x1

x2

x4
0 km

──────────────────────────────

42 km

              ●
              Distance

D+

D-

Altitude max

Altitude min

Pente moyenne

Pente maximale

Nombre de points

Longueur du parcours
{
"name": "cyclopilot",
"version": "0.1.0",
"private": true,
"description": "CycloPilot - GPX Route Simulator",
"scripts": {
"dev": "next dev",
"build": "next build",
"start": "next start",
"lint": "next lint",
"typecheck": "tsc --noEmit"
},
"dependencies": {
"@types/geojson": "^7946.0.14",
"fast-xml-parser": "^4.5.0",
"maplibre-gl": "^4.7.1",
"next": "^15.3.0",
"react": "^19.0.0",
"react-dom": "^19.0.0",
"zustand": "^5.0.3"
},
"devDependencies": {
"@types/node": "^22.10.0",
"@types/react": "^19.0.0",
"@types/react-dom": "^19.0.0",
"autoprefixer": "^10.4.20",
"eslint": "^9.18.0",
"eslint-config-next": "^15.3.0",
"postcss": "^8.5.1",
"tailwindcss": "^3.4.17",
"typescript": "^5.7.3"
}
}{
"compilerOptions": {
"target": "ES2022",
"lib": [
"dom",
"dom.iterable",
"es2022"
],
"allowJs": false,
"skipLibCheck": true,
"strict": true,
"noEmit": true,
"esModuleInterop": true,
"module": "esnext",
"moduleResolution": "bundler",
"resolveJsonModule": true,
"isolatedModules": true,
"jsx": "preserve",
"incremental": true,
"plugins": [
{
"name": "next"
}
],
"baseUrl": ".",
"paths": {
"@/_": [
"./_"
]
}
},
"include": [
"next-env.d.ts",
"**/\*.ts",
"**/_.tsx",
".next/types/\**/_.ts"
],
"exclude": [
"node_modules"
]
}
cyclopilot/
│
├── package.json
├── tsconfig.json
└── (à venir)

# dependencies

/node_modules

# next

/.next
/out

# production

/build

# logs

npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# env

.env
.env.local
.env.development.local
.env.production.local

# macOS

.DS_Store

# IDE

.vscode/
.idea/

# TypeScript

*.tsbuildinfo
next-env.d.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
reactStrictMode: true,

experimental: {
typedRoutes: true
}
};

export default nextConfig;
module.exports = {
plugins: {
"@tailwindcss/postcss": {}
}
};
import type { Config } from "tailwindcss";

const config: Config = {
content: [
"./app/**/\*.{ts,tsx}",
"./components/**/*.{ts,tsx}"
],

theme: {
extend: {}
},

plugins: []
};

export default config;
cyclopilot/
│
├── app/
│
├── components/
│
├── services/
│
├── store/
│
├── types/
│
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.js
└── .gitignore
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
title: "CycloPilot",
description: "GPX Route Simulator"
};

export default function RootLayout({
children,
}: Readonly<{
children: React.ReactNode;
}>) {
return (
<html lang="fr">
<body>{children}</body>
</html>
);
}
export default function HomePage() {
return (
<main className="min-h-screen bg-slate-100">
<header className="border-b bg-white shadow-sm">
<div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
<h1 className="text-2xl font-bold text-slate-900">
🚴 CycloPilot
</h1>

          <button
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
          >
            Ouvrir un GPX
          </button>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl grid-cols-12 gap-6 p-6">

        <div className="col-span-9">

          <div className="flex h-[650px] items-center justify-center rounded-xl border bg-white shadow">

            <span className="text-lg text-slate-400">
              Carte MapLibre (à venir)
            </span>

          </div>

        </div>

        <aside className="col-span-3">

          <div className="rounded-xl border bg-white p-5 shadow">

            <h2 className="mb-6 text-lg font-semibold">
              Paramètres
            </h2>

            <div className="space-y-5">

              <div>

                <label className="mb-2 block text-sm">
                  Puissance (W)
                </label>

                <input
                  type="number"
                  defaultValue={220}
                  className="w-full rounded border px-3 py-2"
                />

              </div>

              <div>

                <label className="mb-2 block text-sm">
                  Cadence
                </label>

                <input
                  type="number"
                  defaultValue={90}
                  className="w-full rounded border px-3 py-2"
                />

              </div>

              <div>

                <label className="mb-2 block text-sm">
                  Poids cycliste
                </label>

                <input
                  type="number"
                  defaultValue={75}
                  className="w-full rounded border px-3 py-2"
                />

              </div>

              <div>

                <label className="mb-2 block text-sm">
                  Poids vélo
                </label>

                <input
                  type="number"
                  defaultValue={9}
                  className="w-full rounded border px-3 py-2"
                />

              </div>

              <button
                className="w-full rounded-lg bg-green-600 py-3 font-semibold text-white hover:bg-green-700"
              >
                ▶ Lancer la simulation
              </button>

            </div>

          </div>

        </aside>

      </section>

      <footer className="border-t bg-white">

        <div className="mx-auto flex max-w-7xl justify-around p-4">

          <div>
            <strong>Distance</strong>
            <br />
            --
          </div>

          <div>
            <strong>Temps</strong>
            <br />
            --
          </div>

          <div>
            <strong>Altitude</strong>
            <br />
            --
          </div>

          <div>
            <strong>Vitesse</strong>
            <br />
            --
          </div>

        </div>

      </footer>
    </main>

);
}
@tailwind base;
@tailwind components;
@tailwind utilities;

html,
body {
margin: 0;
padding: 0;
font-family: Inter, Arial, Helvetica, sans-serif;
background: #f1f5f9;
color: #0f172a;
}

- {
  box-sizing: border-box;
  }

button {
cursor: pointer;
}

input {
outline: none;
}

input:focus {
border-color: #2563eb;
}
cyclopilot/

app/
globals.css
layout.tsx
page.tsx

package.json
tsconfig.json
next.config.ts
tailwind.config.ts
postcss.config.js
.gitignore
export interface TrackPoint {
latitude: number;
longitude: number;
elevation: number;
timestamp?: Date;

distanceFromStart: number;
grade: number;
heading: number;
}

export interface ParsedRoute {
name: string;
points: TrackPoint[];

distance: number;

elevationGain: number;
elevationLoss: number;

minElevation: number;
maxElevation: number;
}
import { create } from "zustand";
import { ParsedRoute } from "@/types/gpx";

interface AppState {
route: ParsedRoute | null;

loading: boolean;

power: number;
cadence: number;

riderWeight: number;
bikeWeight: number;

currentIndex: number;

setRoute: (route: ParsedRoute | null) => void;

setCurrentIndex: (index: number) => void;

setLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({

route: null,

loading: false,

power: 220,

cadence: 90,

riderWeight: 75,

bikeWeight: 9,

currentIndex: 0,

setRoute: (route) =>
set({
route,
currentIndex: 0
}),

setCurrentIndex: (currentIndex) =>
set({
currentIndex
}),

setLoading: (loading) =>
set({
loading
})

}));
import { XMLParser } from "fast-xml-parser";

import { ParsedRoute, TrackPoint } from "@/types/gpx";

export async function parseGPX(
file: File
): Promise<ParsedRoute> {

const xml = await file.text();

const parser = new XMLParser({
ignoreAttributes: false
});

const data = parser.parse(xml);

const track =
data.gpx.trk.trkseg.trkpt;

const points: TrackPoint[] = [];

let minElevation = Number.POSITIVE_INFINITY;
let maxElevation = Number.NEGATIVE_INFINITY;

for (const p of track) {

    const elevation = Number(p.ele ?? 0);

    points.push({

      latitude: Number(p["@_lat"]),

      longitude: Number(p["@_lon"]),

      elevation,

      distanceFromStart: 0,

      grade: 0,

      heading: 0

    });

    minElevation = Math.min(minElevation, elevation);

    maxElevation = Math.max(maxElevation, elevation);

}

return {

    name: data.gpx.trk.name ?? "Sans nom",

    points,

    distance: 0,

    elevationGain: 0,

    elevationLoss: 0,

    minElevation,

    maxElevation

};

}
"use client";

import { ChangeEvent } from "react";

import { parseGPX } from "@/services/gpx";

import { useAppStore } from "@/store/appStore";

export default function UploadDropzone() {

const setRoute = useAppStore(
(state) => state.setRoute
);

async function onFileSelected(
event: ChangeEvent<HTMLInputElement>
) {

    const file = event.target.files?.[0];

    if (!file) return;

    const route = await parseGPX(file);

    setRoute(route);

}

return (

    <label className="inline-flex cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">

      Importer GPX

      <input
        hidden
        type="file"
        accept=".gpx"
        onChange={onFileSelected}
      />

    </label>

);

}
const EARTH_RADIUS = 6371000; // mètres

function toRadians(value: number): number {
return (value * Math.PI) / 180;
}

/**

- Distance Haversine en mètres
  */
  export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
  ): number {

const dLat = toRadians(lat2 - lat1);
const dLon = toRadians(lon2 - lon1);

const a =
Math.sin(dLat / 2) ** 2 +
Math.cos(toRadians(lat1)) *
Math.cos(toRadians(lat2)) *
Math.sin(dLon / 2) ** 2;

return 2 * EARTH_RADIUS * Math.asin(Math.sqrt(a));
}

/**

- Cap géographique (0-360°)
  */
  export function computeHeading(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
  ): number {

const φ1 = toRadians(lat1);
const φ2 = toRadians(lat2);

const λ = toRadians(lon2 - lon1);

const y = Math.sin(λ) * Math.cos(φ2);

const x =
Math.cos(φ1) * Math.sin(φ2) -
Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ);

return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

/**

- pente (%)
  */
  export function computeGrade(
  distance: number,
  elevationDiff: number
  ): number {

if (distance <= 0.01) return 0;

return (elevationDiff / distance) * 100;
}
import { XMLParser } from "fast-xml-parser";

import {
ParsedRoute,
TrackPoint
} from "@/types/gpx";

import {
haversineDistance,
computeGrade,
computeHeading
} from "@/utils/geo";

export async function parseGPX(
file: File
): Promise<ParsedRoute> {

    const xml = await file.text();

    const parser = new XMLParser({
        ignoreAttributes: false
    });

    const data = parser.parse(xml);

    const trkpts = data.gpx.trk.trkseg.trkpt;

    const points: TrackPoint[] = [];

    let totalDistance = 0;

    let gain = 0;
    let loss = 0;

    let minElevation = Number.POSITIVE_INFINITY;
    let maxElevation = Number.NEGATIVE_INFINITY;

    for (let i = 0; i < trkpts.length; i++) {

        const p = trkpts[i];

        const latitude = Number(p["@_lat"]);
        const longitude = Number(p["@_lon"]);
        const elevation = Number(p.ele ?? 0);

        let distanceFromPrevious = 0;
        let heading = 0;
        let grade = 0;

        if (i > 0) {

            const previous = points[i - 1];

            distanceFromPrevious = haversineDistance(
                previous.latitude,
                previous.longitude,
                latitude,
                longitude
            );

            totalDistance += distanceFromPrevious;

            const elevationDiff =
                elevation - previous.elevation;

            if (elevationDiff > 0)
                gain += elevationDiff;
            else
                loss += Math.abs(elevationDiff);

            heading = computeHeading(
                previous.latitude,
                previous.longitude,
                latitude,
                longitude
            );

            grade = computeGrade(
                distanceFromPrevious,
                elevationDiff
            );

        }

        minElevation = Math.min(
            minElevation,
            elevation
        );

        maxElevation = Math.max(
            maxElevation,
            elevation
        );

        points.push({

            latitude,

            longitude,

            elevation,

            timestamp: p.time
                ? new Date(p.time)
                : undefined,

            distanceFromStart: totalDistance,

            heading,

            grade

        });

    }

    return {

        name: data.gpx.trk.name ?? "Sans nom",

        points,

        distance: totalDistance,

        elevationGain: gain,

        elevationLoss: loss,

        minElevation,

        maxElevation

    };

}
export { default as Map } from "./Map";
"use client";

import { ParsedRoute } from "@/types/gpx";
import MapView from "./MapView";

interface Props {
route: ParsedRoute | null;
}

export default function Map({ route }: Props) {

    return (
        <div className="h-full w-full overflow-hidden rounded-xl">

            <MapView
                route={route}
            />

        </div>
    );

}
"use client";

import { useEffect, useRef } from "react";

import maplibregl from "maplibre-gl";

import "maplibre-gl/dist/maplibre-gl.css";

import { ParsedRoute } from "@/types/gpx";

interface Props {

    route: ParsedRoute | null;

}

export default function MapView({

    route

}: Props) {

    const mapContainer = useRef<HTMLDivElement>(null);

    const map = useRef<maplibregl.Map>();

    useEffect(() => {

        if (map.current) return;

        map.current = new maplibregl.Map({

            container: mapContainer.current!,

            style:
                "https://demotiles.maplibre.org/style.json",

            center: [-73.56, 45.50],

            zoom: 10

        });

        map.current.addControl(

            new maplibregl.NavigationControl(),

            "top-right"

        );

    }, []);

    useEffect(() => {

        if (!map.current) return;

        if (!route) return;

        const coordinates = route.points.map((p) => [

            p.longitude,

            p.latitude

        ]);

        const geojson = {

            type: "Feature",

            geometry: {

                type: "LineString",

                coordinates

            }

        };

        if (map.current.getSource("route")) {

            (
                map.current.getSource("route")
                as maplibregl.GeoJSONSource
            ).setData(
                geojson as GeoJSON.Feature<
                    GeoJSON.LineString
                >
            );

        } else {

            map.current.addSource("route", {

                type: "geojson",

                data: geojson

            });

            map.current.addLayer({

                id: "route",

                type: "line",

                source: "route",

                paint: {

                    "line-width": 4,

                    "line-color": "#ff6600"

                }

            });

        }

    }, [route]);

    return (

        <div
            ref={mapContainer}
            className="h-full w-full"
        />

    );

}
"use client";

export default function StartFinishMarkers() {
return null;
}
"use client";

export default function RiderMarker() {
return null;
}
"use client";

import { useAppStore } from "@/store/appStore";
import MapView from "./MapView";

export default function Map() {
const route = useAppStore((state) => state.route);

return (
<div className="h-full w-full rounded-xl overflow-hidden">
<MapView route={route} />
</div>
);
}
"use client";

import Map from "@/components/Map";
import UploadDropzone from "@/components/UploadDropzone";

import { useAppStore } from "@/store/appStore";

export default function HomePage() {

    const route = useAppStore(
        (state) => state.route
    );

    return (

        <main className="min-h-screen bg-slate-100">

            <header className="border-b bg-white shadow-sm">

                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">

                    <h1 className="text-2xl font-bold">

                        🚴 CycloPilot

                    </h1>

                    <UploadDropzone />

                </div>

            </header>

            <section className="mx-auto grid max-w-7xl grid-cols-12 gap-6 p-6">

                <div className="col-span-9">

                    <div className="h-[650px] rounded-xl bg-white shadow">

                        <Map />

                    </div>

                </div>

                <aside className="col-span-3">

                    <div className="rounded-xl bg-white p-5 shadow">

                        <h2 className="mb-6 text-lg font-semibold">

                            Informations

                        </h2>

                        {route ? (

                            <div className="space-y-3">

                                <div>

                                    <strong>Nom</strong>

                                    <br />

                                    {route.name}

                                </div>

                                <div>

                                    <strong>Distance</strong>

                                    <br />

                                    {(route.distance / 1000).toFixed(2)} km

                                </div>

                                <div>

                                    <strong>D+</strong>

                                    <br />

                                    {route.elevationGain.toFixed(0)} m

                                </div>

                                <div>

                                    <strong>Points</strong>

                                    <br />

                                    {route.points.length}

                                </div>

                            </div>

                        ) : (

                            <span className="text-slate-500">

                                Importez un GPX.

                            </span>

                        )}

                    </div>

                </aside>

            </section>

        </main>

    );

}
map.current.on("load", () => {

    // Toutes les sources seront ajoutées ici.

});
function updateRoute() {

    if (!map.current) return;

    if (!route) return;

    ...

}
import maplibregl from "maplibre-gl";

export function fitMapToCoordinates(
map: maplibregl.Map,
coordinates: number[][]
) {

    const bounds = new maplibregl.LngLatBounds();

    coordinates.forEach((c) => {

        bounds.extend([c[0], c[1]]);

    });

    map.fitBounds(bounds, {

        padding: 50,

        duration: 800

    });

}
src/
├── core/
│ └── simulation/
│ ├── SimulationEngine.ts
│ ├── PlaybackController.ts
│ ├── Interpolator.ts
│ └── index.ts
│
├── hooks/
│ └── useSimulation.ts
│
├── components/
│ └── Playback/
│ ├── Controls.tsx
│ ├── Timeline.tsx
│ └── SpeedSelector.tsx
import { TrackPoint } from "@/types/gpx";

export function interpolatePoint(
a: TrackPoint,
b: TrackPoint,
t: number
): TrackPoint {

return {

    latitude:
      a.latitude +
      (b.latitude - a.latitude) * t,

    longitude:
      a.longitude +
      (b.longitude - a.longitude) * t,

    elevation:
      a.elevation +
      (b.elevation - a.elevation) * t,

    distanceFromStart:
      a.distanceFromStart +
      (b.distanceFromStart - a.distanceFromStart) * t,

    heading:
      a.heading +
      (b.heading - a.heading) * t,

    grade:
      a.grade +
      (b.grade - a.grade) * t,

    timestamp: undefined

};

}
import { ParsedRoute } from "@/types/gpx";

export class SimulationEngine {

private animationId = 0;

private playing = false;

private index = 0;

constructor(
private readonly route: ParsedRoute,
private readonly onFrame: (index: number) => void
) {}

play() {

    if (this.playing) return;

    this.playing = true;

    this.loop();

}

pause() {

    this.playing = false;

    cancelAnimationFrame(this.animationId);

}

stop() {

    this.pause();

    this.index = 0;

    this.onFrame(0);

}

private loop = () => {

    if (!this.playing) return;

    this.onFrame(this.index);

    this.index++;

    if (this.index >= this.route.points.length) {

      this.stop();

      return;

    }

    this.animationId =
      requestAnimationFrame(this.loop);

};

}
import { useEffect, useRef } from "react";

import { SimulationEngine } from "@/core/simulation/SimulationEngine";

import { ParsedRoute } from "@/types/gpx";

export function useSimulation(

route: ParsedRoute | null,

onFrame: (index: number) => void

) {

const engine = useRef<SimulationEngine>();

useEffect(() => {

    if (!route) return;

    engine.current =

      new SimulationEngine(

        route,

        onFrame

      );

}, [route, onFrame]);

return engine;

}
"use client";

interface PlaybackControlsProps {
playing: boolean;
onPlay: () => void;
onPause: () => void;
onStop: () => void;
}

export default function PlaybackControls({
playing,
onPlay,
onPause,
onStop,
}: PlaybackControlsProps) {
return (
<div className="flex items-center gap-2">
<button
onClick={playing ? onPause : onPlay}
className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700" >
{playing ? "⏸ Pause" : "▶ Lecture"}
</button>

      <button
        onClick={onStop}
        className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
      >
        ⏹ Arrêt
      </button>
    </div>

);
}
"use client";

interface TimelineProps {
progress: number;
}

export default function Timeline({
progress,
}: TimelineProps) {
return (
<div className="w-full">
<div className="mb-2 flex justify-between text-sm">
<span>0 %</span>
<span>{progress.toFixed(1)} %</span>
<span>100 %</span>
</div>

      <progress
        value={progress}
        max={100}
        className="h-3 w-full"
      />
    </div>

);
}
playing: false,
progress: 0,

setPlaying: (playing: boolean) =>
set({ playing }),

setProgress: (progress: number) =>
set({ progress }),
playing: boolean;
progress: number;

setPlaying: (playing: boolean) => void;
setProgress: (progress: number) => void;
private lastTimestamp = 0;
private speed = 1;

private loop = (timestamp: number) => {

    if (!this.playing) return;

    if (!this.lastTimestamp)
        this.lastTimestamp = timestamp;

    const delta = timestamp - this.lastTimestamp;

    this.lastTimestamp = timestamp;

    this.index += delta * 0.02 * this.speed;

    const currentIndex = Math.floor(this.index);

    this.onFrame(currentIndex);

    if (currentIndex >= this.route.points.length - 1) {

        this.stop();

        return;

    }

    this.animationId =
        requestAnimationFrame(this.loop);

};
<PlaybackControls
  playing={playing}
  onPlay={handlePlay}
  onPause={handlePause}
  onStop={handleStop}
/>

<div className="mt-4">
  <Timeline progress={progress} />
</div>
import maplibregl from "maplibre-gl";
import { TrackPoint } from "@/types/gpx";

export class RiderMarker {

    private marker: maplibregl.Marker;

    constructor(
        map: maplibregl.Map
    ) {

        const element = document.createElement("div");

        element.className = "cyclist-marker";

        this.marker = new maplibregl.Marker({

            element,
            rotationAlignment: "map"

        });

        this.marker.addTo(map);

    }

    update(point: TrackPoint) {

        this.marker
            .setLngLat([
                point.longitude,
                point.latitude
            ])
            .setRotation(
                point.heading
            );

    }

    remove() {

        this.marker.remove();

    }

}
const riderMarker = useRef<RiderMarker | null>(null);
map.current.on("load", () => {

    riderMarker.current =
        new RiderMarker(map.current!);

});
export function updateSimulationPosition(
point: TrackPoint
) {

    riderMarker.current?.update(point);

}
constructor(

    route: ParsedRoute,

    onFrame:(index:number)=>void,

    onPositionChanged:
        (point:TrackPoint)=>void

)
const point =
this.route.points[currentIndex];

this.onPositionChanged(point)"use client";

import { TrackPoint } from "@/types/gpx";

interface Props {

    point: TrackPoint | null;

}

export default function Stats({

    point

}:Props){

    if(!point)
        return null;

    return(

        <div className="grid grid-cols-2 gap-4">

            <div>

                <strong>Distance</strong>

                <br/>

                {(point.distanceFromStart/1000).toFixed(2)} km

            </div>

            <div>

                <strong>Altitude</strong>

                <br/>

                {point.elevation.toFixed(0)} m

            </div>

            <div>

                <strong>Pente</strong>

                <br/>

                {point.grade.toFixed(1)} %

            </div>

            <div>

                <strong>Cap</strong>

                <br/>

                {point.heading.toFixed(0)}°

            </div>

        </div>

    );

}
;
.cyclist-marker{

    width:22px;

    height:22px;

    border-radius:50%;

    background:#ff6600;

    border:3px solid white;

    box-shadow:0 0 10px rgba(0,0,0,.35);

}
map.easeTo({

    center:[
        point.longitude,
        point.latitude
    ],

    duration:250

});
SimulationEngine
│
▼
requestAnimationFrame
│
▼
TrackPoint courant
│
├────────► RiderMarker.update()
│
├────────► Timeline
│
├────────► Stats
│
└────────► Store Zustand
core/
analysis/
AnalysisEngine.ts
SegmentDetector.ts
Statistics.ts
import { ParsedRoute } from "@/types/gpx";

export interface RouteStatistics {

    totalDistance:number;

    elevationGain:number;

    elevationLoss:number;

    highestPoint:number;

    lowestPoint:number;

    averageGrade:number;

    maxGrade:number;

}

export function computeStatistics(

    route:ParsedRoute

):RouteStatistics{

    const grades=

        route.points.map(p=>Math.abs(p.grade));

    return{

        totalDistance:route.distance,

        elevationGain:route.elevationGain,

        elevationLoss:route.elevationLoss,

        highestPoint:route.maxElevation,

        lowestPoint:route.minElevation,

        averageGrade:

            grades.reduce((a,b)=>a+b,0)/grades.length,

        maxGrade:

            Math.max(...grades)

    };

}
import { ParsedRoute } from "@/types/gpx";

export interface ClimbSegment{

    start:number;

    end:number;

    distance:number;

    elevation:number;

}

export function detectClimbs(

    route:ParsedRoute

):ClimbSegment[]{

    const climbs:ClimbSegment[]=[];

    let start=-1;

    for(let i=0;i<route.points.length;i++){

        if(route.points[i].grade>=3){

            if(start===-1)

                start=i;

        }

        else{

            if(start!==-1){

                const end=i-1;

                climbs.push({

                    start,

                    end,

                    distance:

                        route.points[end].distanceFromStart-

                        route.points[start].distanceFromStart,

                    elevation:

                        route.points[end].elevation-

                        route.points[start].elevation

                });

                start=-1;

            }

        }

    }

    return climbs;

}
import { ParsedRoute } from "@/types/gpx";

import {

    computeStatistics

} from "./Statistics";

import {

    detectClimbs

} from "./SegmentDetector";

export function analyzeRoute(

    route:ParsedRoute

){

    return{

        statistics:

            computeStatistics(route),

        climbs:

            detectClimbs(route)

    };

}
analysis:null,

setAnalysis:(analysis)=>set({

    analysis

})
analysis:any;

setAnalysis:(analysis:any)=>void;
const analysis=

    analyzeRoute(route);

setAnalysis(analysis);
Analyse

Distance totale

D+

D-

Altitude max

Altitude min

Pente moyenne

Pente maximale

Nombre de montées détectées
GPX
│
▼
Parser
│
▼
AnalysisEngine
│
├──────── Statistics
│
├──────── Climb detector
│
└──────── Future AI analysis
components/
└── Elevation/
├── ElevationChart.tsx
├── ElevationCursor.tsx
├── ElevationProfile.tsx
├── ElevationGrid.tsx
└── index.ts

core/
└── analysis/
└── profile.ts
import { ParsedRoute } from "@/types/gpx";

export interface ProfilePoint {
x: number;
y: number;
elevation: number;
distance: number;
index: number;
}

export function buildElevationProfile(
route: ParsedRoute,
width = 1000,
height = 240
): ProfilePoint[] {
const range =
route.maxElevation - route.minElevation || 1;

return route.points.map((point, index) => ({
x: (point.distanceFromStart / route.distance) * width,
y:
height -
((point.elevation - route.minElevation) / range) *
height,
elevation: point.elevation,
distance: point.distanceFromStart,
index,
}));
}
"use client";

import { ProfilePoint } from "@/core/analysis/profile";

interface Props {
points: ProfilePoint[];
}

export default function ElevationProfile({
points,
}: Props) {
const d = points
.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
.join(" ");

return (
<path
      d={d}
      fill="none"
      stroke="#ff6600"
      strokeWidth={2}
    />
);
}
"use client";

interface Props {
width: number;
height: number;
}

export default function ElevationGrid({
width,
height,
}: Props) {
const lines = [];

for (let i = 0; i <= 10; i++) {
const y = (height / 10) * i;

    lines.push(
      <line
        key={i}
        x1={0}
        x2={width}
        y1={y}
        y2={y}
        stroke="#e5e7eb"
      />
    );

}

return <>{lines}</>;
}
"use client";

interface Props {
x: number;
height: number;
}

export default function ElevationCursor({
x,
height,
}: Props) {
return (
<line
      x1={x}
      x2={x}
      y1={0}
      y2={height}
      stroke="#2563eb"
      strokeWidth={2}
    />
);
}
"use client";

import { useMemo } from "react";

import { ParsedRoute } from "@/types/gpx";
import { buildElevationProfile } from "@/core/analysis/profile";

import ElevationGrid from "./ElevationGrid";
import ElevationProfile from "./ElevationProfile";
import ElevationCursor from "./ElevationCursor";

interface Props {
route: ParsedRoute;
currentIndex: number;
}

const WIDTH = 1000;
const HEIGHT = 240;

export default function ElevationChart({
route,
currentIndex,
}: Props) {
const profile = useMemo(
() => buildElevationProfile(route, WIDTH, HEIGHT),
[route]
);

const cursor =
profile[Math.min(currentIndex, profile.length - 1)];

return (
<svg
viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
className="w-full rounded-xl bg-white" >
<ElevationGrid
        width={WIDTH}
        height={HEIGHT}
      />

      <ElevationProfile
        points={profile}
      />

      {cursor && (
        <ElevationCursor
          x={cursor.x}
          height={HEIGHT}
        />
      )}
    </svg>

);
}
{route && (
<ElevationChart
    route={route}
    currentIndex={currentIndex}
  />
)}
src/

components/
├── Elevation/
│ ├── ElevationChart.tsx
│ ├── ElevationCursor.tsx
│ ├── ElevationGrid.tsx
│ ├── ElevationProfile.tsx
│ ├── ElevationTooltip.tsx
│ └── index.ts

hooks/
└── useElevationInteraction.ts

store/
└── appStore.ts

types/
└── elevation.ts

app/
└── page.tsx
export interface ElevationHoverState {

visible: boolean;

x: number;

y: number;

index: number;

distance: number;

elevation: number;

grade: number;

}
currentIndex: number;

hoverIndex: number | null;

setCurrentIndex: (
index: number
) => void;

setHoverIndex: (
index: number | null
) => void;
currentIndex: 0,

hoverIndex: null,
setCurrentIndex: (index) =>
set({
currentIndex: index
}),

setHoverIndex: (hoverIndex) =>
set({
hoverIndex
}),"use client";

import { useCallback } from "react";

import { ParsedRoute } from "@/types/gpx";

interface Params {

route: ParsedRoute;

width: number;

onSelect: (
index: number
) => void;

onHover: (
index: number
) => void;

}

export function useElevationInteraction({

route,

width,

onSelect,

onHover

}: Params) {

const findIndex = useCallback(

    (clientX: number) => {

      const ratio =
        Math.max(
          0,
          Math.min(
            1,
            clientX / width
          )
        );

      return Math.floor(
        ratio *
        (route.points.length - 1)
      );

    },

    [route, width]

);

const handleMove = (

    clientX: number

) => {

    onHover(
      findIndex(clientX)
    );

};

const handleClick = (

    clientX: number

) => {

    onSelect(
      findIndex(clientX)
    );

};

return {

    handleMove,

    handleClick

};

}
"use client";

interface Props {

visible: boolean;

x: number;

y: number;

distance: number;

elevation: number;

grade: number;

}

export default function ElevationTooltip({

visible,

x,

y,

distance,

elevation,

grade

}: Props) {

if (!visible)
return null;

return (

    <div
      className="
        absolute
        z-50
        rounded-lg
        bg-slate-900
        px-3
        py-2
        text-xs
        text-white
        shadow-xl
      "
      style={{
        left: x + 12,
        top: y - 12
      }}
    >

      <div>

        Distance :
        {" "}
        {(distance / 1000).toFixed(2)}
        km

      </div>

      <div>

        Altitude :
        {" "}
        {elevation.toFixed(0)}
        m

      </div>

      <div>

        Pente :
        {" "}
        {grade.toFixed(1)}
        %

      </div>

    </div>

);

}export { default as ElevationChart }
from "./ElevationChart";

export { default as ElevationTooltip }
from "./ElevationTooltip";
interface Props {

route: ParsedRoute;

currentIndex: number;

onSelect: (
index: number
) => void;

}
const svgRef =
useRef<SVGSVGElement>(null);
const {

handleMove,

handleClick

} = useElevationInteraction({

route,

width: WIDTH,

onSelect,

onHover: setHoverIndex

});<svg

ref={svgRef}

onMouseMove={(e) => {

    const rect =
      e.currentTarget
       .getBoundingClientRect();

    handleMove(
      e.clientX - rect.left
    );

}}

onClick={(e) => {

    const rect =
      e.currentTarget
        .getBoundingClientRect();

    handleClick(
      e.clientX - rect.left
    );

}}

>

const currentIndex =
useAppStore(
s => s.currentIndex
);

const setCurrentIndex =
useAppStore(
s => s.setCurrentIndex
);
<ElevationChart

route={route}

currentIndex={
currentIndex
}

onSelect={
setCurrentIndex
}

/>
useEffect(() => {

if (!route)
return;

const point =
route.points[
currentIndex
];

if (!point)
return;

riderMarker.current
?.update(point);

}, [

currentIndex,

route

]);
✔ trace affichée
✔ statistiques visibles
✔ profil visible
✔ lecture
✔ pause
✔ arrêt
✔ profil synchronisé
✔ clic repositionne le cycliste
✔ survol met à jour la prévisualisation
✔ curseur suit la simulation
Carte
↕
Store Zustand
↕
Simulation
↕
Profil d'altitude
↕
Statistiques
packages/
└── analysis/
├── ClimbDetector.ts (nouveau)
├── ClimbTypes.ts (nouveau)
└── index.ts (modifié)
export interface ClimbSegment {
id: string;

    startIndex: number;
    endIndex: number;

    distance: number;

    elevationGain: number;

    averageGrade: number;

    maxGrade: number;

    startElevation: number;

    summitElevation: number;

}
Montée #3

Distance :
1.84 km

D+
118 m

Pente moyenne
6.4 %

Pente max
12.3 %

Altitude départ
244 m

Sommet
362 m
GPX

        │

        ▼

Parser

        │

        ▼

AnalysisEngine

        │

        ├──────── Statistics

        │

        ├──────── ClimbDetector

        │

        ├──────── SprintDetector (futur)

        │

        ├──────── DescentDetector (futur)

        │

        └──────── AI Coach (futur)

packages/
└── analysis/
├── ProfileColorizer.ts (nouveau)
└── ElevationColors.ts (nouveau)

components/
└── Elevation/
├── ColoredProfile.tsx (nouveau)
├── ElevationChart.tsx (modifié)
└── Legend.tsx (nouveau)

Point A -------- Point B

grade = 1.8 %

↓

Vert
Point B -------- Point C

grade = 8.2 %

↓

Rouge
ColoredProfile
Line 1

Line 2

Line 3

...

Line n
🟢 Plat

🟡 Faux-plat

🟠 Côte

🔴 Forte pente

🟣 Mur
Ascensions détectées

──────────────

Col #1

▲ 6.4 km

▲ 418 m

▲ 6.5 %

──────────────

Côte #2

▲ 1.8 km

▲ 127 m

▲ 7.2 %

──────────────

Mur #3

▲ 620 m

▲ 58 m

▲ 12.4 %
packages/
└── analysis/
├── ClimbDetector.ts (amélioré)
├── ClimbTypes.ts
└── index.ts

components/
└── Climbs/
├── ClimbList.tsx (nouveau)
├── ClimbCard.tsx (nouveau)
├── ClimbStats.tsx (nouveau)
└── index.ts (nouveau)

hooks/
└── useClimbNavigation.ts (nouveau)

store/
└── appStore.ts (modifié)

app/
└── page.tsx (modifié)
selectedClimbId: string | null;

selectClimb(id: string | null): void;
selectedClimbId: null,

selectClimb: (id) =>
set({
selectedClimbId: id
}),
selectedClimbId: null,

selectClimb: (id) =>
set({
selectedClimbId: id
}),
▲ Col #1

Distance
6.42 km

D+
418 m

Pente moyenne
6.5 %

Pente max
11.8 %

Altitude sommet
1248 m
┌──────────────────────────┐
│ ▲ Col #2 │
│ │
│ 4.8 km │
│ 286 m │
│ 5.9 % │
└────────────────Utilisateur

        │

        ▼

ClimbCard

        │

        ▼

selectClimb()

        │

        ▼

useClimbNavigation()

        │

        ├────────► SimulationEngine.seek()

        ├────────► Carte

        ├────────► Profil

        └────────► Store
        ──────────┘seek(index: number): void;
        Analyse

────────────────────

Statistiques générales

────────────────────

Ascensions détectées

▲ Col #1

▲ Côte #2

▲ Mur #3

▲ Col #4

────────────────────
packages/
└── analysis/
├── DashboardEngine.ts (nouveau)
├── GradeHistogram.ts (nouveau)
├── RouteBreakdown.ts (nouveau)
├── ClimbEstimator.ts (nouveau)
└── index.ts (modifié)

components/
└── Dashboard/
├── Dashboard.tsx (nouveau)
├── BreakdownCard.tsx (nouveau)
├── Histogram.tsx (nouveau)
├── ClimbSummary.tsx (nouveau)
├── EstimatedTimes.tsx (nouveau)
└── index.ts (nouveau)

store/
└── appStore.ts (modifié)

app/
└── page.tsx (modifié)

Distance totale

52.8 km

──────────────

Plat

31.4 km

59 %

──────────────

Montées

12.6 km

24 %

──────────────

Descentes

8.8 km

17 %
Ascensions détectées : 7

Distance cumulée :
18.3 km

D+ cumulé :
964 m

Pente moyenne :
5.8 %

Pente maximale :
13.2 %

Altitude maximale :
1 482 m
Col principal

Débutant :
42 min

Loisir :
34 min

Entraîné :
29 min

Compétiteur :
24 min

Élite :
19 min
┌────────────────────────────┐
│ Tableau de bord │
├────────────────────────────┤
│ Statistiques générales │
├────────────────────────────┤
│ Répartition du parcours │
├────────────────────────────┤
│ Histogramme des pentes │
├────────────────────────────┤
│ Ascensions │
├────────────────────────────┤
│ Temps estimés │
└────────────────────────────┘
GPX
│
▼
Parser
│
▼
AnalysisEngine
│
├── Statistics
├── ClimbDetector
├── DashboardEngine
│ ├── Breakdown
│ ├── Histogram
│ ├── Climb Summary
│ └── Time Estimator
├── SprintDetector (futur)
├── DescentDetector (futur)
└── AI Coach (futur)

packages/
└── analysis/
└── **tests**/
├── ClimbDetector.test.ts
├── Statistics.test.ts
├── DashboardEngine.test.ts
├── Histogram.test.ts
└── ProfileColorizer.test.ts
GPX
↓

React

↓

Calculs
GPX

↓

AnalysisEngine

↓

Store

↓

React
SHA256(GPX)

↓

déjà analysé ?

↓

Oui

↓

Retour immédiat

Sinon

↓

Analyse

↓

Cache
ElevationChart

ClimbList

Dashboard

Histogram

Stats

Map
docs/

    analysis.md

    architecture.md

    simulation.md
    .github/

    workflows/

        ci.yml
        Install

↓

Lint

↓

Typecheck

↓

Tests

↓

Build
packages/simulation-engine/src/index.ts
interface SimulationState {
  playing: boolean;
  speed: number;
  elapsedTime: number;
  currentIndex: number;
  totalFrames: number;
}
private state: SimulationState = {
  playing: false,
  speed: 1,
  elapsedTime: 0,
};
private route: GPXPoint[] = [];

/**
 * Start the simulation
 */
play(): void {
  this.state.playing = true;
}

/**
 * Pause the simulation
 */
pause(): void {
  this.state.playing = false;
}

/**
 * Stop and reset the simulation
 */
stop(): void {
  this.state.playing = false;
  this.state.elapsedTime = 0;
  this.state.currentIndex = 0;
  this.reset();
}

/**
 * Toggle play/pause
 */
togglePlayPause(): void {
  this.state.playing = !this.state.playing;
}

/**
 * Is the simulation currently running?
 */
isPlaying(): boolean {
  return this.state.playing;
}

/**
 * Playback speed multiplier.
 * Accepted values: 0.5x to 8x.
 */
setSpeed(speed: number): void {
  this.state.speed = Math.min(8, Math.max(0.5, speed));
}

/**
 * Current playback speed.
 */
getSpeed(): number {
  return this.state.speed;
}

/**
 * Elapsed simulated time in seconds.
 */
getElapsedTime(): number {
  return this.state.elapsedTime;
}

/**
 * Configure the number of frames available.
 */
setFrameCount(count: number): void {
  this.state.totalFrames = Math.max(0, count);

  if (this.state.currentIndex >= this.state.totalFrames) {
    this.state.currentIndex =
      Math.max(0, this.state.totalFrames - 1);
  }
}

/**
 * Returns the current frame index.
 */
getCurrentIndex(): number {
  return this.state.currentIndex;
}

/**
 * Returns the progress between 0 and 1.
 */
getProgress(): number {

  if (this.state.totalFrames <= 1) {
    return 0;
  }

  return this.state.currentIndex /
    (this.state.totalFrames - 1);
}

/**
 * Jump to a specific frame.
 */
seek(index: number): void {

  if (this.state.totalFrames === 0) {
    return;
  }

  this.state.currentIndex = Math.max(
    0,
    Math.min(index, this.state.totalFrames - 1)
  );
}

/**
 * Move to the next frame.
 */
next(): void {
  this.seek(this.state.currentIndex + 1);
}

/**
 * Move to the previous frame.
 */
previous(): void {
  this.seek(this.state.currentIndex - 1);
}

/**
 * Reset simulation
 */
reset(): void {
  this.state.currentIndex = 0;
  this.metrics = {
    speed: 0,
    cadence: 0,
    power: 0,
    distance: 0,
    elevation: 0,
  };
}

step(deltaTime: number, _userPower: number): RideMetrics {

  if (!this.state.playing) {
    return this.getMetrics();
  }

  this.state.elapsedTime +=
    deltaTime * this.state.speed;

  // TODO:
  // Physics engine will be implemented
  // in PR 6.2

  return this.metrics;
}
this.state.elapsedTime = 0;
this.state.playing = false;
pnpm build
git add .
git commit -m "PR 6.1 - Commit 1 - Simulation lifecycle"


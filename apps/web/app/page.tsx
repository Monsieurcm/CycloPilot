"use client";

import { useEffect, useState } from "react";
import type { GPXPoint } from "@cyclopilot/shared";
import { MapView } from "../src/components/MapView";
import { RouteInfo } from "../src/components/RouteInfo";
import { SimulationControls } from "../src/components/SimulationControls";
import { GPXUploader } from "../src/components/GPXUploader";
import { DashboardAdvanced } from "../src/components/DashboardAdvanced";
import { RiderProfilePanel } from "../src/components/RiderProfilePanel";
import { useSimulation } from "../src/hooks/useSimulation";

type AppSimulationState =
  | "no-route"
  | "loading"
  | "route-loaded"
  | "running"
  | "finished";

function getStateMessage(state: AppSimulationState): string {
  switch (state) {
    case "no-route":
      return "Aucun parcours charge. Importez un fichier GPX pour commencer.";
    case "loading":
      return "Chargement du parcours en cours...";
    case "route-loaded":
      return "Parcours charge. Vous pouvez lancer la simulation.";
    case "running":
      return "Simulation en cours.";
    case "finished":
      return "Simulation terminee. Appuyez sur Stop pour recommencer.";
    default:
      return "Etat inconnu.";
  }
}

function getStateLabel(state: AppSimulationState): string {
  switch (state) {
    case "no-route":
      return "Aucun parcours";
    case "loading":
      return "Chargement";
    case "route-loaded":
      return "Parcours charge";
    case "running":
      return "Simulation en cours";
    case "finished":
      return "Simulation terminee";
    default:
      return "Inconnu";
  }
}

function getCurrentRouteIndex(
  route: GPXPoint[],
  currentPoint: GPXPoint | null,
): number {
  if (!currentPoint) {
    return -1;
  }

  const directIndex = route.indexOf(currentPoint);
  if (directIndex >= 0) {
    return directIndex;
  }

  return route.findIndex((point) =>
    point.distance === currentPoint.distance &&
    point.lat === currentPoint.lat &&
    point.lon === currentPoint.lon,
  );
}

function getRemainingElevationBreakdown(
  route: GPXPoint[],
  currentIndex: number,
): { positive: number; negative: number } {
  if (currentIndex < 0 || route.length === 0 || currentIndex >= route.length) {
    return { positive: 0, negative: 0 };
  }

  let positive = 0;
  let negative = 0;

  for (let i = currentIndex; i < route.length - 1; i++) {
    const currentElevation = route[i].elevation ?? 0;
    const nextElevation = route[i + 1].elevation ?? 0;
    const delta = nextElevation - currentElevation;

    if (delta > 0) {
      positive += delta;
    } else if (delta < 0) {
      negative += Math.abs(delta);
    }
  }

  return { positive, negative };
}

export default function HomePage() {
  const [route, setRoute] = useState<GPXPoint[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const {
    metrics,
    playing,
    speed,
    power,
    riderProfile,
    elapsedTime,
    progress,
    currentPoint,
    averageSpeed,
    maxSpeed,
    remainingDistance,
    remainingTime,
    estimatedArrival,
    play,
    pause,
    stop,
    next,
    previous,
    setSpeed,
    setPower,
    updateRiderProfile,
    resetRiderProfile,
    loadRoute,
  } = useSimulation();

  useEffect(() => {
    loadRoute(route);
  }, [route, loadRoute]);

  const hasRoute = route.length > 0;
  const currentRouteIndex = getCurrentRouteIndex(route, currentPoint);
  const elevationBreakdown = getRemainingElevationBreakdown(route, currentRouteIndex);
  const currentGradient = currentPoint?.gradient ?? 0;

  const appState: AppSimulationState = isImporting
    ? "loading"
    : !hasRoute
      ? "no-route"
      : playing
        ? "running"
        : progress >= 1
          ? "finished"
          : "route-loaded";

  const canPlay = hasRoute && !isImporting && !playing && progress < 1;
  const canPause = hasRoute && !isImporting && playing;
  const canStop = hasRoute && !isImporting && (playing || progress > 0);
  const canNavigate = hasRoute && !isImporting;
  const canChangeSpeed = hasRoute && !isImporting;
  const canChangePower = hasRoute && !isImporting;

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "2rem",
        color: "#f8fafc",
        background: "radial-gradient(circle at top, #1d4ed8 0%, #111827 48%, #020617 100%)",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <section
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          borderRadius: "20px",
          background: "rgba(15, 23, 42, 0.8)",
          border: "1px solid rgba(148, 163, 184, 0.3)",
          boxShadow: "0 18px 46px rgba(2, 6, 23, 0.45)",
          padding: "1.5rem",
        }}
      >
        <h1 style={{ marginTop: 0 }}>CycloPilot Simulation</h1>
        <p style={{ marginTop: 0, opacity: 0.9 }}>
          Simulation GPS avec suivi d'etat et controles contextuels.
        </p>

        <div
          style={{
            marginBottom: "1rem",
            borderRadius: 12,
            padding: "0.75rem 0.9rem",
            border: "1px solid rgba(148, 163, 184, 0.25)",
            background: "rgba(15, 23, 42, 0.55)",
          }}
        >
          <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.8 }}>
            Etat de l'application
          </p>
          <p style={{ margin: "0.35rem 0 0", fontWeight: 650 }}>
            {getStateMessage(appState)}
          </p>
        </div>

        <GPXUploader
          onRouteLoaded={(newRoute) => {
            setRoute(newRoute);
          }}
          onLoadingChange={setIsImporting}
        />

        <SimulationControls
          playing={playing}
          speed={speed}
          power={power}
          canPlay={canPlay}
          canPause={canPause}
          canStop={canStop}
          canPrevious={canNavigate}
          canNext={canNavigate}
          canChangeSpeed={canChangeSpeed}
          canChangePower={canChangePower}
          onPlay={play}
          onPause={pause}
          onStop={stop}
          onPrevious={previous}
          onNext={next}
          onSpeedChange={setSpeed}
          onPowerChange={setPower}
        />

        <RiderProfilePanel
          profile={riderProfile}
          disabled={!hasRoute || isImporting}
          onChange={updateRiderProfile}
          onReset={resetRiderProfile}
        />

        <div
          style={{
            marginTop: "1.25rem",
            display: "grid",
            gap: "0.75rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          }}
        >
          <StatCard label="Etat" value={getStateLabel(appState)} />
          <StatCard label="Vitesse" value={`${metrics.speed.toFixed(1)} km/h`} />
          <StatCard label="Cadence" value={`${metrics.cadence.toFixed(0)} rpm`} />
          <StatCard label="Puissance" value={`${metrics.power.toFixed(0)} W`} />
          <StatCard label="Distance" value={`${metrics.distance.toFixed(0)} m`} />
          <StatCard label="Elevation" value={`${metrics.elevation.toFixed(0)} m`} />
          <StatCard label="Temps" value={`${elapsedTime.toFixed(1)} s`} />
          <StatCard label="Progression" value={`${(progress * 100).toFixed(0)} %`} />
        </div>

        <DashboardAdvanced
          averageSpeed={averageSpeed}
          currentSpeed={metrics.speed}
          maxSpeed={maxSpeed}
          remainingDistance={remainingDistance}
          currentGradient={currentGradient}
          remainingPositiveElevation={elevationBreakdown.positive}
          remainingNegativeElevation={elevationBreakdown.negative}
          remainingTime={remainingTime}
          estimatedArrival={estimatedArrival}
        />

        <div
          style={{
            marginTop: "1.5rem",
          }}
        >
          <RouteInfo point={currentPoint} />
          <MapView
            route={route}
            currentPoint={currentPoint}
          />
        </div>
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article
      style={{
        borderRadius: "12px",
        border: "1px solid rgba(148, 163, 184, 0.25)",
        background: "rgba(15, 23, 42, 0.65)",
        padding: "0.8rem 0.95rem",
      }}
    >
      <p style={{ margin: 0, fontSize: "0.8rem", opacity: 0.75 }}>{label}</p>
      <p style={{ margin: "0.25rem 0 0", fontSize: "1.15rem", fontWeight: 650 }}>{value}</p>
    </article>
  );
}

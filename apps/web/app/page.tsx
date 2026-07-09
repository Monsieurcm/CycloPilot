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
      return "Aucun parcours chargé. Importez un fichier GPX pour commencer.";
    case "loading":
      return "Chargement du parcours en cours...";
    case "route-loaded":
      return "Parcours chargé. Vous pouvez lancer la simulation.";
    case "running":
      return "Simulation en cours.";
    case "finished":
      return "Simulation terminée. Appuyez sur Stop pour recommencer.";
    default:
      return "État inconnu.";
  }
}

function getStateLabel(state: AppSimulationState): string {
  switch (state) {
    case "no-route":
      return "Aucun parcours";
    case "loading":
      return "Chargement";
    case "route-loaded":
      return "Parcours chargé";
    case "running":
      return "Simulation en cours";
    case "finished":
      return "Simulation terminée";
    default:
      return "Inconnu";
  }
}

function getRouteElevationBreakdown(route: GPXPoint[]): { positive: number; negative: number } {
  if (route.length <= 1) {
    return { positive: 0, negative: 0 };
  }

  let positive = 0;
  let negative = 0;

  for (let i = 0; i < route.length - 1; i++) {
    const fromElevation = route[i].elevation ?? 0;
    const toElevation = route[i + 1].elevation ?? 0;
    const delta = toElevation - fromElevation;

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
  const [isExportingFit, setIsExportingFit] = useState(false);
  const [fitExportError, setFitExportError] = useState<string | null>(null);
  const [lastFitExportSummary, setLastFitExportSummary] = useState<{
    fileName: string;
    pointCount: number;
    durationSeconds: number;
    distanceMeters: number;
    fileSizeBytes: number;
  } | null>(null);
  const {
    metrics,
    playing,
    speed,
    power,
    powerMode,
    hasRecordedPower,
    activePowerSource,
    recordedMetrics,
    hasComparisonData,
    comparisonSnapshot,
    comparisonStats,
    virtualActivity,
    activitySummary,
    estimatedFutureFitSizeBytes,
    exportVirtualActivityFit,
    riderProfile,
    elapsedTime,
    progress,
    currentPoint,
    averageSpeed,
    maxSpeed,
    remainingDistance,
    remainingElevationBreakdown,
    remainingTime,
    estimatedArrival,
    play,
    pause,
    stop,
    next,
    previous,
    setSpeed,
    setPower,
    setPowerMode,
    updateRiderProfile,
    resetRiderProfile,
    loadRoute,
  } = useSimulation();

  useEffect(() => {
    loadRoute(route);
  }, [route, loadRoute]);

  const hasRoute = route.length > 0;
  const activityState = virtualActivity?.currentState;
  const displayedElapsedTime = activityState?.elapsedTime ?? elapsedTime;
  const displayedDistance = activityState?.traveledDistance ?? metrics.distance;
  const displayedSpeed = activityState?.currentSpeed ?? metrics.speed;
  const displayedPower = activityState?.currentPower ?? metrics.power;
  const displayedElevation = activityState?.currentPosition?.altitude ?? metrics.elevation;
  const currentGradient = currentPoint?.gradient ?? 0;
  const totalElevationBreakdown = getRouteElevationBreakdown(route);
  const displayedElevationBreakdown = progress > 0
    ? remainingElevationBreakdown
    : totalElevationBreakdown;

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
  const displayPowerMode = powerMode === "hybrid" ? "auto" : powerMode;
  const recordedPointsCount = virtualActivity?.points.length ?? 0;
  const estimatedFutureFitSizeKb = estimatedFutureFitSizeBytes / 1024;
  const canExportFit = appState === "finished";

  const handleExportFit = async () => {
    setIsExportingFit(true);
    setFitExportError(null);

    try {
      const exportResult = await exportVirtualActivityFit();
      const blob = new Blob([exportResult.file], { type: "application/octet-stream" });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const fileName = `virtual-activity-${Date.now()}.fit`;

      link.href = downloadUrl;
      link.download = fileName;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);

      setLastFitExportSummary({
        fileName,
        pointCount: exportResult.pointCount,
        durationSeconds: exportResult.durationSeconds,
        distanceMeters: exportResult.distanceMeters,
        fileSizeBytes: exportResult.file.byteLength,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      setFitExportError(`Echec de l'export FIT: ${message}`);
    } finally {
      setIsExportingFit(false);
    }
  };

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
          Simulation GPS avec suivi d'état et contrôles contextuels.
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
            État de l'application
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
          appliedPower={metrics.power}
          powerMode={displayPowerMode}
          hasRecordedPower={hasRecordedPower}
          activePowerSource={activePowerSource}
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
          onPowerModeChange={setPowerMode}
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
          <StatCard label="État" value={getStateLabel(appState)} />
          <StatCard label="Vitesse" value={`${displayedSpeed.toFixed(1)} km/h`} />
          <StatCard label="Cadence" value={`${metrics.cadence.toFixed(0)} rpm`} />
          <StatCard label="Puissance" value={`${displayedPower.toFixed(0)} W`} />
          <StatCard label="Distance" value={`${displayedDistance.toFixed(0)} m`} />
          <StatCard label="Élévation" value={`${displayedElevation.toFixed(0)} m`} />
          <StatCard label="Temps" value={`${displayedElapsedTime.toFixed(1)} s`} />
          <StatCard label="Progression" value={`${(progress * 100).toFixed(0)} %`} />
        </div>

        <div
          style={{
            marginTop: "0.9rem",
            borderRadius: "12px",
            border: "1px solid rgba(148, 163, 184, 0.25)",
            background: "rgba(15, 23, 42, 0.65)",
            padding: "0.8rem 0.95rem",
          }}
        >
          <p style={{ margin: 0, fontSize: "0.8rem", opacity: 0.75 }}>Résumé activité</p>
          <p style={{ margin: "0.3rem 0 0", fontSize: "0.95rem" }}>
            Durée simulée: {displayedElapsedTime.toFixed(1)} s | Distance parcourue: {displayedDistance.toFixed(0)} m | Points enregistrés: {recordedPointsCount} | Taille FIT estimée: {estimatedFutureFitSizeKb.toFixed(1)} KB
          </p>
        </div>

        {activitySummary && (
          <div
            style={{
              marginTop: "0.9rem",
              borderRadius: "12px",
              border: "1px solid rgba(148, 163, 184, 0.25)",
              background: "rgba(15, 23, 42, 0.65)",
              padding: "0.8rem 0.95rem",
            }}
          >
            <p style={{ margin: 0, fontSize: "0.8rem", opacity: 0.75 }}>Résumé complet avant export</p>
            <p style={{ margin: "0.3rem 0 0", fontSize: "0.95rem" }}>
              Durée simulée: {activitySummary.durationSeconds.toFixed(1)} s | Distance: {activitySummary.distanceMeters.toFixed(0)} m | Vitesse moyenne: {activitySummary.averageSpeedKmh.toFixed(1)} km/h
            </p>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.95rem" }}>
              Puissance moyenne: {activitySummary.averagePowerWatts.toFixed(0)} W | Dénivelé positif: {activitySummary.elevationGainMeters.toFixed(0)} m | Énergie estimée: {activitySummary.estimatedEnergyKj.toFixed(1)} kJ | Calories estimées: {activitySummary.estimatedCaloriesKcal.toFixed(1)} kcal
            </p>
          </div>
        )}

        {canExportFit && (
          <div
            style={{
              marginTop: "0.8rem",
              borderRadius: "12px",
              border: "1px solid rgba(148, 163, 184, 0.25)",
              background: "rgba(15, 23, 42, 0.65)",
              padding: "0.8rem 0.95rem",
            }}
          >
            <button
              type="button"
              onClick={() => {
                void handleExportFit();
              }}
              disabled={isExportingFit}
              style={{
                borderRadius: 8,
                border: "1px solid rgba(148, 163, 184, 0.35)",
                background: "rgba(30, 41, 59, 0.95)",
                color: "#f8fafc",
                padding: "0.5rem 0.8rem",
                cursor: isExportingFit ? "wait" : "pointer",
                fontWeight: 600,
              }}
            >
              {isExportingFit ? "Export FIT en cours..." : "Exporter l'activité (.FIT)"}
            </button>

            {fitExportError && (
              <p style={{ margin: "0.55rem 0 0", fontSize: "0.9rem", color: "#fca5a5" }}>
                {fitExportError}
              </p>
            )}

            {lastFitExportSummary && (
              <div style={{ marginTop: "0.6rem" }}>
                <p style={{ margin: 0, fontSize: "0.95rem", fontWeight: 650, color: "#86efac" }}>
                  Export FIT réussi.
                </p>
                <p style={{ margin: "0.2rem 0 0", fontSize: "0.9rem" }}>
                  Fichier créé: {lastFitExportSummary.fileName}
                </p>
                <p style={{ margin: "0.2rem 0 0", fontSize: "0.9rem" }}>
                  Points exportés: {lastFitExportSummary.pointCount} | Durée: {lastFitExportSummary.durationSeconds.toFixed(1)} s | Distance: {lastFitExportSummary.distanceMeters.toFixed(0)} m | Taille: {(lastFitExportSummary.fileSizeBytes / 1024).toFixed(1)} KB
                </p>
                <button
                  type="button"
                  onClick={() => {
                    stop();
                    setLastFitExportSummary(null);
                  }}
                  style={{
                    marginTop: "0.55rem",
                    borderRadius: 8,
                    border: "1px solid rgba(148, 163, 184, 0.35)",
                    background: "rgba(30, 41, 59, 0.95)",
                    color: "#f8fafc",
                    padding: "0.45rem 0.75rem",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Lancer une nouvelle simulation
                </button>
              </div>
            )}
          </div>
        )}

        <DashboardAdvanced
          averageSpeed={averageSpeed}
          currentSpeed={metrics.speed}
          maxSpeed={maxSpeed}
          remainingDistance={remainingDistance}
          currentGradient={currentGradient}
          remainingPositiveElevation={displayedElevationBreakdown.positive}
          remainingNegativeElevation={displayedElevationBreakdown.negative}
          remainingTime={remainingTime}
          estimatedArrival={estimatedArrival}
          currentCadence={recordedMetrics.cadence}
          currentHeartRate={recordedMetrics.heartRate}
          currentTemperature={recordedMetrics.temperature}
          fitRecordedPower={recordedMetrics.power}
          fitRecordedSpeed={recordedMetrics.speed}
          comparisonAvailable={hasComparisonData}
          comparison={comparisonSnapshot}
          comparisonStats={comparisonStats}
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

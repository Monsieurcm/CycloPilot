"use client";

import { useEffect, useState } from "react";
import type { GPXPoint } from "@cyclopilot/shared";
import { MapView } from "../src/components/MapView";
import { RouteInfo } from "../src/components/RouteInfo";
import { SimulationControls } from "../src/components/SimulationControls";
import { GPXUploader } from "../src/components/GPXUploader";
import { DashboardAdvanced } from "../src/components/DashboardAdvanced";
import { useSimulation } from "../src/hooks/useSimulation";

const DEMO_ROUTE: GPXPoint[] = [
  { lat: 48.8566, lon: 2.3522, elevation: 35, distance: 0 },
  { lat: 48.8572, lon: 2.3537, elevation: 38, distance: 180 },
  { lat: 48.858, lon: 2.3551, elevation: 42, distance: 360 },
  { lat: 48.8589, lon: 2.3567, elevation: 39, distance: 560 },
  { lat: 48.86, lon: 2.3583, elevation: 45, distance: 780 },
  { lat: 48.8612, lon: 2.36, elevation: 43, distance: 1020 },
];

export default function HomePage() {
  const [route, setRoute] = useState<GPXPoint[]>(DEMO_ROUTE);
  const {
    metrics,
    playing,
    speed,
    elapsedTime,
    progress,
    currentPoint,
    averageSpeed,
    maxSpeed,
    remainingDistance,
    remainingElevation,
    remainingTime,
    estimatedArrival,
    play,
    pause,
    stop,
    next,
    previous,
    setSpeed,
    loadRoute,
  } = useSimulation();

  useEffect(() => {
    loadRoute(route);
  }, [route, loadRoute]);

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
          Page reconstruite en page.tsx avec le hook useSimulation.
        </p>

        <GPXUploader
          onRouteLoaded={(newRoute) => {
            setRoute(newRoute);
          }}
        />

        <SimulationControls
          playing={playing}
          speed={speed}
          onPlay={play}
          onPause={pause}
          onStop={stop}
          onPrevious={previous}
          onNext={next}
          onSpeedChange={setSpeed}
        />

        <div
          style={{
            marginTop: "1.25rem",
            display: "grid",
            gap: "0.75rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          }}
        >
          <StatCard label="Etat" value={playing ? "En cours" : "Pause"} />
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
          maxSpeed={maxSpeed}
          remainingDistance={remainingDistance}
          remainingElevation={remainingElevation}
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

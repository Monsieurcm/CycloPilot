"use client";

import {
  formatDistance,
  formatDuration,
  formatSpeed,
  formatTime,
} from "../utils/format";

interface DashboardAdvancedProps {
  averageSpeed: number;
  maxSpeed: number;
  remainingDistance: number;
  remainingElevation: number;
  remainingTime: number;
  estimatedArrival?: Date;
}

export function DashboardAdvanced({
  averageSpeed,
  maxSpeed,
  remainingDistance,
  remainingElevation,
  remainingTime,
  estimatedArrival,
}: DashboardAdvancedProps) {
  return (
    <div
      style={{
        marginTop: "1.25rem",
        display: "grid",
        gap: "0.75rem",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
      }}
    >
      <DashboardCard label="Vitesse moyenne" value={formatSpeed(averageSpeed)} />
      <DashboardCard label="Vitesse max" value={formatSpeed(maxSpeed)} />
      <DashboardCard
        label="Distance restante"
        value={formatDistance(remainingDistance)}
      />
      <DashboardCard
        label="Dénivelé restant"
        value={`${Math.round(remainingElevation)} m`}
      />
      <DashboardCard
        label="Temps restant"
        value={formatDuration(remainingTime)}
      />
      <DashboardCard
        label="Heure d'arrivée"
        value={
          estimatedArrival ? formatTime(estimatedArrival) : "Calculat..."
        }
      />
    </div>
  );
}

function DashboardCard({ label, value }: { label: string; value: string }) {
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
      <p
        style={{
          margin: "0.25rem 0 0",
          fontSize: "1.15rem",
          fontWeight: 650,
        }}
      >
        {value}
      </p>
    </article>
  );
}

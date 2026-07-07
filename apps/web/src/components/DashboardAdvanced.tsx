"use client";

import {
  formatDistance,
  formatDuration,
  formatSpeed,
  formatTime,
} from "../utils/format";

interface DashboardAdvancedProps {
  averageSpeed: number;
  currentSpeed: number;
  maxSpeed: number;
  remainingDistance: number;
  currentGradient: number;
  remainingPositiveElevation: number;
  remainingNegativeElevation: number;
  remainingTime: number;
  estimatedArrival?: Date;
  currentCadence?: number;
  currentHeartRate?: number;
  currentTemperature?: number;
  fitRecordedPower?: number;
  fitRecordedSpeed?: number;
}

const MISSING_METRIC = "—";

function formatRecordedCadence(value?: number): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return MISSING_METRIC;
  }

  return `${Math.round(value)} rpm`;
}

function formatRecordedHeartRate(value?: number): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return MISSING_METRIC;
  }

  return `${Math.round(value)} bpm`;
}

function formatRecordedTemperature(value?: number): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return MISSING_METRIC;
  }

  return `${Math.round(value)} °C`;
}

function formatRecordedPower(value?: number): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return MISSING_METRIC;
  }

  return `${Math.round(value)} W`;
}

function formatRecordedSpeed(value?: number): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return MISSING_METRIC;
  }

  return formatSpeed(value * 3.6);
}

export function DashboardAdvanced({
  averageSpeed,
  currentSpeed,
  maxSpeed,
  remainingDistance,
  currentGradient,
  remainingPositiveElevation,
  remainingNegativeElevation,
  remainingTime,
  estimatedArrival,
  currentCadence,
  currentHeartRate,
  currentTemperature,
  fitRecordedPower,
  fitRecordedSpeed,
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
      <DashboardCard label="Vitesse calculée" value={formatSpeed(currentSpeed)} />
      <DashboardCard label="Vitesse max" value={formatSpeed(maxSpeed)} />
      <DashboardCard label="Pente actuelle" value={`${currentGradient.toFixed(1)} %`} />
      <DashboardCard
        label="Distance restante"
        value={formatDistance(remainingDistance)}
      />
      <DashboardCard
        label="Dénivelé restant"
        value={`${Math.round(remainingPositiveElevation)} m + / ${Math.round(remainingNegativeElevation)} m -`}
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
      <DashboardCard label="Cadence actuelle" value={formatRecordedCadence(currentCadence)} />
      <DashboardCard label="Frequence cardiaque" value={formatRecordedHeartRate(currentHeartRate)} />
      <DashboardCard label="Temperature" value={formatRecordedTemperature(currentTemperature)} />
      <DashboardCard label="Puissance FIT enregistree" value={formatRecordedPower(fitRecordedPower)} />
      <DashboardCard label="Vitesse enregistree" value={formatRecordedSpeed(fitRecordedSpeed)} />
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

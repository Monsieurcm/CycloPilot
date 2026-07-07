"use client";

import { useState } from "react";

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
  comparisonAvailable?: boolean;
  comparison?: {
    speed?: {
      simulated?: number;
      recorded?: number;
      absoluteDifference?: number;
      percentageDifference?: number;
    };
    power?: {
      simulated?: number;
      recorded?: number;
      absoluteDifference?: number;
      percentageDifference?: number;
    };
    cadence?: {
      simulated?: number;
      recorded?: number;
      absoluteDifference?: number;
      percentageDifference?: number;
    };
  };
  comparisonStats?: {
    sampleCount: number;
    averageSpeedErrorPercent?: number;
    maxSpeedErrorPercent?: number;
  };
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

function formatOptionalSpeed(value?: number): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return MISSING_METRIC;
  }

  return formatSpeed(value);
}

function formatOptionalPower(value?: number): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return MISSING_METRIC;
  }

  return `${Math.round(value)} W`;
}

function formatOptionalDiffKmh(value?: number): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return MISSING_METRIC;
  }

  return `${value.toFixed(1)} km/h`;
}

function formatOptionalPercent(value?: number): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return MISSING_METRIC;
  }

  return `${value.toFixed(1)} %`;
}

function getComparisonIndicator(averageErrorPercent?: number): string {
  if (typeof averageErrorPercent !== "number" || !Number.isFinite(averageErrorPercent)) {
    return "—";
  }

  if (averageErrorPercent <= 5) {
    return "Tres proche";
  }

  if (averageErrorPercent <= 15) {
    return "Correct";
  }

  return "Ecart important";
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
  comparisonAvailable = false,
  comparison,
  comparisonStats,
}: DashboardAdvancedProps) {
  const [comparisonEnabled, setComparisonEnabled] = useState(true);

  return (
    <>
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

      {comparisonAvailable && (
        <section
          style={{
            marginTop: "1rem",
            borderRadius: "12px",
            border: "1px solid rgba(148, 163, 184, 0.25)",
            background: "rgba(15, 23, 42, 0.65)",
            padding: "0.9rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.75rem",
              flexWrap: "wrap",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "1rem" }}>Comparaison Simulation / FIT</h3>
            <button
              type="button"
              onClick={() => setComparisonEnabled((current) => !current)}
              style={{
                border: "1px solid rgba(148, 163, 184, 0.35)",
                background: "rgba(30, 41, 59, 0.9)",
                color: "#f8fafc",
                borderRadius: 8,
                padding: "0.35rem 0.6rem",
                cursor: "pointer",
              }}
            >
              {comparisonEnabled ? "Desactiver" : "Activer"}
            </button>
          </div>

          {comparisonEnabled ? (
            <div
              style={{
                marginTop: "0.75rem",
                display: "grid",
                gap: "0.6rem",
                gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
              }}
            >
              <DashboardCard
                label="Vitesse FIT"
                value={formatOptionalSpeed(comparison?.speed?.recorded)}
              />
              <DashboardCard
                label="Vitesse simulee"
                value={formatOptionalSpeed(comparison?.speed?.simulated)}
              />
              <DashboardCard
                label="Difference vitesse"
                value={formatOptionalDiffKmh(comparison?.speed?.absoluteDifference)}
              />
              <DashboardCard
                label="Erreur vitesse"
                value={formatOptionalPercent(comparison?.speed?.percentageDifference)}
              />
              <DashboardCard
                label="Puissance FIT"
                value={formatOptionalPower(comparison?.power?.recorded)}
              />
              <DashboardCard
                label="Puissance moteur"
                value={formatOptionalPower(comparison?.power?.simulated)}
              />
              <DashboardCard
                label="Frequence cardiaque"
                value={formatRecordedHeartRate(currentHeartRate)}
              />
              <DashboardCard
                label="Cadence"
                value={formatRecordedCadence(comparison?.cadence?.recorded)}
              />
              <DashboardCard
                label="Erreur moyenne"
                value={formatOptionalPercent(comparisonStats?.averageSpeedErrorPercent)}
              />
              <DashboardCard
                label="Erreur maximale"
                value={formatOptionalPercent(comparisonStats?.maxSpeedErrorPercent)}
              />
              <DashboardCard
                label="Qualite"
                value={getComparisonIndicator(comparisonStats?.averageSpeedErrorPercent)}
              />
            </div>
          ) : (
            <p style={{ margin: "0.75rem 0 0", opacity: 0.8 }}>
              Mode comparaison desactive.
            </p>
          )}
        </section>
      )}
    </>
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

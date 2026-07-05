"use client";

import React from "react";
import { useSimulation } from "../hooks/useSimulation";
import { SimulationControls } from "./SimulationControls";

function formatDistance(distance: number): string {
  return `${distance.toFixed(2)} km`;
}

function formatSpeed(speed: number): string {
  return `${speed.toFixed(1)} km/h`;
}

function formatPower(power: number): string {
  return `${Math.round(power)} W`;
}

function formatCadence(cadence: number): string {
  return `${Math.round(cadence)} rpm`;
}

function formatElevation(elevation: number): string {
  return `${Math.round(elevation)} m`;
}

function formatElapsedTime(seconds: number): string {
  const total = Math.floor(seconds);

  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  return [h, m, s]
    .map((v) => v.toString().padStart(2, "0"))
    .join(":");
}

export function SimulationPanel() {
  const simulation = useSimulation();

  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 24,
        padding: 24,
        border: "1px solid #ddd",
        borderRadius: 12,
        background: "#fff",
      }}
    >
      <h2>Simulation</h2>

      <SimulationControls
        playing={simulation.playing}
        speed={simulation.speed}
        onPlay={simulation.play}
        onPause={simulation.pause}
        onStop={simulation.stop}
        onPrevious={simulation.previous}
        onNext={simulation.next}
        onSpeedChange={simulation.setSpeed}
      />

      <div>
        <progress
          value={simulation.progress}
          max={1}
          style={{
            width: "100%",
            height: 20,
          }}
        />

        <div
          style={{
            marginTop: 8,
            fontSize: 14,
          }}
        >
          {(simulation.progress * 100).toFixed(0)} %
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(160px, 1fr))",
          gap: 16,
        }}
      >
        <Metric
          label="Distance"
          value={formatDistance(simulation.metrics.distance)}
        />

        <Metric
          label="Altitude"
          value={formatElevation(simulation.metrics.elevation)}
        />

        <Metric
          label="Vitesse"
          value={formatSpeed(simulation.metrics.speed)}
        />

        <Metric
          label="Puissance"
          value={formatPower(simulation.metrics.power)}
        />

        <Metric
          label="Cadence"
          value={formatCadence(simulation.metrics.cadence)}
        />

        <Metric
          label="Temps"
          value={formatElapsedTime(simulation.elapsedTime)}
        />
      </div>
    </section>
  );
}

interface MetricProps {
  label: string;
  value: string;
}

function Metric({ label, value }: MetricProps) {
  return (
    <div
      style={{
        padding: 12,
        border: "1px solid #e5e5e5",
        borderRadius: 8,
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: "#666",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 20,
          fontWeight: 600,
          marginTop: 4,
        }}
      >
        {value}
      </div>
    </div>
  );
}

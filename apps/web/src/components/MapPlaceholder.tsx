"use client";

import type { GPXPoint } from "@cyclopilot/shared";

export interface MapPlaceholderProps {
  point: GPXPoint | null;
}

export function MapPlaceholder({ point }: MapPlaceholderProps) {
  return (
    <section
      style={{
        marginTop: 24,
        borderRadius: 12,
        border: "1px solid rgba(148,163,184,.25)",
        background: "rgba(15,23,42,.45)",
        padding: 20,
        minHeight: 320,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
      }}
    >
      <h3 style={{ marginTop: 0 }}>Carte (préparation)</h3>
      {point ? (
        <>
          <p>📍 Position actuelle</p>
          <code>
            {point.lat.toFixed(6)}, {point.lon.toFixed(6)}
          </code>
        </>
      ) : (
        <p>Aucune position disponible.</p>
      )}
    </section>
  );
}
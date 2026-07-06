"use client";

import type { GPXPoint } from "@cyclopilot/shared";

export interface RouteInfoProps {
  point: GPXPoint | null;
}

function formatCoordinate(value: number) {
  return value.toFixed(6);
}

export function RouteInfo({ point }: RouteInfoProps) {
  if (!point) {
    return (
      <section
        style={{
          border: "1px solid rgba(148,163,184,.25)",
          borderRadius: 12,
          padding: 16,
        }}
      >
        <strong>Position GPS</strong>
        <p
          style={{
            marginTop: 12,
            opacity: 0.7,
          }}
        >
          Aucun parcours chargé.
        </p>
      </section>
    );
  }

  return (
    <section
      style={{
        border: "1px solid rgba(148,163,184,.25)",
        borderRadius: 12,
        padding: 16,
      }}
    >
      <h3
        style={{
          marginTop: 0,
        }}
      >
        Position actuelle
      </h3>
      <table
        style={{
          width: "100%",
        }}
      >
        <tbody>
          <tr>
            <td>Latitude</td>
            <td>{formatCoordinate(point.lat)}</td>
          </tr>
          <tr>
            <td>Longitude</td>
            <td>{formatCoordinate(point.lon)}</td>
          </tr>
          <tr>
            <td>Altitude</td>
            <td>{Math.round(point.elevation)} m</td>
          </tr>
          <tr>
            <td>Distance</td>
            <td>{Math.round(point.distance ?? 0)} m</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

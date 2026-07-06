"use client";

import type { CSSProperties } from "react";
import type { RiderProfile } from "../hooks/useSimulation";

interface RiderProfilePanelProps {
  profile: RiderProfile;
  disabled?: boolean;
  onChange(profile: Partial<RiderProfile>): void;
  onReset(): void;
}

function inputStyle(): CSSProperties {
  return {
    width: "100%",
    padding: "0.4rem 0.5rem",
    borderRadius: 8,
    border: "1px solid rgba(148, 163, 184, 0.35)",
    background: "rgba(15, 23, 42, 0.5)",
    color: "#f8fafc",
  };
}

export function RiderProfilePanel({
  profile,
  disabled = false,
  onChange,
  onReset,
}: RiderProfilePanelProps) {
  return (
    <section
      style={{
        marginTop: "1rem",
        borderRadius: 12,
        border: "1px solid rgba(148, 163, 184, 0.25)",
        background: "rgba(15, 23, 42, 0.55)",
        padding: "0.9rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: "1rem" }}>Profil du cycliste</h2>
        <button
          onClick={onReset}
          disabled={disabled}
          style={{
            padding: "0.35rem 0.55rem",
            borderRadius: 8,
            border: "1px solid rgba(148, 163, 184, 0.35)",
            background: "rgba(2, 6, 23, 0.45)",
            color: "#f8fafc",
            cursor: disabled ? "not-allowed" : "pointer",
          }}
        >
          Reinitialiser aux valeurs par defaut
        </button>
      </div>

      <div
        style={{
          marginTop: "0.8rem",
          display: "grid",
          gap: "0.75rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span>Poids cycliste (kg)</span>
          <input
            type="number"
            min={35}
            step={1}
            value={profile.riderWeightKg}
            disabled={disabled}
            onChange={(event) => onChange({ riderWeightKg: Number(event.target.value) })}
            style={inputStyle()}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span>Poids velo (kg)</span>
          <input
            type="number"
            min={4}
            step={0.1}
            value={profile.bikeWeightKg}
            disabled={disabled}
            onChange={(event) => onChange({ bikeWeightKg: Number(event.target.value) })}
            style={inputStyle()}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span>CdA</span>
          <input
            type="number"
            min={0.1}
            step={0.01}
            value={profile.cda}
            disabled={disabled}
            onChange={(event) => onChange({ cda: Number(event.target.value) })}
            style={inputStyle()}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span>Crr</span>
          <input
            type="number"
            min={0.001}
            step={0.0005}
            value={profile.crr}
            disabled={disabled}
            onChange={(event) => onChange({ crr: Number(event.target.value) })}
            style={inputStyle()}
          />
        </label>
      </div>
    </section>
  );
}

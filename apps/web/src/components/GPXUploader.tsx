"use client";

import { useState } from "react";
import type { GPXPoint } from "@cyclopilot/shared";
import { parseGPX } from "../utils/gpxParser";

interface GPXUploaderProps {
  onRouteLoaded(route: GPXPoint[]): void;
}

export function GPXUploader({ onRouteLoaded }: GPXUploaderProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setFileName(file.name);

    try {
      const route = await parseGPX(file);
      onRouteLoaded(route);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to parse GPX: ${errorMessage}`);
      setFileName(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginBottom: 16, padding: 12, backgroundColor: "#f3f4f6", borderRadius: 8 }}>
      <label
        htmlFor="gpx-upload"
        style={{
          display: "block",
          marginBottom: 8,
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        Import GPX File
      </label>
      <input
        id="gpx-upload"
        type="file"
        accept=".gpx"
        onChange={handleFileChange}
        disabled={loading}
        style={{
          display: "block",
          width: "100%",
          padding: 8,
          border: "1px solid #d1d5db",
          borderRadius: 4,
          fontSize: 14,
        }}
      />
      {loading && (
        <p style={{ marginTop: 8, color: "#3b82f6", fontSize: 14 }}>
          Loading...
        </p>
      )}
      {fileName && !error && (
        <p style={{ marginTop: 8, color: "#10b981", fontSize: 14 }}>
          ✓ Loaded: {fileName}
        </p>
      )}
      {error && (
        <p style={{ marginTop: 8, color: "#ef4444", fontSize: 14 }}>
          ✗ {error}
        </p>
      )}
    </div>
  );
}

import React from "react";

export interface SimulationControlsProps {
  playing: boolean;
  speed: number;

  onPlay(): void;
  onPause(): void;
  onStop(): void;

  onPrevious(): void;
  onNext(): void;

  onSpeedChange(speed: number): void;
}

const SPEEDS = [0.5, 1, 2, 4, 8];

export function SimulationControls({
  playing,
  speed,
  onPlay,
  onPause,
  onStop,
  onPrevious,
  onNext,
  onSpeedChange,
}: SimulationControlsProps) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <button onClick={onPrevious}>
        ◀
      </button>

      {playing ? (
        <button onClick={onPause}>
          ⏸ Pause
        </button>
      ) : (
        <button onClick={onPlay}>
          ▶ Play
        </button>
      )}

      <button onClick={onStop}>
        ⏹ Stop
      </button>

      <button onClick={onNext}>
        ▶
      </button>

      <select
        value={speed}
        onChange={(e) =>
          onSpeedChange(Number(e.target.value))
        }
      >
        {SPEEDS.map((value) => (
          <option key={value} value={value}>
            {value}×
          </option>
        ))}
      </select>
    </div>
  );
}

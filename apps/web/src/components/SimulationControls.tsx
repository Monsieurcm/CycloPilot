import React from "react";

export interface SimulationControlsProps {
  playing: boolean;
  speed: number;
  power?: number;
  canPlay?: boolean;
  canPause?: boolean;
  canStop?: boolean;
  canPrevious?: boolean;
  canNext?: boolean;
  canChangeSpeed?: boolean;
  canChangePower?: boolean;

  onPlay(): void;
  onPause(): void;
  onStop(): void;

  onPrevious(): void;
  onNext(): void;

  onSpeedChange(speed: number): void;

  onPowerChange?(power: number): void;
}

const SPEEDS = [0.5, 1, 2, 4, 8];

export function SimulationControls({
  playing,
  speed,
  power = 0,
  canPlay = true,
  canPause = true,
  canStop = true,
  canPrevious = true,
  canNext = true,
  canChangeSpeed = true,
  canChangePower = true,
  onPlay,
  onPause,
  onStop,
  onPrevious,
  onNext,
  onSpeedChange,
  onPowerChange = () => {},
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
      <button onClick={onPrevious} disabled={!canPrevious}>
        ◀
      </button>

      {playing ? (
        <button onClick={onPause} disabled={!canPause}>
          ⏸ Pause
        </button>
      ) : (
        <button onClick={onPlay} disabled={!canPlay}>
          ▶ Play
        </button>
      )}

      <button onClick={onStop} disabled={!canStop}>
        ⏹ Stop
      </button>

      <button onClick={onNext} disabled={!canNext}>
        ▶
      </button>

      <select
        value={speed}
        disabled={!canChangeSpeed}
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

      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          minWidth: 220,
        }}
      >
        <span>Puissance</span>
        <input
          type="range"
          min="0"
          max="600"
          step="10"
          value={power}
          disabled={!canChangePower}
          onChange={(e) => onPowerChange(Number(e.target.value))}
          style={{ flex: 1 }}
        />
        <span>{power} W</span>
      </label>
    </div>
  );
}

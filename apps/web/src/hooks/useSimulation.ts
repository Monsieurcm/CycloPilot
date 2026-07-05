import { useCallback, useEffect, useMemo, useState } from "react";
import {
  SimulationEngine,
} from "@cyclopilot/simulation-engine";

import type {
  RideMetrics,
  SimulationConfig,
  GPXPoint,
  BikeProfile,
  DifficultyLevel,
  GPXTrack,
} from "@cyclopilot/shared";

const DEFAULT_BIKE_PROFILE: BikeProfile = {
  id: "road-bike",
  name: "Road Bike",
  description: "Lightweight road bike",
  multiplier: 1.0,
};

const DEFAULT_DIFFICULTY: DifficultyLevel = {
  id: "normal",
  name: "Normal",
  description: "Normal difficulty",
  resistanceMultiplier: 1.0,
};

const DEFAULT_TRACK: GPXTrack = {
  id: "default",
  name: "Default Track",
  distance: 0,
  elevation: {
    gain: 0,
    loss: 0,
    min: 0,
    max: 0,
  },
  points: [],
};

const DEFAULT_CONFIG: SimulationConfig = {
  bikeProfile: DEFAULT_BIKE_PROFILE,
  difficulty: DEFAULT_DIFFICULTY,
  track: DEFAULT_TRACK,
};

export interface UseSimulationResult {
  metrics: RideMetrics;

  playing: boolean;

  speed: number;

  elapsedTime: number;

  progress: number;

  play(): void;

  pause(): void;

  stop(): void;

  toggle(): void;

  seek(index: number): void;

  next(): void;

  previous(): void;

  setSpeed(speed: number): void;

  loadRoute(points: GPXPoint[]): void;
}

export function useSimulation(
  config: SimulationConfig = DEFAULT_CONFIG
): UseSimulationResult {

  const engine = useMemo(
    () => new SimulationEngine(config),
    [config]
  );

  const [metrics, setMetrics] =
    useState<RideMetrics>(engine.getMetrics());

  const [playing, setPlaying] =
    useState(engine.isPlaying());

  const [speed, setPlaybackSpeed] =
    useState(engine.getSpeed());

  const [elapsedTime, setElapsedTime] =
    useState(engine.getElapsedTime());

  const [progress, setProgress] =
    useState(engine.getProgress());

  useEffect(() => {

    const unsubscribeMetrics =
      engine.onUpdate((m) => {

        setMetrics(m);

        setProgress(engine.getProgress());

      });

    const unsubscribeState =
      engine.onStateChanged((state) => {

        setPlaying(state.playing);

        setPlaybackSpeed(state.speed);

        setElapsedTime(state.elapsedTime);

      });

    return () => {

      unsubscribeMetrics();

      unsubscribeState();

    };

  }, [engine]);

  const play = useCallback(
    () => engine.play(),
    [engine]
  );

  const pause = useCallback(
    () => engine.pause(),
    [engine]
  );

  const stop = useCallback(
    () => engine.stop(),
    [engine]
  );

  const toggle = useCallback(
    () => engine.togglePlayPause(),
    [engine]
  );

  const seek = useCallback(
    (index: number) => engine.seek(index),
    [engine]
  );

  const next = useCallback(
    () => engine.next(),
    [engine]
  );

  const previous = useCallback(
    () => engine.previous(),
    [engine]
  );

  const setSpeed = useCallback(
    (speed: number) => engine.setSpeed(speed),
    [engine]
  );

  const loadRoute = useCallback(
    (points: GPXPoint[]) => engine.loadRoute(points),
    [engine]
  );

  return {

    metrics,

    playing,

    speed,

    elapsedTime,

    progress,

    play,

    pause,

    stop,

    toggle,

    seek,

    next,

    previous,

    setSpeed,

    loadRoute,

  };

}

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  SimulationEngine,
  type SimulationPowerMode,
  type SimulationPowerSource,
} from "@cyclopilot/simulation-engine";

import type {
  RideMetrics,
  SimulationConfig,
  GPXPoint,
  BikeProfile,
  DifficultyLevel,
  GPXTrack,
  VirtualActivity,
} from "@cyclopilot/shared";

export type RiderProfile = ReturnType<SimulationEngine["getRiderProfile"]>;
export type RecordedRouteMetrics = ReturnType<SimulationEngine["getCurrentRecordedMetrics"]>;
export type SimulationComparisonSnapshot = ReturnType<SimulationEngine["getComparisonSnapshot"]>;
export type SimulationComparisonStats = ReturnType<SimulationEngine["getComparisonStats"]>;
export type VirtualActivityState = ReturnType<SimulationEngine["getVirtualActivity"]>;
export type EstimatedFutureFitSizeBytes = ReturnType<SimulationEngine["getEstimatedFutureFitSizeBytes"]>;
export type ActivitySummaryState = ReturnType<SimulationEngine["getActivitySummary"]>;
export type RemainingElevationBreakdown = ReturnType<SimulationEngine["getRemainingElevationBreakdown"]>;
export type FitValidationResult = Awaited<ReturnType<SimulationEngine["validateVirtualActivityFit"]>>;

export interface FitExportResult {
  file: ArrayBuffer;
  validation: FitValidationResult;
  pointCount: number;
  durationSeconds: number;
  distanceMeters: number;
}

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

  route: GPXPoint[];

  currentPoint: GPXPoint | null;

  playing: boolean;

  speed: number;

  power: number;

  powerMode: SimulationPowerMode;

  hasRecordedPower: boolean;

  activePowerSource: SimulationPowerSource;

  recordedMetrics: RecordedRouteMetrics;

  hasComparisonData: boolean;

  comparisonSnapshot: SimulationComparisonSnapshot;

  comparisonStats: SimulationComparisonStats;

  virtualActivity: VirtualActivityState;

  activitySummary: ActivitySummaryState;

  estimatedFutureFitSizeBytes: EstimatedFutureFitSizeBytes;

  exportVirtualActivityFit(): Promise<FitExportResult>;

  riderProfile: RiderProfile;

  elapsedTime: number;

  progress: number;

  averageSpeed: number;

  maxSpeed: number;

  remainingDistance: number;

  remainingElevation: number;

  remainingElevationBreakdown: RemainingElevationBreakdown;

  remainingTime: number;

  estimatedArrival: Date;

  play(): void;

  pause(): void;

  stop(): void;

  toggle(): void;

  seek(index: number): void;

  next(): void;

  previous(): void;

  setSpeed(speed: number): void;

  setPower(power: number): void;

  setPowerMode(mode: SimulationPowerMode): void;

  updateRiderProfile(profile: Partial<RiderProfile>): void;

  resetRiderProfile(): void;

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

  const [power, setSimulationPower] =
    useState(0);

  const [powerMode, setPowerModeState] =
    useState<SimulationPowerMode>(engine.getPowerMode());

  const [hasRecordedPower, setHasRecordedPower] =
    useState<boolean>(engine.hasRecordedPower());

  const [activePowerSource, setActivePowerSource] =
    useState<SimulationPowerSource>(engine.getActivePowerSource());

  const [recordedMetrics, setRecordedMetrics] =
    useState<RecordedRouteMetrics>(engine.getCurrentRecordedMetrics());

  const [hasComparisonData, setHasComparisonData] =
    useState<boolean>(engine.hasRecordedComparisonData());

  const [comparisonSnapshot, setComparisonSnapshot] =
    useState<SimulationComparisonSnapshot>(engine.getComparisonSnapshot());

  const [comparisonStats, setComparisonStats] =
    useState<SimulationComparisonStats>(engine.getComparisonStats());

  const [virtualActivity, setVirtualActivity] =
    useState<VirtualActivityState>(engine.getVirtualActivity());

  const [activitySummary, setActivitySummary] =
    useState<ActivitySummaryState>(engine.getActivitySummary());

  const [estimatedFutureFitSizeBytes, setEstimatedFutureFitSizeBytes] =
    useState<EstimatedFutureFitSizeBytes>(engine.getEstimatedFutureFitSizeBytes());

  const [riderProfile, setRiderProfileState] =
    useState<RiderProfile>(engine.getRiderProfile());

  const [elapsedTime, setElapsedTime] =
    useState(engine.getElapsedTime());

  const [progress, setProgress] =
    useState(engine.getProgress());

  const [route, setRoute] =
    useState<GPXPoint[]>(engine.getRoute());

  const [currentPoint, setCurrentPoint] =
    useState<GPXPoint | null>(engine.getCurrentPoint());

  const [averageSpeed, setAverageSpeed] =
    useState<number>(engine.getAverageSpeed());

  const [maxSpeed, setMaxSpeed] =
    useState<number>(engine.getMaxSpeed());

  const [remainingDistance, setRemainingDistance] =
    useState<number>(engine.getRemainingDistance());

  const [remainingElevation, setRemainingElevation] =
    useState<number>(engine.getRemainingElevation());

  const [remainingElevationBreakdown, setRemainingElevationBreakdown] =
    useState<RemainingElevationBreakdown>(engine.getRemainingElevationBreakdown());

  const [remainingTime, setRemainingTime] =
    useState<number>(engine.getRemainingTime());

  const [estimatedArrival, setEstimatedArrival] =
    useState<Date>(engine.getEstimatedArrival());

  const mapVirtualActivityCurrentPoint = useCallback((activity: VirtualActivity): GPXPoint | null => {
    const position = activity.currentState.currentPosition;

    if (!position) {
      return null;
    }

    return {
      lat: position.lat,
      lon: position.lon,
      elevation: position.altitude,
      distance: position.distance,
      gradient: activity.currentState.currentGradient,
    };
  }, []);

  const syncFromEngine = useCallback(() => {
    const activity = engine.getVirtualActivity();
    const engineMetrics = engine.getMetrics();

    if (activity) {
      setMetrics({
        ...engineMetrics,
        speed: activity.currentState.currentSpeed,
        power: activity.currentState.currentPower,
        distance: activity.currentState.traveledDistance,
        elevation: activity.currentState.currentPosition?.altitude ?? engineMetrics.elevation,
      });
      setRoute(activity.route.originalRoute);
      setCurrentPoint(mapVirtualActivityCurrentPoint(activity));
    } else {
      setMetrics(engineMetrics);
      setRoute(engine.getRoute());
      setCurrentPoint(engine.getCurrentPoint());
    }

    setPlaying(engine.isPlaying());
    setPlaybackSpeed(engine.getSpeed());
    setElapsedTime(engine.getElapsedTime());
    setProgress(engine.getProgress());
    setVirtualActivity(activity);
    setActivitySummary(engine.getActivitySummary());
    setEstimatedFutureFitSizeBytes(engine.getEstimatedFutureFitSizeBytes());
    setAverageSpeed(engine.getAverageSpeed());
    setMaxSpeed(engine.getMaxSpeed());
    setRemainingDistance(engine.getRemainingDistance());
    setRemainingElevation(engine.getRemainingElevation());
    setRemainingElevationBreakdown(engine.getRemainingElevationBreakdown());
    setRemainingTime(engine.getRemainingTime());
    setEstimatedArrival(engine.getEstimatedArrival());
    setRiderProfileState(engine.getRiderProfile());
    setPowerModeState(engine.getPowerMode());
    setHasRecordedPower(engine.hasRecordedPower());
    setActivePowerSource(engine.getActivePowerSource());
    setRecordedMetrics(engine.getCurrentRecordedMetrics());
    setHasComparisonData(engine.hasRecordedComparisonData());
    setComparisonSnapshot(engine.getComparisonSnapshot());
    setComparisonStats(engine.getComparisonStats());
  }, [engine, mapVirtualActivityCurrentPoint]);

  useEffect(() => {

    const unsubscribeMetrics =
      engine.onUpdate(() => {
        syncFromEngine();
      });

    const unsubscribeState =
      engine.onStateChanged(() => {
        syncFromEngine();
      });

    syncFromEngine();

    return () => {

      unsubscribeMetrics();

      unsubscribeState();

    };

  }, [engine, syncFromEngine]);

  useEffect(() => {
    if (!playing) {
      return;
    }

    const timer = window.setInterval(() => {
      engine.step(0.25, power);
    }, 250);

    return () => {
      window.clearInterval(timer);
    };
  }, [engine, playing, power]);

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

  const setPower = useCallback(
    (powerValue: number) => setSimulationPower(Math.max(0, powerValue)),
    []
  );

  const setPowerMode = useCallback(
    (mode: SimulationPowerMode) => {
      engine.setPowerMode(mode);
      setPowerModeState(engine.getPowerMode());
      setActivePowerSource(engine.getActivePowerSource());
    },
    [engine]
  );

  const updateRiderProfile = useCallback(
    (profile: Partial<RiderProfile>) => {
      engine.setRiderProfile(profile);
      setRiderProfileState(engine.getRiderProfile());
    },
    [engine]
  );

  const resetRiderProfile = useCallback(
    () => {
      engine.resetRiderProfile();
      setRiderProfileState(engine.getRiderProfile());
    },
    [engine]
  );

  const loadRoute = useCallback(
    (points: GPXPoint[]) => {
      engine.loadRoute(points);
      syncFromEngine();
    },
    [engine, syncFromEngine]
  );

  const exportVirtualActivityFit = useCallback(async (): Promise<FitExportResult> => {
    const file = engine.exportVirtualActivityFitArrayBuffer();
    const validation = await engine.validateVirtualActivityFit();
    const activity = engine.getVirtualActivity();

    return {
      file,
      validation,
      pointCount: activity?.points.length ?? 0,
      durationSeconds: activity?.currentState.elapsedTime ?? 0,
      distanceMeters: activity?.currentState.traveledDistance ?? 0,
    };
  }, [engine]);

  return {

    metrics,

    route,

    currentPoint,

    playing,

    speed,

    power,

    powerMode,

    hasRecordedPower,

    activePowerSource,

    recordedMetrics,

    hasComparisonData,

    comparisonSnapshot,

    comparisonStats,

    virtualActivity,

    activitySummary,

    estimatedFutureFitSizeBytes,

    exportVirtualActivityFit,

    riderProfile,

    elapsedTime,

    progress,

    averageSpeed,

    maxSpeed,

    remainingDistance,

    remainingElevation,

    remainingElevationBreakdown,

    remainingTime,

    estimatedArrival,

    play,

    pause,

    stop,

    toggle,

    seek,

    next,

    previous,

    setSpeed,

    setPower,

    setPowerMode,

    updateRiderProfile,

    resetRiderProfile,

    loadRoute,

  };

}

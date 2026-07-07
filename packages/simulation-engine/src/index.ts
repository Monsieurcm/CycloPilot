import {
  RideMetrics,
  SimulationConfig,
  GPXPoint,
  type ActivityPoint,
  type ActivityRouteSource,
  type VirtualActivity,
  type VirtualActivityCurrentPosition,
} from "@cyclopilot/shared";
import {
  exportVirtualActivityToFitArrayBuffer,
  validateFitArrayBuffer,
  type FitValidationResult,
} from "@cyclopilot/fit-engine";
import {
  applyRiderPhysicsOverrides,
  buildRiderPhysicsProfile,
  type RiderPhysicsProfile,
  type RiderPhysicsProfileOverrides,
  createDefaultPhysicsProfile,
  calculateGradePercent,
  getMaxSafeSpeedKmh,
  estimateSpeedFromPower,
} from "./physics";

interface SimulationState {
  playing: boolean;
  speed: number;
  elapsedTime: number;
  currentIndex: number;
}

export interface RecordedRouteMetrics {
  cadence?: number;
  heartRate?: number;
  temperature?: number;
  power?: number;
  speed?: number;
}

export interface ComparisonPair {
  simulated?: number;
  recorded?: number;
  absoluteDifference?: number;
  percentageDifference?: number;
}

export interface SimulationComparison {
  speed: ComparisonPair;
  power: ComparisonPair;
  cadence: ComparisonPair;
}

export interface SimulationComparisonStats {
  sampleCount: number;
  averageSpeedErrorPercent?: number;
  maxSpeedErrorPercent?: number;
}

export interface SimulationActivitySummary {
  durationSeconds: number;
  distanceMeters: number;
  averageSpeedKmh: number;
  averagePowerWatts: number;
  elevationGainMeters: number;
  estimatedEnergyKj: number;
  estimatedCaloriesKcal: number;
}

export type SimulationPowerMode = "auto" | "fit" | "user" | "hybrid";
export type SimulationPowerSource = "fit" | "user" | "none";

interface ResolvedPower {
  power: number;
  source: SimulationPowerSource;
}

interface ComparisonAccumulator {
  count: number;
  sumPercent: number;
  maxPercent: number;
}

type MetricsListener = (metrics: RideMetrics) => void;
type StateListener = (state: Readonly<SimulationState>) => void;

const DEFAULT_METRICS: RideMetrics = {
  speed: 0,
  cadence: 0,
  power: 0,
  distance: 0,
  elevation: 0,
};

const DEFAULT_STATE: SimulationState = {
  playing: false,
  speed: 1,
  elapsedTime: 0,
  currentIndex: 0,
};

const ESTIMATED_FIT_HEADER_BYTES = 14;
const ESTIMATED_FIT_BASE_RECORD_BYTES = 28;
const ESTIMATED_FIT_OPTIONAL_FIELD_BYTES = 4;

function clampSimulationSpeed(speed: number): number {
  return Math.min(8, Math.max(0.5, speed));
}

function normalizeOptionalMetric(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return value;
}

function buildComparisonPair(simulated?: number, recorded?: number): ComparisonPair {
  const normalizedSimulated = normalizeOptionalMetric(simulated);
  const normalizedRecorded = normalizeOptionalMetric(recorded);

  if (normalizedSimulated === undefined && normalizedRecorded === undefined) {
    return {};
  }

  const absoluteDifference =
    normalizedSimulated !== undefined && normalizedRecorded !== undefined
      ? Math.abs(normalizedSimulated - normalizedRecorded)
      : undefined;
  const percentageDifference =
    absoluteDifference !== undefined && normalizedRecorded !== undefined && normalizedRecorded > 0
      ? (absoluteDifference / normalizedRecorded) * 100
      : undefined;

  return {
    simulated: normalizedSimulated,
    recorded: normalizedRecorded,
    absoluteDifference,
    percentageDifference,
  };
}

function calculateProgress(routeLength: number, currentIndex: number): number {
  if (routeLength <= 1) {
    return 0;
  }

  return currentIndex / (routeLength - 1);
}

function calculateAverageSpeed(distanceMeters: number, elapsedSeconds: number): number {
  if (elapsedSeconds <= 0) {
    return 0;
  }

  const distanceKm = distanceMeters / 1000;
  const timeHours = elapsedSeconds / 3600;

  return timeHours > 0 ? distanceKm / timeHours : 0;
}

function calculateRemainingDistance(route: GPXPoint[], currentDistance: number): number {
  if (route.length === 0) {
    return 0;
  }

  const lastPoint = route[route.length - 1];
  const totalDistance = lastPoint?.distance ?? 0;

  return Math.max(0, totalDistance - currentDistance);
}

function calculateRemainingElevation(route: GPXPoint[], currentIndex: number): number {
  if (route.length === 0 || currentIndex >= route.length) {
    return 0;
  }

  let elevationGain = 0;
  for (let i = currentIndex; i < route.length - 1; i++) {
    const nextElevation = route[i + 1].elevation ?? 0;
    const currentElevation = route[i].elevation ?? 0;
    const gain = nextElevation - currentElevation;

    if (gain > 0) {
      elevationGain += gain;
    }
  }

  return Math.max(0, elevationGain);
}

function calculateRemainingTimeSeconds(speedKmh: number, remainingDistanceMeters: number): number {
  if (speedKmh <= 0) {
    return Infinity;
  }

  const currentSpeedMs = speedKmh / 3.6;

  if (currentSpeedMs <= 0) {
    return Infinity;
  }

  return remainingDistanceMeters / currentSpeedMs;
}

function calculateEstimatedArrivalDate(remainingSeconds: number): Date {
  if (!isFinite(remainingSeconds)) {
    return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  }

  return new Date(Date.now() + remainingSeconds * 1000);
}

export class SimulationEngine {
  private readonly config: SimulationConfig;
  private riderProfile: RiderPhysicsProfile;
  private powerMode: SimulationPowerMode = "auto";
  private hasRecordedRoutePower = false;
  private activePowerSource: SimulationPowerSource = "none";

  private route: GPXPoint[] = [];

  private metrics: RideMetrics = { ...DEFAULT_METRICS };

  private state: SimulationState = { ...DEFAULT_STATE };

  private indexStepAccumulator = 0;

  private comparison: SimulationComparison = {
    speed: {},
    power: {},
    cadence: {},
  };

  private comparisonAccumulator: ComparisonAccumulator = {
    count: 0,
    sumPercent: 0,
    maxPercent: 0,
  };

  private virtualActivity: VirtualActivity | null = null;

  private lastActivityPointTimestampMs = 0;

  private readonly metricsListeners = new Set<MetricsListener>();
  private readonly stateListeners = new Set<StateListener>();

  constructor(config: SimulationConfig) {
    this.config = config;
    this.riderProfile = createDefaultPhysicsProfile(config);
  }

  getRiderProfile(): RiderPhysicsProfile {
    return { ...this.riderProfile };
  }

  setRiderProfile(overrides: RiderPhysicsProfileOverrides): void {
    this.riderProfile = applyRiderPhysicsOverrides(this.riderProfile, overrides);

    if (this.virtualActivity) {
      this.virtualActivity.parameters.riderProfile = { ...this.riderProfile };
    }
  }

  resetRiderProfile(): void {
    this.riderProfile = buildRiderPhysicsProfile(this.config);

    if (this.virtualActivity) {
      this.virtualActivity.parameters.riderProfile = { ...this.riderProfile };
    }
  }

  getPowerMode(): SimulationPowerMode {
    return this.powerMode;
  }

  setPowerMode(mode: SimulationPowerMode): void {
    this.powerMode = mode;

    if (this.virtualActivity) {
      this.virtualActivity.parameters.powerStrategy = mode;
    }
  }

  hasRecordedPower(): boolean {
    return this.hasRecordedRoutePower;
  }

  getActivePowerSource(): SimulationPowerSource {
    return this.activePowerSource;
  }

  getCurrentRecordedMetrics(): RecordedRouteMetrics {
    const point = this.getCurrentPoint();

    if (!point) {
      return {};
    }

    return {
      cadence: normalizeOptionalMetric(point.cadence),
      heartRate: normalizeOptionalMetric(point.heartRate),
      temperature: normalizeOptionalMetric(point.temperature),
      power: normalizeOptionalMetric(point.power),
      speed: normalizeOptionalMetric(point.speed),
    };
  }

  getComparisonSnapshot(): SimulationComparison {
    return {
      speed: { ...this.comparison.speed },
      power: { ...this.comparison.power },
      cadence: { ...this.comparison.cadence },
    };
  }

  getComparisonStats(): SimulationComparisonStats {
    if (this.comparisonAccumulator.count === 0) {
      return { sampleCount: 0 };
    }

    return {
      sampleCount: this.comparisonAccumulator.count,
      averageSpeedErrorPercent: this.comparisonAccumulator.sumPercent / this.comparisonAccumulator.count,
      maxSpeedErrorPercent: this.comparisonAccumulator.maxPercent,
    };
  }

  hasRecordedComparisonData(): boolean {
    return this.route.some((point) => {
      const speed = normalizeOptionalMetric(point.fitMetrics?.speed ?? point.speed);
      const power = normalizeOptionalMetric(point.fitMetrics?.power ?? point.power);
      const cadence = normalizeOptionalMetric(point.fitMetrics?.cadence ?? point.cadence);
      const heartRate = normalizeOptionalMetric(point.heartRate);

      return speed !== undefined || power !== undefined || cadence !== undefined || heartRate !== undefined;
    });
  }

  getVirtualActivity(): VirtualActivity | null {
    if (!this.virtualActivity) {
      return null;
    }

    return {
      ...this.virtualActivity,
      metadata: { ...this.virtualActivity.metadata },
      parameters: {
        ...this.virtualActivity.parameters,
        riderProfile: { ...this.virtualActivity.parameters.riderProfile },
        bikeProfile: { ...this.virtualActivity.parameters.bikeProfile },
      },
      route: {
        ...this.virtualActivity.route,
        originalRoute: [...this.virtualActivity.route.originalRoute],
      },
      currentState: {
        ...this.virtualActivity.currentState,
        currentPosition: this.virtualActivity.currentState.currentPosition
          ? { ...this.virtualActivity.currentState.currentPosition }
          : null,
      },
      points: [...this.virtualActivity.points],
    };
  }

  exportVirtualActivityFitArrayBuffer(): ArrayBuffer {
    if (!this.virtualActivity) {
      throw new Error("No virtual activity available for FIT export");
    }

    return exportVirtualActivityToFitArrayBuffer(this.virtualActivity);
  }

  async validateVirtualActivityFit(): Promise<FitValidationResult> {
    const fitBuffer = this.exportVirtualActivityFitArrayBuffer();
    return validateFitArrayBuffer(fitBuffer);
  }

  getEstimatedFutureFitSizeBytes(): number {
    if (!this.virtualActivity) {
      return 0;
    }

    const recordsSize = this.virtualActivity.points.reduce((size, point) => {
      let recordSize = ESTIMATED_FIT_BASE_RECORD_BYTES;

      if (typeof point.cadence === "number") {
        recordSize += ESTIMATED_FIT_OPTIONAL_FIELD_BYTES;
      }

      if (typeof point.heartRate === "number") {
        recordSize += ESTIMATED_FIT_OPTIONAL_FIELD_BYTES;
      }

      return size + recordSize;
    }, 0);

    return ESTIMATED_FIT_HEADER_BYTES + recordsSize;
  }

  getActivitySummary(): SimulationActivitySummary | null {
    if (!this.virtualActivity) {
      return null;
    }

    const durationSeconds = Math.max(0, this.virtualActivity.currentState.elapsedTime);
    const distanceMeters = Math.max(0, this.virtualActivity.currentState.traveledDistance);
    const averageSpeedKmh = calculateAverageSpeed(distanceMeters, durationSeconds);
    const elevationGainMeters = Math.max(0, this.virtualActivity.route.elevationGain);

    const recordedPowers = this.virtualActivity.points
      .map((point) => point.power)
      .filter((value) => Number.isFinite(value) && value >= 0);

    const averagePowerWatts = recordedPowers.length > 0
      ? recordedPowers.reduce((sum, value) => sum + value, 0) / recordedPowers.length
      : Math.max(0, this.virtualActivity.currentState.currentPower);

    const estimatedEnergyKj = (averagePowerWatts * durationSeconds) / 1000;
    const estimatedCaloriesKcal = estimatedEnergyKj / 4.184;

    return {
      durationSeconds,
      distanceMeters,
      averageSpeedKmh,
      averagePowerWatts,
      elevationGainMeters,
      estimatedEnergyKj,
      estimatedCaloriesKcal,
    };
  }

  private getCurrentRecordedPower(): number | null {
    const point = this.getCurrentPoint();
    const pointPower = point?.power;

    if (typeof pointPower === "number" && Number.isFinite(pointPower) && pointPower >= 0) {
      return pointPower;
    }

    return null;
  }

  private resolvePower(userPower: number): ResolvedPower {
    const normalizedUserPower = Number.isFinite(userPower) && userPower > 0
      ? userPower
      : 0;
    const fitPower = this.getCurrentRecordedPower();

    if (this.powerMode === "fit") {
      if (fitPower !== null && fitPower > 0) {
        return { power: fitPower, source: "fit" };
      }

      return { power: 0, source: "none" };
    }

    if (this.powerMode === "user") {
      if (normalizedUserPower > 0) {
        return { power: normalizedUserPower, source: "user" };
      }

      return { power: 0, source: "none" };
    }

    if (this.powerMode === "hybrid") {
      if (fitPower !== null && fitPower > 0) {
        return { power: fitPower, source: "fit" };
      }

      if (normalizedUserPower > 0) {
        return { power: normalizedUserPower, source: "user" };
      }

      return { power: 0, source: "none" };
    }

    if (fitPower !== null && fitPower > 0) {
      return { power: fitPower, source: "fit" };
    }

    if (normalizedUserPower > 0) {
      return { power: normalizedUserPower, source: "user" };
    }

    return { power: 0, source: "none" };
  }

  // -----------------------------------------------------------------------
  // Events
  // -----------------------------------------------------------------------

  onUpdate(listener: MetricsListener): () => void {
    this.metricsListeners.add(listener);
    return () => this.offUpdate(listener);
  }

  offUpdate(listener: MetricsListener): void {
    this.metricsListeners.delete(listener);
  }

  onStateChanged(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    return () => this.offStateChanged(listener);
  }

  offStateChanged(listener: StateListener): void {
    this.stateListeners.delete(listener);
  }

  private emitMetrics(): void {
    const metrics = this.getMetrics();

    this.metricsListeners.forEach((listener) => listener(metrics));
  }

  private emitState(): void {
    const state = Object.freeze({ ...this.state });

    this.stateListeners.forEach(listener => listener(state));
  }

  /**
   * Load a parsed GPX route.
   */
  loadRoute(points: GPXPoint[]): void {
    this.route = [...points];
    this.hasRecordedRoutePower = this.route.some((point) =>
      typeof point.power === "number" && Number.isFinite(point.power) && point.power >= 0
    );
    this.activePowerSource = "none";
    this.state.currentIndex = DEFAULT_STATE.currentIndex;
    this.state.elapsedTime = DEFAULT_STATE.elapsedTime;
    this.indexStepAccumulator = 0;
    this.lastActivityPointTimestampMs = 0;
    this.virtualActivity = this.createVirtualActivity(this.route);
    this.resetComparisonState();

    this.refreshMetrics();

    this.emitMetrics();
    this.emitState();
  }

  play(): void {
    this.state.playing = true;
    this.emitState();
  }

  pause(): void {
    this.state.playing = false;
    this.emitState();
  }

  stop(): void {
    this.state.playing = DEFAULT_STATE.playing;
    this.state.elapsedTime = DEFAULT_STATE.elapsedTime;
    this.state.currentIndex = DEFAULT_STATE.currentIndex;
    this.indexStepAccumulator = 0;
    this.lastActivityPointTimestampMs = 0;
    this.resetVirtualActivityProgress();
    this.resetComparisonState();

    this.refreshMetrics();

    this.emitMetrics();
    this.emitState();
  }

  togglePlayPause(): void {
    this.state.playing = !this.state.playing;
    this.emitState();
  }

  isPlaying(): boolean {
    return this.state.playing;
  }

  setSpeed(speed: number): void {
    this.state.speed = clampSimulationSpeed(speed);
    this.emitState();
  }

  getSpeed(): number {
    return this.state.speed;
  }

  getElapsedTime(): number {
    return this.state.elapsedTime;
  }

  getCurrentIndex(): number {
    return this.state.currentIndex;
  }

  getProgress(): number {
    return calculateProgress(this.route.length, this.state.currentIndex);
  }

  getCurrentPoint(): GPXPoint | null {
    if (this.route.length === 0) {
      return null;
    }

    return this.route[this.state.currentIndex];
  }

  getRoute(): GPXPoint[] {
    return [...this.route];
  }

  seek(index: number): void {
    if (this.route.length === 0) {
      return;
    }

    this.state.currentIndex = Math.max(
      0,
      Math.min(index, this.route.length - 1),
    );

    this.refreshMetrics();

    this.emitMetrics();
    this.emitState();
  }

  next(): void {
    this.seek(this.state.currentIndex + 1);
  }

  previous(): void {
    this.seek(this.state.currentIndex - 1);
  }

  step(deltaTime: number, userPower: number): RideMetrics {
    if (!this.state.playing) {
      return this.getMetrics();
    }

    if (this.route.length <= 1) {
      this.state.playing = false;
      this.emitState();
      return this.getMetrics();
    }

    const currentPoint = this.getCurrentPoint();
    const nextPoint = this.route[this.state.currentIndex + 1];
    const gradePercent = typeof currentPoint?.gradient === "number"
      ? currentPoint.gradient
      : currentPoint
        ? calculateGradePercent({ currentPoint, nextPoint })
        : 0;
    const resolvedPower = this.resolvePower(userPower);
    const targetSpeedMs = resolvedPower.power > 0
      ? estimateSpeedFromPower(resolvedPower.power, gradePercent, this.riderProfile)
      : this.state.speed / 3.6;
    const effectiveSpeedMs = Math.min(targetSpeedMs, getMaxSafeSpeedKmh() / 3.6);
    const effectiveSpeedKmh = effectiveSpeedMs * 3.6;

    this.activePowerSource = resolvedPower.source;
    this.state.speed = resolvedPower.power > 0 ? effectiveSpeedKmh : this.state.speed;
    this.metrics.speed = resolvedPower.power > 0 ? effectiveSpeedKmh : this.state.speed;
    this.metrics.power = resolvedPower.power;

    this.state.elapsedTime += deltaTime * this.state.speed;

    this.indexStepAccumulator += deltaTime * this.state.speed;

    const indexSteps = Math.floor(this.indexStepAccumulator);

    if (indexSteps > 0) {
      this.indexStepAccumulator -= indexSteps;

      this.state.currentIndex = Math.min(
        this.state.currentIndex + indexSteps,
        this.route.length - 1
      );

      this.refreshMetrics();

      if (this.state.currentIndex >= this.route.length - 1) {
        this.state.playing = false;
      }
    }

    this.appendActivityPoint();

    this.emitState();
    this.emitMetrics();

    return this.getMetrics();
  }

  getMetrics(): RideMetrics {
    return {
      ...this.metrics,
    };
  }

  reset(): void {
    this.metrics = {
      ...DEFAULT_METRICS,
    };

    this.state.playing = DEFAULT_STATE.playing;
    this.state.elapsedTime = DEFAULT_STATE.elapsedTime;
    this.state.currentIndex = DEFAULT_STATE.currentIndex;
    this.indexStepAccumulator = 0;
    this.activePowerSource = "none";
    this.lastActivityPointTimestampMs = 0;
    this.resetVirtualActivityProgress();
    this.resetComparisonState();

    this.refreshMetrics();

    this.emitMetrics();
    this.emitState();
  }

  /**
   * Get the average speed in km/h
   */
  getAverageSpeed(): number {
    return calculateAverageSpeed(this.metrics.distance ?? 0, this.state.elapsedTime);
  }

  /**
   * Get the maximum speed recorded so far in km/h
   * For now, returns current speed as we don't track history
   */
  getMaxSpeed(): number {
    return this.metrics.speed ?? 0;
  }

  /**
   * Get the remaining distance in meters
   */
  getRemainingDistance(): number {
    return calculateRemainingDistance(this.route, this.metrics.distance ?? 0);
  }

  /**
   * Get the remaining elevation gain in meters
   */
  getRemainingElevation(): number {
    return calculateRemainingElevation(this.route, this.state.currentIndex);
  }

  /**
   * Get the remaining time in seconds
   * Returns Infinity if speed is zero
   */
  getRemainingTime(): number {
    const remainingDistanceM = this.getRemainingDistance();
    return calculateRemainingTimeSeconds(this.metrics.speed ?? 0, remainingDistanceM);
  }

  /**
   * Get the estimated arrival time
   */
  getEstimatedArrival(): Date {
    const remainingSeconds = this.getRemainingTime();
    return calculateEstimatedArrivalDate(remainingSeconds);
  }

  private refreshMetrics(): void {
    const point = this.getCurrentPoint();

    if (!point) {
      this.metrics.distance = 0;
      this.metrics.elevation = 0;
      this.syncVirtualActivityCurrentState();
      this.comparison = {
        speed: {},
        power: {},
        cadence: {},
      };
      return;
    }

    this.metrics.distance = point.distance ?? 0;
    this.metrics.elevation = point.elevation ?? 0;
    this.syncVirtualActivityCurrentState();

    const recordedSpeed = normalizeOptionalMetric(point.fitMetrics?.speed ?? point.speed);
    const recordedPower = normalizeOptionalMetric(point.fitMetrics?.power ?? point.power);
    const recordedCadence = normalizeOptionalMetric(point.fitMetrics?.cadence ?? point.cadence);

    this.comparison = {
      speed: buildComparisonPair(this.metrics.speed, recordedSpeed !== undefined ? recordedSpeed * 3.6 : undefined),
      power: buildComparisonPair(this.metrics.power, recordedPower),
      cadence: buildComparisonPair(this.metrics.cadence, recordedCadence),
    };

    const speedError = this.comparison.speed.percentageDifference;
    if (typeof speedError === "number" && Number.isFinite(speedError)) {
      this.comparisonAccumulator.count += 1;
      this.comparisonAccumulator.sumPercent += speedError;
      this.comparisonAccumulator.maxPercent = Math.max(this.comparisonAccumulator.maxPercent, speedError);
    }
  }

  private createVirtualActivity(route: GPXPoint[]): VirtualActivity {
    const nowIso = new Date().toISOString();
    const elevation = this.calculateRouteElevation(route);

    return {
      metadata: {
        id: `virtual-activity-${Date.now()}`,
        name: this.config.track.name || "Virtual Activity",
        createdAt: nowIso,
        routeSource: this.detectRouteSource(route),
      },
      parameters: {
        riderProfile: { ...this.riderProfile },
        bikeProfile: { ...this.config.bikeProfile },
        powerStrategy: this.powerMode,
      },
      route: {
        originalRoute: [...route],
        totalDistance: route[route.length - 1]?.distance ?? 0,
        elevationGain: elevation.gain,
        elevationLoss: elevation.loss,
      },
      currentState: {
        elapsedTime: 0,
        traveledDistance: 0,
        currentPosition: this.buildCurrentPosition(route[0] ?? null),
        currentSpeed: 0,
        currentPower: 0,
        currentGradient: route[0]?.gradient ?? 0,
      },
      points: [],
    };
  }

  private detectRouteSource(route: GPXPoint[]): ActivityRouteSource {
    const hasFitFields = route.some((point) => {
      return (
        point.fitMetrics !== undefined ||
        typeof point.speed === "number" ||
        typeof point.power === "number" ||
        typeof point.cadence === "number" ||
        typeof point.heartRate === "number"
      );
    });

    return hasFitFields ? "fit" : "gpx";
  }

  private calculateRouteElevation(route: GPXPoint[]): { gain: number; loss: number } {
    if (route.length <= 1) {
      return { gain: 0, loss: 0 };
    }

    let gain = 0;
    let loss = 0;

    for (let i = 0; i < route.length - 1; i++) {
      const current = route[i].elevation ?? 0;
      const next = route[i + 1].elevation ?? 0;
      const delta = next - current;

      if (delta > 0) {
        gain += delta;
      } else if (delta < 0) {
        loss += Math.abs(delta);
      }
    }

    return { gain, loss };
  }

  private buildCurrentPosition(point: GPXPoint | null): VirtualActivityCurrentPosition | null {
    if (!point) {
      return null;
    }

    return {
      lat: point.lat,
      lon: point.lon,
      altitude: point.elevation ?? 0,
      distance: point.distance ?? 0,
    };
  }

  private syncVirtualActivityCurrentState(): void {
    if (!this.virtualActivity) {
      return;
    }

    const point = this.getCurrentPoint();
    this.virtualActivity.currentState = {
      elapsedTime: this.state.elapsedTime,
      traveledDistance: this.metrics.distance,
      currentPosition: this.buildCurrentPosition(point),
      currentSpeed: this.metrics.speed,
      currentPower: this.metrics.power,
      currentGradient: point?.gradient ?? 0,
    };
  }

  private appendActivityPoint(): void {
    if (!this.virtualActivity) {
      return;
    }

    const point = this.getCurrentPoint();
    if (!point) {
      return;
    }

    const createdAtMs = Date.parse(this.virtualActivity.metadata.createdAt);
    const rawTimestampMs = Number.isFinite(createdAtMs)
      ? createdAtMs + this.state.elapsedTime * 1000
      : Date.now();
    const timestampMs = Math.max(rawTimestampMs, this.lastActivityPointTimestampMs + 1);
    this.lastActivityPointTimestampMs = timestampMs;

    const activityPoint: ActivityPoint = {
      timestamp: new Date(timestampMs).toISOString(),
      latitude: point.lat,
      longitude: point.lon,
      altitude: point.elevation ?? 0,
      speed: this.metrics.speed,
      power: this.metrics.power,
      gradient: point.gradient ?? 0,
      cumulativeDistance: this.metrics.distance,
      cadence: normalizeOptionalMetric(point.fitMetrics?.cadence ?? point.cadence),
      heartRate: normalizeOptionalMetric(point.fitMetrics?.heartRate ?? point.heartRate),
    };

    this.virtualActivity.points.push(activityPoint);
  }

  private resetVirtualActivityProgress(): void {
    if (!this.virtualActivity) {
      return;
    }

    this.virtualActivity.points = [];
    this.syncVirtualActivityCurrentState();
  }

  private resetComparisonState(): void {
    this.comparison = {
      speed: {},
      power: {},
      cadence: {},
    };
    this.comparisonAccumulator = {
      count: 0,
      sumPercent: 0,
      maxPercent: 0,
    };
  }

}

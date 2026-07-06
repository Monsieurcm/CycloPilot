import { RideMetrics, SimulationConfig, GPXPoint } from "@cyclopilot/shared";
import {
  createDefaultPhysicsProfile,
  calculateGradePercent,
  getMaxSafeSpeedKmh,
  estimateSpeedFromPower,
  type PhysicsProfile,
} from "./physics";

interface SimulationState {
  playing: boolean;
  speed: number;
  elapsedTime: number;
  currentIndex: number;
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

function clampSimulationSpeed(speed: number): number {
  return Math.min(8, Math.max(0.5, speed));
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
  private readonly physicsProfile: PhysicsProfile;

  private route: GPXPoint[] = [];

  private metrics: RideMetrics = { ...DEFAULT_METRICS };

  private state: SimulationState = { ...DEFAULT_STATE };

  private indexStepAccumulator = 0;

  private readonly metricsListeners = new Set<MetricsListener>();
  private readonly stateListeners = new Set<StateListener>();

  constructor(config: SimulationConfig) {
    this.config = config;
    this.physicsProfile = createDefaultPhysicsProfile(config);
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
    this.state.currentIndex = DEFAULT_STATE.currentIndex;
    this.state.elapsedTime = DEFAULT_STATE.elapsedTime;
    this.indexStepAccumulator = 0;

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
    const targetSpeedMs = userPower > 0
      ? estimateSpeedFromPower(userPower, gradePercent, this.physicsProfile)
      : this.state.speed / 3.6;
    const effectiveSpeedMs = Math.min(targetSpeedMs, getMaxSafeSpeedKmh() / 3.6);
    const effectiveSpeedKmh = effectiveSpeedMs * 3.6;

    this.state.speed = userPower > 0 ? effectiveSpeedKmh : this.state.speed;
    this.metrics.speed = userPower > 0 ? effectiveSpeedKmh : this.state.speed;
    this.metrics.power = userPower > 0 ? userPower : 0;

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
      return;
    }

    this.metrics.distance = point.distance ?? 0;
    this.metrics.elevation = point.elevation ?? 0;
  }

}

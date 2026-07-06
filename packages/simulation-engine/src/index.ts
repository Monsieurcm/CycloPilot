import { RideMetrics, SimulationConfig, GPXPoint } from "@cyclopilot/shared";

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

export class SimulationEngine {
  private readonly config: SimulationConfig;

  private route: GPXPoint[] = [];

  private metrics: RideMetrics = { ...DEFAULT_METRICS };

  private state: SimulationState = { ...DEFAULT_STATE };

  private indexStepAccumulator = 0;

  private readonly metricsListeners = new Set<MetricsListener>();
  private readonly stateListeners = new Set<StateListener>();

  constructor(config: SimulationConfig) {
    this.config = config;
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
    this.state.speed = Math.min(8, Math.max(0.5, speed));
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
    if (this.route.length <= 1) {
      return 0;
    }

    return this.state.currentIndex / (this.route.length - 1);
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

  step(deltaTime: number, _userPower: number): RideMetrics {
    if (!this.state.playing) {
      return this.getMetrics();
    }

    if (this.route.length <= 1) {
      this.state.playing = false;
      this.emitState();
      return this.getMetrics();
    }

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
    if (this.state.elapsedTime <= 0) {
      return 0;
    }

    // Distance in meters, time in seconds → convert to km/h
    const distanceKm = (this.metrics.distance ?? 0) / 1000;
    const timeHours = this.state.elapsedTime / 3600;

    return timeHours > 0 ? distanceKm / timeHours : 0;
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
    if (this.route.length === 0) {
      return 0;
    }

    const lastPoint = this.route[this.route.length - 1];
    const totalDistance = lastPoint?.distance ?? 0;
    const currentDistance = this.metrics.distance ?? 0;

    return Math.max(0, totalDistance - currentDistance);
  }

  /**
   * Get the remaining elevation gain in meters
   */
  getRemainingElevation(): number {
    if (this.route.length === 0 || this.state.currentIndex >= this.route.length) {
      return 0;
    }

    const currentPoint = this.getCurrentPoint();
    const lastPoint = this.route[this.route.length - 1];

    if (!currentPoint || !lastPoint) {
      return 0;
    }

    // Calculate elevation gain from current point to end
    let elevationGain = 0;
    for (let i = this.state.currentIndex; i < this.route.length - 1; i++) {
      const nextElevation = this.route[i + 1].elevation ?? 0;
      const currentElevation = this.route[i].elevation ?? 0;
      const gain = nextElevation - currentElevation;

      if (gain > 0) {
        elevationGain += gain;
      }
    }

    return Math.max(0, elevationGain);
  }

  /**
   * Get the remaining time in seconds
   * Returns Infinity if speed is zero
   */
  getRemainingTime(): number {
    if (this.metrics.speed <= 0) {
      return Infinity;
    }

    const remainingDistanceM = this.getRemainingDistance();
    const currentSpeedMs = (this.metrics.speed ?? 0) / 3.6; // km/h → m/s

    if (currentSpeedMs <= 0) {
      return Infinity;
    }

    return remainingDistanceM / currentSpeedMs;
  }

  /**
   * Get the estimated arrival time
   */
  getEstimatedArrival(): Date {
    const remainingSeconds = this.getRemainingTime();

    if (!isFinite(remainingSeconds)) {
      return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
    }

    return new Date(Date.now() + remainingSeconds * 1000);
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

import { RideMetrics, SimulationConfig, GPXPoint } from "@cyclopilot/shared";

interface SimulationState {
  playing: boolean;
  speed: number;
  elapsedTime: number;
  currentIndex: number;
}

type MetricsListener = (metrics: RideMetrics) => void;
type StateListener = (state: Readonly<SimulationState>) => void;

export class SimulationEngine {
  private readonly config: SimulationConfig;

  private route: GPXPoint[] = [];

  private metrics: RideMetrics = {
    speed: 0,
    cadence: 0,
    power: 0,
    distance: 0,
    elevation: 0,
  };

  private state: SimulationState = {
    playing: false,
    speed: 1,
    elapsedTime: 0,
    currentIndex: 0,
  };

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

    this.metricsListeners.forEach(listener => listener(metrics));
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
    this.state.currentIndex = 0;
    this.state.elapsedTime = 0;

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
    this.state.playing = false;
    this.state.elapsedTime = 0;
    this.state.currentIndex = 0;

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

  seek(index: number): void {
    if (this.route.length === 0) {
      return;
    }

    this.state.currentIndex = Math.max(
      0,
      Math.min(index, this.route.length - 1)
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

    this.state.elapsedTime += deltaTime * this.state.speed;

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
      speed: 0,
      cadence: 0,
      power: 0,
      distance: 0,
      elevation: 0,
    };

    this.state.playing = false;
    this.state.elapsedTime = 0;
    this.state.currentIndex = 0;

    this.emitMetrics();
    this.emitState();
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

  private calculateDifficultyFactor(
    _point: GPXPoint,
    _nextPoint: GPXPoint
  ): number {
    return 1.0;
  }
}

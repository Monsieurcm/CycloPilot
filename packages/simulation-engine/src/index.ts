import { RideMetrics, SimulationConfig, GPXPoint } from "@cyclopilot/shared";

export class SimulationEngine {
  private config: SimulationConfig;
  private metrics: RideMetrics = {
    speed: 0,
    cadence: 0,
    power: 0,
    distance: 0,
    elevation: 0,
  };

  constructor(config: SimulationConfig) {
    this.config = config;
  }

  /**
   * Simulate one timestep of cycling
   */
  step(_deltaTime: number, _userPower: number): RideMetrics {
    // TODO: Implement physics simulation
    // - Calculate resistance based on elevation, bike profile, difficulty
    // - Update speed, cadence, power output
    // - Track distance and elevation changes
    return this.metrics;
  }

  /**
   * Get current metrics
   */
  getMetrics(): RideMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset simulation
   */
  reset(): void {
    this.metrics = {
      speed: 0,
      cadence: 0,
      power: 0,
      distance: 0,
      elevation: 0,
    };
  }

  /**
   * Calculate difficulty factor based on slope and bike profile
   */
  private calculateDifficultyFactor(_point: GPXPoint, _nextPoint: GPXPoint): number {
    // TODO: Implement calculation
    return 1.0;
  }
}

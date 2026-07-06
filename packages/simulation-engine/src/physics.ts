import type { GPXPoint, SimulationConfig } from "@cyclopilot/shared";

export interface PhysicsProfile {
  riderMassKg: number;
  bikeMassKg: number;
  frontalAreaM2: number;
  dragCoefficient: number;
  rollingResistanceCoefficient: number;
  drivetrainEfficiency: number;
  airDensityKgM3: number;
  gravityMs2: number;
}

export interface PhysicsRouteSample {
  currentPoint: GPXPoint;
  nextPoint?: GPXPoint;
}

export interface PhysicsPowerContext {
  speedMs: number;
  gradePercent: number;
  profile: PhysicsProfile;
}

const DEFAULT_PROFILE: PhysicsProfile = {
  riderMassKg: 75,
  bikeMassKg: 8,
  frontalAreaM2: 0.33,
  dragCoefficient: 0.88,
  rollingResistanceCoefficient: 0.004,
  drivetrainEfficiency: 0.97,
  airDensityKgM3: 1.225,
  gravityMs2: 9.80665,
};

export function createDefaultPhysicsProfile(
  config: SimulationConfig,
): PhysicsProfile {
  return {
    ...DEFAULT_PROFILE,
    bikeMassKg: DEFAULT_PROFILE.bikeMassKg * config.bikeProfile.multiplier,
    rollingResistanceCoefficient:
      DEFAULT_PROFILE.rollingResistanceCoefficient * config.difficulty.resistanceMultiplier,
  };
}

export function calculateGradePercent(sample: PhysicsRouteSample): number {
  if (!sample.nextPoint) {
    return 0;
  }

  const distanceDelta = (sample.nextPoint.distance ?? 0) - (sample.currentPoint.distance ?? 0);

  if (distanceDelta <= 0) {
    return 0;
  }

  const elevationDelta = (sample.nextPoint.elevation ?? 0) - (sample.currentPoint.elevation ?? 0);
  return (elevationDelta / distanceDelta) * 100;
}

export function calculateAirResistance(
  speedMs: number,
  profile: PhysicsProfile,
): number {
  return (
    0.5 *
    profile.airDensityKgM3 *
    profile.dragCoefficient *
    profile.frontalAreaM2 *
    speedMs *
    speedMs
  );
}

export function calculateRollingResistance(
  profile: PhysicsProfile,
): number {
  return (
    (profile.riderMassKg + profile.bikeMassKg) *
    profile.gravityMs2 *
    profile.rollingResistanceCoefficient
  );
}

export function calculateGravityResistance(
  gradePercent: number,
  profile: PhysicsProfile,
): number {
  const slope = gradePercent / 100;
  return (
    (profile.riderMassKg + profile.bikeMassKg) *
    profile.gravityMs2 *
    Math.sin(Math.atan(slope))
  );
}

export function calculatePowerDemand(context: PhysicsPowerContext): number {
  const rollingResistance = calculateRollingResistance(context.profile);
  const gravityResistance = calculateGravityResistance(context.gradePercent, context.profile);
  const airResistance = calculateAirResistance(context.speedMs, context.profile);
  const totalForce = rollingResistance + gravityResistance + airResistance;
  const power = (totalForce * context.speedMs) / context.profile.drivetrainEfficiency;

  return Math.max(0, power);
}

export function estimateSpeedFromPower(
  powerWatts: number,
  gradePercent: number,
  profile: PhysicsProfile,
): number {
  if (powerWatts <= 0) {
    return 0;
  }

  let low = 0;
  let high = 30;

  for (let i = 0; i < 40; i++) {
    const mid = (low + high) / 2;
    const demand = calculatePowerDemand({
      speedMs: mid,
      gradePercent,
      profile,
    });

    if (demand > powerWatts) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return (low + high) / 2;
}

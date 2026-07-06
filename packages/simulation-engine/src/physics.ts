import type { GPXPoint, SimulationConfig } from "@cyclopilot/shared";

export interface RiderPhysicsProfile {
  riderWeightKg: number;
  bikeWeightKg: number;
  crr: number;
  cda: number;
  frontalAreaM2: number;
  airDensityKgM3: number;
  gravityMs2: number;
  drivetrainEfficiency: number;
}

export interface RiderPhysicsProfileOverrides {
  riderWeightKg?: number;
  bikeWeightKg?: number;
  crr?: number;
  cda?: number;
  frontalAreaM2?: number;
  airDensityKgM3?: number;
}

export type PhysicsProfile = RiderPhysicsProfile;

export interface PhysicsRouteSample {
  currentPoint: GPXPoint;
  nextPoint?: GPXPoint;
}

export interface PhysicsPowerContext {
  speedMs: number;
  gradePercent: number;
  profile: PhysicsProfile;
}

const MAX_SAFE_SPEED_KMH = 70;
const MAX_SAFE_SPEED_MS = MAX_SAFE_SPEED_KMH / 3.6;

export const DEFAULT_RIDER_PHYSICS_PROFILE: RiderPhysicsProfile = {
  riderWeightKg: 75,
  bikeWeightKg: 8,
  crr: 0.004,
  cda: 0.29,
  frontalAreaM2: 0.33,
  airDensityKgM3: 1.225,
  gravityMs2: 9.80665,
  drivetrainEfficiency: 0.97,
};

function clampProfile(profile: RiderPhysicsProfile): RiderPhysicsProfile {
  return {
    ...profile,
    riderWeightKg: Math.max(35, profile.riderWeightKg),
    bikeWeightKg: Math.max(4, profile.bikeWeightKg),
    crr: Math.max(0.001, profile.crr),
    cda: Math.max(0.1, profile.cda),
    frontalAreaM2: Math.max(0.1, profile.frontalAreaM2),
    airDensityKgM3: Math.max(0.7, profile.airDensityKgM3),
  };
}

export function buildRiderPhysicsProfile(
  config: SimulationConfig,
  overrides: RiderPhysicsProfileOverrides = {},
): RiderPhysicsProfile {
  const profile: RiderPhysicsProfile = {
    ...DEFAULT_RIDER_PHYSICS_PROFILE,
    bikeWeightKg:
      DEFAULT_RIDER_PHYSICS_PROFILE.bikeWeightKg * config.bikeProfile.multiplier,
    crr:
      DEFAULT_RIDER_PHYSICS_PROFILE.crr * config.difficulty.resistanceMultiplier,
    ...overrides,
  };

  return clampProfile(profile);
}

export function applyRiderPhysicsOverrides(
  profile: RiderPhysicsProfile,
  overrides: RiderPhysicsProfileOverrides,
): RiderPhysicsProfile {
  return clampProfile({
    ...profile,
    ...overrides,
  });
}

export function createDefaultPhysicsProfile(
  config: SimulationConfig,
): PhysicsProfile {
  return buildRiderPhysicsProfile(config);
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
  return 0.5 * profile.airDensityKgM3 * profile.cda * speedMs * speedMs;
}

export function calculateRollingResistance(
  profile: PhysicsProfile,
): number {
  return (
    (profile.riderWeightKg + profile.bikeWeightKg) *
    profile.gravityMs2 *
    profile.crr
  );
}

export function calculateGravityResistance(
  gradePercent: number,
  profile: PhysicsProfile,
): number {
  const slope = gradePercent / 100;
  return (
    (profile.riderWeightKg + profile.bikeWeightKg) *
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
  let high = MAX_SAFE_SPEED_MS;

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

export function getMaxSafeSpeedKmh(): number {
  return MAX_SAFE_SPEED_KMH;
}

// Types partagés pour CycloPilot

export interface HealthResponse {
  status: string;
  app: string;
  version: string;
}

export interface RideMetrics {
  speed: number;
  cadence: number;
  power: number;
  distance: number;
  elevation: number;
}

export interface StreetLocation {
  label: string;
  coords: [number, number];
  description: string;
}

export interface BikeProfile {
  id: string;
  name: string;
  description: string;
  multiplier: number;
}

export interface DifficultyLevel {
  id: string;
  name: string;
  description: string;
  resistanceMultiplier: number;
}

export interface GPXPoint {
  lat: number;
  lon: number;
  elevation: number;
  timestamp?: string;
  distance?: number; // Distance from start (meters)
  gradient?: number; // Segment gradient in percentage
  fitMetrics?: RecordedFitMetrics; // Optional FIT-native metrics bundle
  cadence?: number; // Recorded cadence in rpm when available (FIT)
  heartRate?: number; // Recorded heart rate in bpm when available (FIT)
  temperature?: number; // Recorded ambient temperature in celsius when available (FIT)
  power?: number; // Recorded power in watts when available (FIT)
  speed?: number; // Recorded speed in m/s when available (FIT)
}

export interface RecordedFitMetrics {
  speed?: number; // Recorded speed in m/s when available (FIT)
  cadence?: number; // Recorded cadence in rpm when available (FIT)
  heartRate?: number; // Recorded heart rate in bpm when available (FIT)
  power?: number; // Recorded power in watts when available (FIT)
}

export interface GPXSegment {
  points: GPXPoint[];
}

export interface GPXTrack {
  id: string;
  name: string;
  description?: string;
  distance: number; // Total distance in meters
  elevation: {
    gain: number; // Positive elevation gain
    loss: number; // Positive elevation loss
    min: number;
    max: number;
  };
  points: GPXPoint[];
  segments?: GPXSegment[];
  bounds?: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
  stats?: {
    duration?: number; // Seconds
    avgSpeed?: number; // m/s
    maxSpeed?: number; // m/s
    avgGrade?: number; // Percentage
  };
}

export interface SimulationConfig {
  bikeProfile: BikeProfile;
  difficulty: DifficultyLevel;
  track: GPXTrack;
}

export type ActivityRouteSource = "gpx" | "fit";

export interface VirtualActivityMetadata {
  id: string;
  name: string;
  createdAt: string;
  routeSource: ActivityRouteSource;
}

export interface VirtualActivityRiderProfile {
  riderWeightKg?: number;
  bikeWeightKg?: number;
  crr?: number;
  cda?: number;
  frontalAreaM2?: number;
  airDensityKgM3?: number;
  gravityMs2?: number;
  drivetrainEfficiency?: number;
}

export interface VirtualActivityParameters {
  riderProfile: VirtualActivityRiderProfile;
  bikeProfile: BikeProfile;
  powerStrategy: string;
}

export interface VirtualActivityRoute {
  originalRoute: GPXPoint[];
  totalDistance: number;
  elevationGain: number;
  elevationLoss: number;
}

export interface VirtualActivityCurrentPosition {
  lat: number;
  lon: number;
  altitude: number;
  distance: number;
}

export interface VirtualActivityCurrentState {
  elapsedTime: number;
  traveledDistance: number;
  currentPosition: VirtualActivityCurrentPosition | null;
  currentSpeed: number;
  currentPower: number;
  currentGradient: number;
}

export interface ActivityPoint {
  timestamp: string;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  power: number;
  gradient: number;
  cumulativeDistance: number;
  cadence?: number;
  heartRate?: number;
}

export interface VirtualActivity {
  metadata: VirtualActivityMetadata;
  parameters: VirtualActivityParameters;
  route: VirtualActivityRoute;
  currentState: VirtualActivityCurrentState;
  points: ActivityPoint[];
}

export interface FITRecord {
  timestamp: number;
  recordType: string;
  data: Record<string, unknown>;
}

export interface FITMetadata {
  dataType: string;
  validFieldBits: number;
  localMessageType: number;
}

export { applyRouteGradients } from "./routeGradient.js";

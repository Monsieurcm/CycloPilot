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

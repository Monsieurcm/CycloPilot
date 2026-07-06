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
export interface GPXTrack {
    id: string;
    name: string;
    distance: number;
    elevation: number;
    points: GPXPoint[];
}
export interface GPXPoint {
    lat: number;
    lon: number;
    elevation: number;
    timestamp?: string;
}
export interface SimulationConfig {
    bikeProfile: BikeProfile;
    difficulty: DifficultyLevel;
    track: GPXTrack;
}

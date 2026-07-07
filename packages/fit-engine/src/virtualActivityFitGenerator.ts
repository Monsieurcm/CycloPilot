import type { ActivityPoint, VirtualActivity } from "@cyclopilot/shared";

const FIT_SEMICIRCLE_FACTOR = 2147483648 / 180;

function toFitTimestamp(value: string): number {
  return Math.floor(new Date(value).getTime() / 1000) - 631065600;
}

function toSemicircles(coordinate: number): number {
  return Math.round(coordinate * FIT_SEMICIRCLE_FACTOR);
}

function toFitAltitude(altitudeMeters: number): number {
  return Math.round((altitudeMeters + 500) * 5);
}

function toFitDistance(distanceMeters: number): number {
  return Math.max(0, Math.round(distanceMeters * 100));
}

function toFitSpeed(speedKmh: number): number {
  const speedMs = speedKmh / 3.6;
  return Math.max(0, Math.round(speedMs * 1000));
}

function toFitGrade(gradePercent: number): number {
  return Math.round(gradePercent * 100);
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function max(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return Math.max(...values);
}

function getStartPoint(activity: VirtualActivity): ActivityPoint | null {
  return activity.points[0] ?? null;
}

function getEndPoint(activity: VirtualActivity): ActivityPoint | null {
  return activity.points[activity.points.length - 1] ?? null;
}

export interface FitFileIdMessage {
  type: number;
  manufacturer: number;
  product: number;
  serialNumber: number;
  timeCreated: number;
  number: number;
}

export interface FitDeviceInfoMessage {
  timestamp: number;
  deviceIndex: number;
  manufacturer: number;
  product: number;
  serialNumber: number;
  softwareVersion: number;
}

export interface FitEventMessage {
  timestamp: number;
  event: number;
  eventType: number;
  eventGroup: number;
}

export interface FitLapMessage {
  timestamp: number;
  startTime: number;
  startPositionLat: number;
  startPositionLong: number;
  endPositionLat: number;
  endPositionLong: number;
  totalElapsedTime: number;
  totalTimerTime: number;
  totalDistance: number;
  totalAscent: number;
  totalDescent: number;
  avgSpeed: number;
  maxSpeed: number;
  avgPower: number;
  maxPower: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  avgCadence?: number;
  maxCadence?: number;
}

export interface FitSessionMessage extends FitLapMessage {
  sport: number;
  subSport: number;
  numLaps: number;
}

export interface FitRecordMessage {
  timestamp: number;
  positionLat: number;
  positionLong: number;
  altitude: number;
  distance: number;
  speed: number;
  power: number;
  grade: number;
  heartRate?: number;
  cadence?: number;
}

export interface FitActivityStructure {
  fileId: FitFileIdMessage;
  deviceInfo: FitDeviceInfoMessage;
  startEvent: FitEventMessage;
  stopEvent: FitEventMessage;
  lap: FitLapMessage;
  session: FitSessionMessage;
  records: FitRecordMessage[];
}

export interface FitGeneratorOptions {
  manufacturer: number;
  product: number;
  serialNumber?: number;
  fileNumber?: number;
  softwareVersion?: number;
  fileType: number;
  sport: number;
  subSport: number;
  timerEvent: number;
  eventTypeStart: number;
  eventTypeStopAll: number;
}

export function buildFitActivityStructure(
  activity: VirtualActivity,
  options: FitGeneratorOptions,
): FitActivityStructure {
  const startPoint = getStartPoint(activity);
  const endPoint = getEndPoint(activity);

  const createdTime = toFitTimestamp(activity.metadata.createdAt);
  const startTime = startPoint ? toFitTimestamp(startPoint.timestamp) : createdTime;
  const endTime = endPoint ? toFitTimestamp(endPoint.timestamp) : startTime;

  const totalElapsedMs = Math.max(0, Math.round(activity.currentState.elapsedTime * 1000));
  const totalDistance = toFitDistance(activity.currentState.traveledDistance);

  const heartRates = activity.points
    .map((point) => point.heartRate)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const cadences = activity.points
    .map((point) => point.cadence)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const powers = activity.points.map((point) => point.power);
  const speeds = activity.points.map((point) => point.speed);

  const records: FitRecordMessage[] = activity.points.map((point) => ({
    timestamp: toFitTimestamp(point.timestamp),
    positionLat: toSemicircles(point.latitude),
    positionLong: toSemicircles(point.longitude),
    altitude: toFitAltitude(point.altitude),
    distance: toFitDistance(point.cumulativeDistance),
    speed: toFitSpeed(point.speed),
    power: Math.max(0, Math.round(point.power)),
    grade: toFitGrade(point.gradient),
    heartRate: typeof point.heartRate === "number" ? Math.round(point.heartRate) : undefined,
    cadence: typeof point.cadence === "number" ? Math.round(point.cadence) : undefined,
  }));

  const fileId: FitFileIdMessage = {
    type: options.fileType,
    manufacturer: options.manufacturer,
    product: options.product,
    serialNumber: options.serialNumber ?? 0,
    timeCreated: createdTime,
    number: options.fileNumber ?? createdTime,
  };

  const deviceInfo: FitDeviceInfoMessage = {
    timestamp: startTime,
    deviceIndex: 0,
    manufacturer: options.manufacturer,
    product: options.product,
    serialNumber: options.serialNumber ?? 0,
    softwareVersion: options.softwareVersion ?? 100,
  };

  const startEvent: FitEventMessage = {
    timestamp: startTime,
    event: options.timerEvent,
    eventType: options.eventTypeStart,
    eventGroup: 0,
  };

  const stopEvent: FitEventMessage = {
    timestamp: endTime,
    event: options.timerEvent,
    eventType: options.eventTypeStopAll,
    eventGroup: 0,
  };

  const lapBase: FitLapMessage = {
    timestamp: endTime,
    startTime,
    startPositionLat: startPoint ? toSemicircles(startPoint.latitude) : 0,
    startPositionLong: startPoint ? toSemicircles(startPoint.longitude) : 0,
    endPositionLat: endPoint ? toSemicircles(endPoint.latitude) : 0,
    endPositionLong: endPoint ? toSemicircles(endPoint.longitude) : 0,
    totalElapsedTime: totalElapsedMs,
    totalTimerTime: totalElapsedMs,
    totalDistance,
    totalAscent: Math.max(0, Math.round(activity.route.elevationGain)),
    totalDescent: Math.max(0, Math.round(activity.route.elevationLoss)),
    avgSpeed: toFitSpeed(average(speeds)),
    maxSpeed: toFitSpeed(max(speeds)),
    avgPower: Math.max(0, Math.round(average(powers))),
    maxPower: Math.max(0, Math.round(max(powers))),
    avgHeartRate: heartRates.length > 0 ? Math.round(average(heartRates)) : undefined,
    maxHeartRate: heartRates.length > 0 ? Math.round(max(heartRates)) : undefined,
    avgCadence: cadences.length > 0 ? Math.round(average(cadences)) : undefined,
    maxCadence: cadences.length > 0 ? Math.round(max(cadences)) : undefined,
  };

  const session: FitSessionMessage = {
    ...lapBase,
    sport: options.sport,
    subSport: options.subSport,
    numLaps: 1,
  };

  return {
    fileId,
    deviceInfo,
    startEvent,
    stopEvent,
    lap: lapBase,
    session,
    records,
  };
}
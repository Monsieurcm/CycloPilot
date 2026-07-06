import { applyRouteGradients, type GPXPoint } from "@cyclopilot/shared";
import { fit2json, parseRecords } from "fit-decoder";

interface ParsedFITRecord {
  type?: string;
  data?: Record<string, unknown>;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function toTimestampString(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const numeric = toFiniteNumber(value);
  if (numeric === null) {
    return undefined;
  }

  return new Date(numeric).toISOString();
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const earthRadius = 6371000;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

function semicirclesToDegrees(value: number): number {
  return value * (180 / 2147483648);
}

function normalizeCoordinate(value: number): number {
  if (Math.abs(value) <= 180) {
    return value;
  }
  return semicirclesToDegrees(value);
}

function getDataField(data: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (key in data) {
      return data[key];
    }
  }
  return undefined;
}

export function parseFITRoute(input: ArrayBuffer | Uint8Array): GPXPoint[] {
  const arrayBuffer = input instanceof ArrayBuffer
    ? input
    : Uint8Array.from(input).buffer;

  let parsed: unknown;
  try {
    const raw = fit2json(arrayBuffer);
    parsed = parseRecords(raw);
  } catch {
    throw new Error("Invalid FIT file: parsing failed");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Invalid FIT file: unreadable record structure");
  }

  const fitRecords = parsed as ParsedFITRecord[];
  const route: GPXPoint[] = [];
  let cumulativeDistance = 0;

  for (const record of fitRecords) {
    if (record.type !== "record" || !record.data) {
      continue;
    }

    const latRaw = toFiniteNumber(getDataField(record.data, ["position_lat", "lat", "latitude"]));
    const lonRaw = toFiniteNumber(getDataField(record.data, ["position_long", "lon", "longitude"]));

    if (latRaw === null || lonRaw === null) {
      continue;
    }

    const lat = normalizeCoordinate(latRaw);
    const lon = normalizeCoordinate(lonRaw);

    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      continue;
    }

    const elevationRaw = toFiniteNumber(
      getDataField(record.data, ["enhanced_altitude", "altitude", "ele", "elevation"]),
    );
    const powerRaw = toFiniteNumber(getDataField(record.data, ["enhanced_power", "power"]));
    const timestamp = toTimestampString(getDataField(record.data, ["timestamp", "time"]));

    const deviceDistance = toFiniteNumber(getDataField(record.data, ["distance"]));

    if (deviceDistance !== null && deviceDistance >= 0) {
      cumulativeDistance = deviceDistance;
    } else if (route.length > 0) {
      const previous = route[route.length - 1];
      cumulativeDistance += haversineDistance(previous.lat, previous.lon, lat, lon);
    }

    route.push({
      lat,
      lon,
      elevation: elevationRaw ?? 0,
      distance: Math.round(cumulativeDistance),
      timestamp,
      power: powerRaw !== null && powerRaw >= 0 ? Math.round(powerRaw) : undefined,
    });
  }

  if (route.length === 0) {
    throw new Error("No GPS positions found in FIT file");
  }

  return applyRouteGradients(route);
}

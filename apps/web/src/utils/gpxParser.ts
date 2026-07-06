import type { GPXPoint } from "@cyclopilot/shared";
import type { RouteParser } from "./routeParser";

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Unable to read GPX file content"));
        return;
      }
      resolve(result);
    };

    reader.onerror = () => {
      reject(new Error("Unable to read GPX file"));
    };

    reader.onabort = () => {
      reject(new Error("GPX file reading was aborted"));
    };

    reader.readAsText(file);
  });
}

/**
 * Calculate the haversine distance in meters between two geographic points
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Parse a GPX file and extract track points
 */
export class GPXRouteParser implements RouteParser {
  canParse(file: File): boolean {
    return file.name.toLowerCase().endsWith(".gpx");
  }

  async parse(file: File): Promise<GPXPoint[]> {
    const content = await readFileAsText(file);

    // Parse XML
    let doc: Document;
    try {
      const parser = new DOMParser();
      doc = parser.parseFromString(content, "application/xml");
    } catch {
      throw new Error("Invalid GPX file: XML parsing failed");
    }

    // Check for parsing errors
    if (doc.getElementsByTagName("parsererror").length > 0) {
      throw new Error("Invalid GPX file: XML parsing failed");
    }

    // Get all track points
    const trkpts = Array.from(doc.getElementsByTagName("trkpt"));

    if (trkpts.length === 0) {
      throw new Error("No track points found in GPX file (<trkpt>)");
    }

    const points: GPXPoint[] = [];
    let cumulativeDistance = 0;

    for (let i = 0; i < trkpts.length; i++) {
      const trkpt = trkpts[i];

      // Get latitude and longitude from attributes
      const lat = parseFloat(trkpt.getAttribute("lat") ?? "0");
      const lon = parseFloat(trkpt.getAttribute("lon") ?? "0");

      if (isNaN(lat) || isNaN(lon)) {
        throw new Error(
          `Invalid coordinates at point ${i + 1}: lat=${lat}, lon=${lon}`,
        );
      }

      // Get elevation from <ele> element (if present)
      const eleElement = trkpt.getElementsByTagName("ele")[0];
      const elevation = eleElement ? parseFloat(eleElement.textContent ?? "0") : 0;

      // Get timestamp from <time> element (if present)
      const timeElement = trkpt.getElementsByTagName("time")[0];
      const timestamp = timeElement ? timeElement.textContent : undefined;

      // Calculate distance from previous point
      if (i > 0) {
        const prevPoint = points[i - 1];
        const segmentDistance = haversineDistance(
          prevPoint.lat,
          prevPoint.lon,
          lat,
          lon,
        );
        cumulativeDistance += segmentDistance;
      }

      points.push({
        lat,
        lon,
        elevation: isNaN(elevation) ? 0 : elevation,
        distance: Math.round(cumulativeDistance),
        timestamp,
      });
    }

    return points;
  }
}

export async function parseGPX(file: File): Promise<GPXPoint[]> {
  const parser = new GPXRouteParser();
  return parser.parse(file);
}

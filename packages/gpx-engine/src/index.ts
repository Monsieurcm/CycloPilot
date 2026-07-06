import { GPXTrack, GPXPoint, GPXSegment } from "@cyclopilot/shared";

/**
 * Simple XML element parser for GPX files
 * Works in both Node.js and Browser environments
 */
class SimpleXMLParser {
  private content: string;

  constructor(xmlContent: string) {
    this.content = xmlContent;
  }

  /**
   * Get all elements by tag name
   */
  getElementsByTagName(tagName: string): Array<{ text: string; attributes: Record<string, string> }> {
    const regex = new RegExp(`<${tagName}([^>]*)>(.*?)<\\/${tagName}>`, "gs");
    const matches: Array<{ text: string; attributes: Record<string, string> }> = [];
    let match;

    while ((match = regex.exec(this.content)) !== null) {
      const attributes = this.parseAttributes(match[1]);
      matches.push({
        text: match[2],
        attributes,
      });
    }

    return matches;
  }

  /**
   * Get element text content
   */
  getElementText(tagName: string): string | undefined {
    const regex = new RegExp(`<${tagName}[^>]*>(.*?)<\\/${tagName}>`, "s");
    const match = this.content.match(regex);
    return match ? match[1] : undefined;
  }

  /**
   * Parse element attributes
   */
  private parseAttributes(attrString: string): Record<string, string> {
    const attributes: Record<string, string> = {};
    const regex = /(\w+)=["']([^"']*)["']/g;
    let match;

    while ((match = regex.exec(attrString)) !== null) {
      attributes[match[1]] = match[2];
    }

    return attributes;
  }
}

/**
 * GPX Parser for cycling activities
 * Supports standard GPX 1.1 format with track data
 */
export class GPXParser {
  /**
   * Parse GPX XML content and extract track data
   */
  static parseGPX(content: string): GPXTrack {
    const xmlParser = new SimpleXMLParser(content);

    // Get track elements
    const tracks = xmlParser.getElementsByTagName("trk");
    if (tracks.length === 0) {
      throw new Error("No track found in GPX file");
    }

    const trackContent = tracks[0].text;
    const trackParser = new SimpleXMLParser(trackContent);

    const trackName = trackParser.getElementText("name") || "Unnamed Track";
    const trackDesc = trackParser.getElementText("desc");

    // Parse segments
    const segments: GPXSegment[] = [];
    const allPoints: GPXPoint[] = [];

    const trkSegMatches = trackContent.match(/<trkseg>(.*?)<\/trkseg>/gs) || [];

    for (const trkSegMatch of trkSegMatches) {
      const segmentParser = new SimpleXMLParser(trkSegMatch);
      const trkPtElements = segmentParser.getElementsByTagName("trkpt");

      if (trkPtElements.length === 0) continue;

      const segmentPoints: GPXPoint[] = [];

      for (const trkPt of trkPtElements) {
        const lat = parseFloat(trkPt.attributes.lat || "0");
        const lon = parseFloat(trkPt.attributes.lon || "0");

        const trkPtParser = new SimpleXMLParser(trkPt.text);
        const ele = parseFloat(trkPtParser.getElementText("ele") || "0");
        const time = trkPtParser.getElementText("time");

        const point: GPXPoint = {
          lat,
          lon,
          elevation: ele,
          timestamp: time,
        };

        segmentPoints.push(point);
        allPoints.push(point);
      }

      if (segmentPoints.length > 0) {
        segments.push({ points: segmentPoints });
      }
    }

    if (allPoints.length === 0) {
      throw new Error("No track points found in GPX file");
    }

    // Generate unique ID from track name and timestamp
    const id = `track_${trackName.replace(/\s+/g, "_")}_${Date.now()}`;

    // Calculate track statistics
    const { distance, elevation } = this.calculateDistance(allPoints);
    const bounds = this.calculateBounds(allPoints);

    // Add distance from start to each point
    this.addDistanceToPoints(allPoints);

    return {
      id,
      name: trackName,
      description: trackDesc,
      distance,
      elevation,
      points: allPoints,
      segments: segments.length > 0 ? segments : undefined,
      bounds,
    };
  }

  /**
   * Calculate total distance and elevation changes
   */
  private static calculateDistance(
    points: GPXPoint[]
  ): {
    distance: number;
    elevation: { gain: number; loss: number; min: number; max: number };
  } {
    let totalDistance = 0;
    let elevationGain = 0;
    let elevationLoss = 0;
    let minElevation = points[0]?.elevation || 0;
    let maxElevation = points[0]?.elevation || 0;

    for (let i = 1; i < points.length; i++) {
      const p1 = points[i - 1];
      const p2 = points[i];

      // Calculate horizontal distance using Haversine formula
      const distance = this.haversineDistance(p1.lat, p1.lon, p2.lat, p2.lon);
      totalDistance += distance;

      // Calculate elevation changes
      const elevationDiff = p2.elevation - p1.elevation;
      if (elevationDiff > 0) {
        elevationGain += elevationDiff;
      } else {
        elevationLoss += Math.abs(elevationDiff);
      }

      minElevation = Math.min(minElevation, p2.elevation);
      maxElevation = Math.max(maxElevation, p2.elevation);
    }

    return {
      distance: Math.round(totalDistance),
      elevation: {
        gain: Math.round(elevationGain * 100) / 100,
        loss: Math.round(elevationLoss * 100) / 100,
        min: Math.round(minElevation * 100) / 100,
        max: Math.round(maxElevation * 100) / 100,
      },
    };
  }

  /**
   * Haversine formula to calculate distance between two points
   * Returns distance in meters
   */
  private static haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
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

    return R * c;
  }

  /**
   * Calculate bounding box for the track
   */
  private static calculateBounds(
    points: GPXPoint[]
  ): {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  } {
    let minLat = points[0]?.lat || 0;
    let maxLat = points[0]?.lat || 0;
    let minLon = points[0]?.lon || 0;
    let maxLon = points[0]?.lon || 0;

    for (const point of points) {
      minLat = Math.min(minLat, point.lat);
      maxLat = Math.max(maxLat, point.lat);
      minLon = Math.min(minLon, point.lon);
      maxLon = Math.max(maxLon, point.lon);
    }

    return { minLat, maxLat, minLon, maxLon };
  }

  /**
   * Add cumulative distance from start to each point
   */
  private static addDistanceToPoints(points: GPXPoint[]): void {
    let cumulativeDistance = 0;

    for (let i = 0; i < points.length; i++) {
      if (i > 0) {
        const p1 = points[i - 1];
        const p2 = points[i];
        const distance = this.haversineDistance(p1.lat, p1.lon, p2.lat, p2.lon);
        cumulativeDistance += distance;
      }

      points[i].distance = Math.round(cumulativeDistance);
    }
  }

  /**
   * Calculate track statistics including speed and grade
   */
  static calculateStats(track: GPXTrack): {
    distance: number;
    elevation: { gain: number; loss: number; min: number; max: number };
    avgSpeed?: number;
    maxSpeed?: number;
    avgGrade?: number;
    duration?: number;
  } {
    const stats: {
      distance: number;
      elevation: { gain: number; loss: number; min: number; max: number };
      avgSpeed?: number;
      maxSpeed?: number;
      avgGrade?: number;
      duration?: number;
    } = {
      distance: track.distance,
      elevation: track.elevation,
    };

    // Calculate duration if timestamps are available
    const firstPoint = track.points[0];
    const lastPoint = track.points[track.points.length - 1];

    if (
      track.points.length > 1 &&
      firstPoint?.timestamp &&
      lastPoint?.timestamp
    ) {
      const startTime = new Date(firstPoint.timestamp).getTime();
      const endTime = new Date(lastPoint.timestamp).getTime();
      stats.duration = Math.round((endTime - startTime) / 1000); // seconds

      if (stats.duration > 0) {
        stats.avgSpeed = track.distance / stats.duration; // m/s
      }
    }

    // Calculate average grade
    if (track.distance > 0) {
      stats.avgGrade =
        ((track.elevation.gain - track.elevation.loss) / track.distance) * 100;
    }

    // Calculate max speed (fastest segment between consecutive points)
    if (track.points.length > 1) {
      let maxSpeed = 0;
      for (let i = 1; i < track.points.length; i++) {
        const p1 = track.points[i - 1];
        const p2 = track.points[i];

        if (p1.timestamp && p2.timestamp) {
          const dist = (p2.distance ?? 0) - (p1.distance ?? 0);
          const time =
            (new Date(p2.timestamp).getTime() - new Date(p1.timestamp).getTime()) /
            1000;

          if (time > 0) {
            const speed = dist / time;
            maxSpeed = Math.max(maxSpeed, speed);
          }
        }
      }
      if (maxSpeed > 0) {
        stats.maxSpeed = maxSpeed;
      }
    }

    return stats;
  }
}

/**
 * Parse a GPX file from content (Node.js/Browser compatible)
 */
export async function parseGPXContent(content: string): Promise<GPXTrack> {
  return GPXParser.parseGPX(content);
}

/**
 * Parse a GPX file from filesystem (Node.js only)
 */
export function parseGPXFile(filePath: string): Promise<GPXTrack> {
  return new Promise((resolve, reject) => {
    // This implementation uses dynamic import to support Node.js
    // In Node.js environment, this will use fs module
    // In Browser environment, use parseGPXContent with file.text()
    if (typeof window === "undefined") {
      // Node.js environment - use dynamic require for CommonJS compatibility
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fs = require("fs") as typeof import("fs");
        const content = fs.readFileSync(filePath, "utf-8");
        resolve(GPXParser.parseGPX(content));
      } catch {
        reject(new Error(`Failed to read GPX file: ${filePath}`));
      }
    } else {
      // Browser environment
      reject(
        new Error("parseGPXFile is not supported in browser. Use parseGPXContent instead.")
      );
    }
  });
}

export { GPXTrack, GPXPoint, GPXSegment } from "@cyclopilot/shared";

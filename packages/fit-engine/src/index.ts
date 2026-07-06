import { RideMetrics, FITRecord } from "@cyclopilot/shared";

export class FITParser {
  /**
   * Parse FIT file and extract records
   * FIT format specification: https://developer.garmin.com/fit
   */
  static parseFIT(_buffer: Buffer): FITRecord[] {
    // TODO: Implement FIT file parsing logic
    // - Parse FIT header
    // - Extract data records
    // - Decode messages
    return [];
  }

  /**
   * Convert FIT records to ride metrics
   */
  static toRideMetrics(_records: FITRecord[]): RideMetrics[] {
    // TODO: Implement conversion
    // - Map FIT record fields to RideMetrics
    // - Aggregate by time intervals
    return [];
  }

  /**
   * Extract device info from FIT records
   */
  static getDeviceInfo(_records: FITRecord[]): Record<string, unknown> {
    // TODO: Implement device extraction
    return {};
  }
}

/**
 * Parse a FIT file from content (binary buffer)
 */
export function parseFITContent(buffer: Buffer): FITRecord[] {
  return FITParser.parseFIT(buffer);
}

/**
 * Parse a FIT file from filesystem (Node.js only)
 */
export function parseFITFile(filePath: string): Promise<FITRecord[]> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      // Node.js environment
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fs = require("fs") as typeof import("fs");
        const buffer = fs.readFileSync(filePath);
        resolve(FITParser.parseFIT(buffer));
      } catch {
        reject(new Error(`Failed to read FIT file: ${filePath}`));
      }
    } else {
      reject(new Error("parseFITFile is not supported in browser. Use parseFITContent instead."));
    }
  });
}

export { FITRecord } from "@cyclopilot/shared";

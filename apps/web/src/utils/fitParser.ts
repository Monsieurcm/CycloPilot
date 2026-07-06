import type { GPXPoint } from "@cyclopilot/shared";
import { parseFITRoute } from "@cyclopilot/fit-engine";
import type { RouteParser } from "./routeParser";

export class FITRouteParser implements RouteParser {
  canParse(file: File): boolean {
    return file.name.toLowerCase().endsWith(".fit");
  }

  async parse(file: File): Promise<GPXPoint[]> {
    try {
      const content = await file.arrayBuffer();
      return parseFITRoute(content);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Invalid FIT file: parsing failed");
    }
  }
}

import type { GPXPoint } from "@cyclopilot/shared";
import { GPXRouteParser } from "./gpxParser";
import type { RouteParser } from "./routeParser";

const DEFAULT_PARSERS: RouteParser[] = [new GPXRouteParser()];

export class RouteLoader {
  private readonly parsers: RouteParser[];

  constructor(parsers: RouteParser[] = DEFAULT_PARSERS) {
    this.parsers = parsers;
  }

  async load(file: File): Promise<GPXPoint[]> {
    const parser = this.parsers.find((candidate) => candidate.canParse(file));

    if (!parser) {
      throw new Error("Invalid file type. Please select a .gpx file.");
    }

    return parser.parse(file);
  }
}

const defaultRouteLoader = new RouteLoader();

export function loadRoute(file: File): Promise<GPXPoint[]> {
  return defaultRouteLoader.load(file);
}

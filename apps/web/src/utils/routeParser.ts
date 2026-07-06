import type { GPXPoint } from "@cyclopilot/shared";

export interface RouteParser {
  canParse(file: File): boolean;
  parse(file: File): Promise<GPXPoint[]>;
}

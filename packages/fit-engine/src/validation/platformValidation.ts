import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import FitParser from "fit-file-parser";

interface ScenarioPlatformData {
  file: string;
  recordCount: number;
  hasDistance: boolean;
  hasDuration: boolean;
  hasGps: boolean;
  hasAltitude: boolean;
  hasPower: boolean;
  hasSpeed: boolean;
}

interface PlatformEntry {
  platform: string;
  liveImportTestExecuted: boolean;
  accepted: boolean;
  warning: string;
  dataRecognized: {
    distance: boolean;
    duration: boolean;
    gps: boolean;
    altitude: boolean;
    power: boolean;
    speed: boolean;
  };
}

export interface PlatformValidationResult {
  generatedAt: string;
  sourceDir: string;
  scenarios: ScenarioPlatformData[];
  platforms: PlatformEntry[];
}

function hasFiniteNumber(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value);
}

async function analyzeFitFile(filePath: string): Promise<ScenarioPlatformData> {
  const parser = new FitParser({ force: true, mode: "list" });
  const content = await readFile(filePath);
  const parsed = await parser.parseAsync(content);

  const parsedAny = parsed as {
    records?: Array<Record<string, unknown>>;
    sessions?: Array<Record<string, unknown>>;
  };

  const records = Array.isArray(parsedAny.records) ? parsedAny.records : [];
  const sessions = Array.isArray(parsedAny.sessions) ? parsedAny.sessions : [];

  const hasDistance = records.some((record) => hasFiniteNumber(record.distance))
    || sessions.some((session) => hasFiniteNumber(session.total_distance));

  const hasDuration = records.length > 1
    || sessions.some((session) => hasFiniteNumber(session.total_elapsed_time));

  const hasGps = records.some((record) => {
    return hasFiniteNumber(record.position_lat) && hasFiniteNumber(record.position_long);
  });

  const hasAltitude = records.some((record) => hasFiniteNumber(record.altitude));
  const hasPower = records.some((record) => hasFiniteNumber(record.power));
  const hasSpeed = records.some((record) => hasFiniteNumber(record.speed));

  return {
    file: filePath,
    recordCount: records.length,
    hasDistance,
    hasDuration,
    hasGps,
    hasAltitude,
    hasPower,
    hasSpeed,
  };
}

function aggregateScenarioSignals(scenarios: ScenarioPlatformData[]): PlatformEntry["dataRecognized"] {
  return {
    distance: scenarios.every((scenario) => scenario.hasDistance),
    duration: scenarios.every((scenario) => scenario.hasDuration),
    gps: scenarios.every((scenario) => scenario.hasGps),
    altitude: scenarios.every((scenario) => scenario.hasAltitude),
    power: scenarios.every((scenario) => scenario.hasPower),
    speed: scenarios.every((scenario) => scenario.hasSpeed),
  };
}

function buildPlatforms(signal: PlatformEntry["dataRecognized"]): PlatformEntry[] {
  const platforms = ["Strava", "Garmin Connect", "Intervals.icu", "GoldenCheetah"];

  return platforms.map((platform) => ({
    platform,
    liveImportTestExecuted: false,
    accepted: false,
    warning: "Live import not executable in this environment (no account session/API token).",
    dataRecognized: { ...signal },
  }));
}

function toMarkdown(result: PlatformValidationResult): string {
  const lines: string[] = [];
  lines.push("# PR19.1 - Platform Validation Report");
  lines.push("");
  lines.push(`Generated at: ${result.generatedAt}`);
  lines.push("");
  lines.push("## Scenario signal extraction");
  lines.push("");
  lines.push("| FIT file | Records | Distance | Duration | GPS | Altitude | Power | Speed |");
  lines.push("| --- | ---: | --- | --- | --- | --- | --- | --- |");

  for (const scenario of result.scenarios) {
    lines.push(
      `| ${scenario.file.split("/").pop()} | ${scenario.recordCount} | ${scenario.hasDistance ? "OK" : "KO"} | ${scenario.hasDuration ? "OK" : "KO"} | ${scenario.hasGps ? "OK" : "KO"} | ${scenario.hasAltitude ? "OK" : "KO"} | ${scenario.hasPower ? "OK" : "KO"} | ${scenario.hasSpeed ? "OK" : "KO"} |`,
    );
  }

  lines.push("");
  lines.push("## Target platform matrix");
  lines.push("");
  lines.push("| Platform | Live import executed | Accepted | Warning | Distance | Duration | GPS | Altitude | Power | Speed |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");

  for (const platform of result.platforms) {
    lines.push(
      `| ${platform.platform} | ${platform.liveImportTestExecuted ? "YES" : "NO"} | ${platform.accepted ? "YES" : "NO"} | ${platform.warning} | ${platform.dataRecognized.distance ? "OK" : "KO"} | ${platform.dataRecognized.duration ? "OK" : "KO"} | ${platform.dataRecognized.gps ? "OK" : "KO"} | ${platform.dataRecognized.altitude ? "OK" : "KO"} | ${platform.dataRecognized.power ? "OK" : "KO"} | ${platform.dataRecognized.speed ? "OK" : "KO"} |`,
    );
  }

  lines.push("");
  lines.push("Note: This report validates technical readiness signals only. Real platform acceptance requires authenticated upload tests.");

  return lines.join("\n");
}

export async function runPlatformValidation(workspaceRoot: string): Promise<PlatformValidationResult> {
  const sourceDir = join(workspaceRoot, "exports", "pr19-1", "technical");
  const outputDir = join(workspaceRoot, "exports", "pr19-1", "platform");
  await mkdir(outputDir, { recursive: true });

  const files = ["short.fit", "long.fit", "flat.fit", "hilly.fit"].map((name) => join(sourceDir, name));
  const scenarios: ScenarioPlatformData[] = [];

  for (const file of files) {
    scenarios.push(await analyzeFitFile(file));
  }

  const signal = aggregateScenarioSignals(scenarios);

  const result: PlatformValidationResult = {
    generatedAt: new Date().toISOString(),
    sourceDir,
    scenarios,
    platforms: buildPlatforms(signal),
  };

  const jsonPath = join(outputDir, "platform-validation.json");
  await writeFile(jsonPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  const mdPath = join(outputDir, "platform-validation.md");
  await writeFile(mdPath, `${toMarkdown(result)}\n`, "utf8");

  return result;
}

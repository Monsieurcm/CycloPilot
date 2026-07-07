import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ActivityPoint, VirtualActivity } from "@cyclopilot/shared";
import { exportVirtualActivityToFitArrayBuffer } from "../virtualActivityFitExporter.js";

const FIT_FILE_ID_MESG_NUM = 0;
const FIT_SESSION_MESG_NUM = 18;
const FIT_LAP_MESG_NUM = 19;
const FIT_RECORD_MESG_NUM = 20;
const FIT_EVENT_MESG_NUM = 21;
const FIT_DEVICE_INFO_MESG_NUM = 23;

const FIT_TIMESTAMP_FIELD_NUM = 253;
const FIT_EVENT_FIELD_NUM = 0;
const FIT_EVENT_TYPE_FIELD_NUM = 1;

const FIT_TIMER_EVENT = 0;
const FIT_EVENT_TYPE_START = 0;
const FIT_EVENT_TYPE_STOP_ALL = 4;

interface FitDefinitionField {
  fieldNum: number;
  size: number;
}

interface FitDefinition {
  globalMessageNumber: number;
  fields: FitDefinitionField[];
  dataSize: number;
}

interface ParsedFitMessage {
  globalMessageNumber: number;
  fields: Map<number, number>;
}

interface ParsedFitFile {
  headerSize: number;
  dataSize: number;
  expectedDataCrc: number;
  actualDataCrc: number;
  expectedHeaderCrc: number | null;
  actualHeaderCrc: number | null;
  messages: ParsedFitMessage[];
}

export interface TechnicalScenarioResult {
  scenario: string;
  fileName: string;
  filePath: string;
  bytes: number;
  expectedPoints: number;
  checks: {
    crcDataValid: boolean;
    crcHeaderValid: boolean;
    messageOrderValid: boolean;
    hasFileId: boolean;
    hasSession: boolean;
    hasLap: boolean;
    hasRecords: boolean;
    hasStartEvent: boolean;
    hasStopEvent: boolean;
    timestampsMonotonic: boolean;
    recordCountMatchesPoints: boolean;
  };
  counts: {
    records: number;
    sessions: number;
    laps: number;
    events: number;
  };
}

export interface TechnicalValidationRunResult {
  generatedAt: string;
  outputDir: string;
  scenarioResults: TechnicalScenarioResult[];
  allChecksPassed: boolean;
}

function fitCrc(buffer: Uint8Array): number {
  let crc = 0;
  for (const byte of buffer) {
    crc = updateFitCrc(crc, byte);
  }
  return crc;
}

function updateFitCrc(crc: number, byte: number): number {
  const crcTable = [
    0x0000,
    0xcc01,
    0xd801,
    0x1400,
    0xf001,
    0x3c00,
    0x2800,
    0xe401,
    0xa001,
    0x6c00,
    0x7800,
    0xb401,
    0x5000,
    0x9c01,
    0x8801,
    0x4400,
  ];

  let result = crc;

  let tmp = crcTable[result & 0x0f];
  result = (result >> 4) & 0x0fff;
  result ^= tmp ^ crcTable[byte & 0x0f];

  tmp = crcTable[result & 0x0f];
  result = (result >> 4) & 0x0fff;
  result ^= tmp ^ crcTable[(byte >> 4) & 0x0f];

  return result;
}

function readUint16(data: Uint8Array, offset: number): number {
  return data[offset] | (data[offset + 1] << 8);
}

function readUint32(data: Uint8Array, offset: number): number {
  return (
    data[offset] |
    (data[offset + 1] << 8) |
    (data[offset + 2] << 16) |
    (data[offset + 3] << 24)
  ) >>> 0;
}

function parseFitFile(bytes: Uint8Array): ParsedFitFile {
  const headerSize = bytes[0] ?? 0;
  if (headerSize < 12) {
    throw new Error(`Invalid FIT header size: ${headerSize}`);
  }

  const dataSize = readUint32(bytes, 4);
  const dataStart = headerSize;
  const dataEnd = dataStart + dataSize;

  if (dataEnd + 2 > bytes.length) {
    throw new Error("Invalid FIT file length");
  }

  const expectedHeaderCrc = headerSize >= 14 ? readUint16(bytes, 12) : null;
  const actualHeaderCrc = headerSize >= 14 ? fitCrc(bytes.subarray(0, 12)) : null;

  const expectedDataCrc = readUint16(bytes, dataEnd);
  const actualDataCrc = fitCrc(bytes.subarray(0, dataEnd));

  const messages = parseFitMessages(bytes.subarray(dataStart, dataEnd));

  return {
    headerSize,
    dataSize,
    expectedDataCrc,
    actualDataCrc,
    expectedHeaderCrc,
    actualHeaderCrc,
    messages,
  };
}

function parseFitMessages(data: Uint8Array): ParsedFitMessage[] {
  const definitions = new Map<number, FitDefinition>();
  const messages: ParsedFitMessage[] = [];

  let offset = 0;
  while (offset < data.length) {
    const recordHeader = data[offset];
    offset += 1;

    if ((recordHeader & 0x80) !== 0) {
      const localMessageType = (recordHeader >> 5) & 0x03;
      const definition = definitions.get(localMessageType);
      if (!definition) {
        throw new Error("Compressed data message without definition");
      }

      const fields = parseDataFields(data, offset, definition, true, recordHeader & 0x1f);
      offset += definition.dataSize;
      messages.push({
        globalMessageNumber: definition.globalMessageNumber,
        fields,
      });
      continue;
    }

    const isDefinition = (recordHeader & 0x40) !== 0;
    const hasDeveloperData = (recordHeader & 0x20) !== 0;
    const localMessageType = recordHeader & 0x0f;

    if (isDefinition) {
      if (offset + 5 > data.length) {
        throw new Error("Truncated definition message");
      }

      offset += 1; // reserved
      const architecture = data[offset];
      offset += 1;

      const globalMessageNumber = architecture === 0
        ? readUint16(data, offset)
        : (data[offset] << 8) | data[offset + 1];
      offset += 2;

      const numFields = data[offset];
      offset += 1;

      const fields: FitDefinitionField[] = [];
      let dataSize = 0;

      for (let i = 0; i < numFields; i += 1) {
        if (offset + 3 > data.length) {
          throw new Error("Truncated field definition");
        }
        const fieldNum = data[offset];
        const size = data[offset + 1];
        offset += 3;
        dataSize += size;
        fields.push({ fieldNum, size });
      }

      if (hasDeveloperData) {
        if (offset + 1 > data.length) {
          throw new Error("Missing developer field count");
        }
        const numDeveloperFields = data[offset];
        offset += 1;

        for (let i = 0; i < numDeveloperFields; i += 1) {
          if (offset + 3 > data.length) {
            throw new Error("Truncated developer field definition");
          }
          const size = data[offset + 1];
          offset += 3;
          dataSize += size;
        }
      }

      definitions.set(localMessageType, {
        globalMessageNumber,
        fields,
        dataSize,
      });

      continue;
    }

    const definition = definitions.get(localMessageType);
    if (!definition) {
      throw new Error("Data message without definition");
    }

    const fields = parseDataFields(data, offset, definition, false, 0);
    offset += definition.dataSize;
    messages.push({
      globalMessageNumber: definition.globalMessageNumber,
      fields,
    });
  }

  return messages;
}

function parseDataFields(
  data: Uint8Array,
  offset: number,
  definition: FitDefinition,
  hasCompressedTimestamp: boolean,
  compressedTimestampValue: number,
): Map<number, number> {
  const fields = new Map<number, number>();
  let cursor = offset;

  for (const field of definition.fields) {
    if (cursor + field.size > data.length) {
      throw new Error("Truncated data field");
    }

    const value = readFieldValue(data, cursor, field.size);
    fields.set(field.fieldNum, value);
    cursor += field.size;
  }

  if (hasCompressedTimestamp) {
    fields.set(FIT_TIMESTAMP_FIELD_NUM, compressedTimestampValue);
  }

  return fields;
}

function readFieldValue(data: Uint8Array, offset: number, size: number): number {
  if (size <= 0) {
    return 0;
  }

  if (size === 1) {
    return data[offset];
  }

  if (size === 2) {
    return readUint16(data, offset);
  }

  if (size === 4) {
    return readUint32(data, offset);
  }

  // For arrays or unsupported integer sizes, keep the first byte as sentinel.
  return data[offset];
}

function buildScenarioActivity(
  scenario: "short" | "long" | "flat" | "hilly",
): VirtualActivity {
  const pointCount = scenario === "short"
    ? 25
    : scenario === "long"
      ? 600
      : scenario === "flat"
        ? 180
        : 240;

  const baseLat = 45.76;
  const baseLon = 4.84;
  const startTime = Date.parse("2026-07-07T08:00:00.000Z");

  const points: ActivityPoint[] = [];
  let cumulativeDistance = 0;

  for (let index = 0; index < pointCount; index += 1) {
    const timestamp = new Date(startTime + index * 1000).toISOString();
    const speed = scenario === "long"
      ? 30 + (index % 10)
      : scenario === "short"
        ? 24 + (index % 5)
        : scenario === "flat"
          ? 32 + ((index % 6) * 0.5)
          : 21 + (index % 7);

    const gradient = scenario === "flat"
      ? 0.2
      : scenario === "hilly"
        ? Math.sin(index / 12) * 7
        : Math.sin(index / 20) * 2;

    const speedMs = speed / 3.6;
    cumulativeDistance += speedMs;

    points.push({
      timestamp,
      latitude: baseLat + index * 0.0001,
      longitude: baseLon + index * 0.0001,
      altitude: 250 + (scenario === "hilly" ? Math.sin(index / 8) * 25 : index * 0.03),
      speed,
      power: scenario === "hilly" ? 260 + (index % 20) : 210 + (index % 15),
      gradient,
      cumulativeDistance,
      cadence: 82 + (index % 9),
      heartRate: 138 + (index % 18),
    });
  }

  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];

  return {
    metadata: {
      id: `scenario-${scenario}`,
      name: `Scenario ${scenario}`,
      createdAt: firstPoint?.timestamp ?? new Date(startTime).toISOString(),
      routeSource: "fit",
    },
    parameters: {
      riderProfile: {
        riderWeightKg: 74,
        bikeWeightKg: 9,
      },
      bikeProfile: {
        id: "road",
        name: "Road",
        description: "Validation profile",
        multiplier: 1,
      },
      powerStrategy: "auto",
    },
    route: {
      originalRoute: [],
      totalDistance: lastPoint?.cumulativeDistance ?? 0,
      elevationGain: scenario === "hilly" ? 380 : 45,
      elevationLoss: scenario === "hilly" ? 375 : 42,
    },
    currentState: {
      elapsedTime: Math.max(0, points.length - 1),
      traveledDistance: lastPoint?.cumulativeDistance ?? 0,
      currentPosition: lastPoint
        ? {
          lat: lastPoint.latitude,
          lon: lastPoint.longitude,
          altitude: lastPoint.altitude,
          distance: lastPoint.cumulativeDistance,
        }
        : null,
      currentSpeed: lastPoint?.speed ?? 0,
      currentPower: lastPoint?.power ?? 0,
      currentGradient: lastPoint?.gradient ?? 0,
    },
    points,
  };
}

function validateScenario(
  scenario: string,
  fileName: string,
  filePath: string,
  fitBytes: Uint8Array,
  expectedPoints: number,
): TechnicalScenarioResult {
  const parsed = parseFitFile(fitBytes);

  const messageTypes = parsed.messages.map((message) => message.globalMessageNumber);

  const firstOccurrence = (messageNumber: number): number => messageTypes.indexOf(messageNumber);
  const lastOccurrence = (messageNumber: number): number => messageTypes.lastIndexOf(messageNumber);

  const recordMessages = parsed.messages.filter((message) => message.globalMessageNumber === FIT_RECORD_MESG_NUM);
  const sessionMessages = parsed.messages.filter((message) => message.globalMessageNumber === FIT_SESSION_MESG_NUM);
  const lapMessages = parsed.messages.filter((message) => message.globalMessageNumber === FIT_LAP_MESG_NUM);
  const eventMessages = parsed.messages.filter((message) => message.globalMessageNumber === FIT_EVENT_MESG_NUM);

  const hasStartEvent = eventMessages.some((message) => {
    return (
      message.fields.get(FIT_EVENT_FIELD_NUM) === FIT_TIMER_EVENT
      && message.fields.get(FIT_EVENT_TYPE_FIELD_NUM) === FIT_EVENT_TYPE_START
    );
  });

  const hasStopEvent = eventMessages.some((message) => {
    return (
      message.fields.get(FIT_EVENT_FIELD_NUM) === FIT_TIMER_EVENT
      && message.fields.get(FIT_EVENT_TYPE_FIELD_NUM) === FIT_EVENT_TYPE_STOP_ALL
    );
  });

  const timestamps = parsed.messages
    .map((message) => message.fields.get(FIT_TIMESTAMP_FIELD_NUM))
    .filter((value): value is number => typeof value === "number");

  const timestampsMonotonic = timestamps.every((value, index) => index === 0 || value >= timestamps[index - 1]);

  const fileIdIndex = firstOccurrence(FIT_FILE_ID_MESG_NUM);
  const deviceInfoIndex = firstOccurrence(FIT_DEVICE_INFO_MESG_NUM);
  const firstEventIndex = firstOccurrence(FIT_EVENT_MESG_NUM);
  const firstRecordIndex = firstOccurrence(FIT_RECORD_MESG_NUM);
  const lapIndex = firstOccurrence(FIT_LAP_MESG_NUM);
  const sessionIndex = firstOccurrence(FIT_SESSION_MESG_NUM);
  const lastEventIndex = lastOccurrence(FIT_EVENT_MESG_NUM);

  const messageOrderValid = (
    fileIdIndex !== -1
    && deviceInfoIndex !== -1
    && firstEventIndex !== -1
    && firstRecordIndex !== -1
    && lapIndex !== -1
    && sessionIndex !== -1
    && lastEventIndex !== -1
    && fileIdIndex < deviceInfoIndex
    && deviceInfoIndex < firstEventIndex
    && firstEventIndex < firstRecordIndex
    && firstRecordIndex < lapIndex
    && lapIndex < sessionIndex
    && sessionIndex < lastEventIndex
  );

  const checks = {
    crcDataValid: parsed.expectedDataCrc === parsed.actualDataCrc,
    crcHeaderValid: parsed.expectedHeaderCrc === null || parsed.expectedHeaderCrc === parsed.actualHeaderCrc,
    messageOrderValid,
    hasFileId: fileIdIndex !== -1,
    hasSession: sessionMessages.length > 0,
    hasLap: lapMessages.length > 0,
    hasRecords: recordMessages.length > 0,
    hasStartEvent,
    hasStopEvent,
    timestampsMonotonic,
    recordCountMatchesPoints: recordMessages.length === expectedPoints,
  };

  return {
    scenario,
    fileName,
    filePath,
    bytes: fitBytes.byteLength,
    expectedPoints,
    checks,
    counts: {
      records: recordMessages.length,
      sessions: sessionMessages.length,
      laps: lapMessages.length,
      events: eventMessages.length,
    },
  };
}

function asMarkdown(result: TechnicalValidationRunResult): string {
  const lines: string[] = [];
  lines.push("# PR19.1 - Technical FIT Validation");
  lines.push("");
  lines.push(`Generated at: ${result.generatedAt}`);
  lines.push("");
  lines.push("## Scenario results");
  lines.push("");
  lines.push("| Scenario | FIT file | Size (bytes) | Records expected | Records actual | Session | Lap | Start event | Stop event | CRC header | CRC data | Order | Timestamps | Record count | Result |");
  lines.push("| --- | --- | ---: | ---: | ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");

  for (const scenario of result.scenarioResults) {
    const c = scenario.checks;
    const allScenarioChecks = Object.values(c).every(Boolean);
    lines.push(
      `| ${scenario.scenario} | ${scenario.fileName} | ${scenario.bytes} | ${scenario.expectedPoints} | ${scenario.counts.records} | ${c.hasSession ? "OK" : "KO"} | ${c.hasLap ? "OK" : "KO"} | ${c.hasStartEvent ? "OK" : "KO"} | ${c.hasStopEvent ? "OK" : "KO"} | ${c.crcHeaderValid ? "OK" : "KO"} | ${c.crcDataValid ? "OK" : "KO"} | ${c.messageOrderValid ? "OK" : "KO"} | ${c.timestampsMonotonic ? "OK" : "KO"} | ${c.recordCountMatchesPoints ? "OK" : "KO"} | ${allScenarioChecks ? "PASS" : "FAIL"} |`,
    );
  }

  lines.push("");
  lines.push(`Global result: ${result.allChecksPassed ? "PASS" : "FAIL"}`);
  lines.push("");

  return lines.join("\n");
}

export async function runTechnicalFitValidation(workspaceRoot: string): Promise<TechnicalValidationRunResult> {
  const outputDir = join(workspaceRoot, "exports", "pr19-1", "technical");
  await mkdir(outputDir, { recursive: true });

  const scenarios: Array<"short" | "long" | "flat" | "hilly"> = ["short", "long", "flat", "hilly"];
  const scenarioResults: TechnicalScenarioResult[] = [];

  for (const scenario of scenarios) {
    const activity = buildScenarioActivity(scenario);
    const fitBuffer = exportVirtualActivityToFitArrayBuffer(activity);
    const fitBytes = new Uint8Array(fitBuffer);

    const fileName = `${scenario}.fit`;
    const filePath = join(outputDir, fileName);

    await writeFile(filePath, Buffer.from(fitBytes));

    scenarioResults.push(validateScenario(scenario, fileName, filePath, fitBytes, activity.points.length));
  }

  const allChecksPassed = scenarioResults.every((scenario) => Object.values(scenario.checks).every(Boolean));

  const result: TechnicalValidationRunResult = {
    generatedAt: new Date().toISOString(),
    outputDir,
    scenarioResults,
    allChecksPassed,
  };

  const jsonPath = join(outputDir, "technical-validation.json");
  await writeFile(jsonPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  const mdPath = join(outputDir, "technical-validation.md");
  await writeFile(mdPath, `${asMarkdown(result)}\n`, "utf8");

  return result;
}

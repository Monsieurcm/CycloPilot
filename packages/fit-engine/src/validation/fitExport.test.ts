import test from "node:test";
import assert from "node:assert/strict";
import type { ActivityPoint, VirtualActivity } from "@cyclopilot/shared";
import FitParser from "fit-file-parser";
import { exportVirtualActivityToFitArrayBuffer } from "../virtualActivityFitExporter.js";
import { parseFitFileForValidation } from "./technicalValidation.js";

const FIT_FILE_ID_MESG_NUM = 0;
const FIT_SESSION_MESG_NUM = 18;
const FIT_LAP_MESG_NUM = 19;
const FIT_RECORD_MESG_NUM = 20;
const FIT_EVENT_MESG_NUM = 21;

function buildTestActivity(pointsCount: number): VirtualActivity {
  const startTime = Date.parse("2026-07-07T09:00:00.000Z");
  const baseLat = 43.6;
  const baseLon = 1.44;

  const points: ActivityPoint[] = [];
  let distance = 0;

  for (let index = 0; index < pointsCount; index += 1) {
    const speed = 28 + (index % 6);
    distance += speed / 3.6;

    points.push({
      timestamp: new Date(startTime + index * 1000).toISOString(),
      latitude: baseLat + index * 0.00015,
      longitude: baseLon + index * 0.00008,
      altitude: 180 + Math.sin(index / 7) * 8,
      speed,
      power: 220 + (index % 25),
      gradient: Math.sin(index / 12) * 3,
      cumulativeDistance: distance,
      cadence: 85 + (index % 12),
      heartRate: 140 + (index % 20),
    });
  }

  const last = points[points.length - 1];
  const first = points[0];

  return {
    metadata: {
      id: "fit-test-activity",
      name: "FIT test activity",
      createdAt: first.timestamp,
      routeSource: "fit",
    },
    parameters: {
      riderProfile: {
        riderWeightKg: 73,
        bikeWeightKg: 8,
      },
      bikeProfile: {
        id: "road",
        name: "Road",
        description: "Test profile",
        multiplier: 1,
      },
      powerStrategy: "auto",
    },
    route: {
      originalRoute: [],
      totalDistance: last.cumulativeDistance,
      elevationGain: 72,
      elevationLoss: 68,
    },
    currentState: {
      elapsedTime: points.length - 1,
      traveledDistance: last.cumulativeDistance,
      currentPosition: {
        lat: last.latitude,
        lon: last.longitude,
        altitude: last.altitude,
        distance: last.cumulativeDistance,
      },
      currentSpeed: last.speed,
      currentPower: last.power,
      currentGradient: last.gradient,
    },
    points,
  };
}

test("FIT export non-regression: structural integrity and mandatory messages", async () => {
  const activity = buildTestActivity(120);
  const fitBuffer = exportVirtualActivityToFitArrayBuffer(activity);

  assert.ok(fitBuffer.byteLength > 0, "FIT export should produce a non-empty ArrayBuffer");

  const parser = new FitParser({ force: true, mode: "list" });
  const parsed = await parser.parseAsync(Buffer.from(new Uint8Array(fitBuffer)));
  const parsedAny = parsed as {
    records?: unknown[];
    sessions?: unknown[];
  };

  assert.ok(Array.isArray(parsedAny.records), "FIT should be readable by fit-file-parser");
  assert.equal(parsedAny.records?.length, activity.points.length, "Record count should match activity points");
  assert.ok(Array.isArray(parsedAny.sessions) && parsedAny.sessions.length > 0, "Session should be present");

  const raw = parseFitFileForValidation(new Uint8Array(fitBuffer));

  assert.equal(raw.expectedDataCrc, raw.actualDataCrc, "FIT data CRC should be valid");
  if (raw.expectedHeaderCrc !== null) {
    assert.equal(raw.expectedHeaderCrc, raw.actualHeaderCrc, "FIT header CRC should be valid");
  }

  const messageTypes = raw.messages.map((message) => message.globalMessageNumber);

  assert.ok(messageTypes.includes(FIT_FILE_ID_MESG_NUM), "File ID message should be present");
  assert.ok(messageTypes.includes(FIT_SESSION_MESG_NUM), "Session message should be present");
  assert.ok(messageTypes.includes(FIT_LAP_MESG_NUM), "Lap message should be present");
  assert.ok(messageTypes.includes(FIT_RECORD_MESG_NUM), "Record messages should be present");
  assert.ok(messageTypes.includes(FIT_EVENT_MESG_NUM), "Event messages should be present");

  const recordsCount = messageTypes.filter((num) => num === FIT_RECORD_MESG_NUM).length;
  assert.equal(recordsCount, activity.points.length, "Raw record message count should match activity points");
});

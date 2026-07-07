import type { VirtualActivity } from "@cyclopilot/shared";
import { FitEncoder, FitConstants, FitMessages, Message } from "fit-encoder";
import FitParser from "fit-file-parser";
import fitDecoder from "fit-decoder";
import {
  buildFitActivityStructure,
  type FitActivityStructure,
  type FitGeneratorOptions,
} from "./virtualActivityFitGenerator.js";

const DEFAULT_GENERATOR_OPTIONS: FitGeneratorOptions = {
  manufacturer: FitConstants.manufacturer.development,
  product: 1,
  serialNumber: 1,
  fileType: FitConstants.file.activity,
  sport: FitConstants.sport.cycling,
  subSport: FitConstants.sub_sport.road,
  timerEvent: FitConstants.event.timer,
  eventTypeStart: FitConstants.event_type.start,
  eventTypeStopAll: FitConstants.event_type.stop_all,
  softwareVersion: 100,
};

const { fit2json, parseRecords } = fitDecoder as {
  fit2json: (buffer: ArrayBuffer) => unknown;
  parseRecords: (input: unknown) => unknown;
};

interface RecordMessageFlags {
  hasHeartRate: boolean;
  hasCadence: boolean;
}

export interface FitValidationResult {
  fitDecoderValid: boolean;
  fitReaderValid: boolean;
  recordCount: number;
  sessionCount: number;
}

class VirtualActivityFitEncoder extends FitEncoder {
  private readonly activityStructure: FitActivityStructure;

  private readonly recordMessageCache = new Map<string, Message>();

  constructor(activityStructure: FitActivityStructure) {
    super();
    this.activityStructure = activityStructure;
  }

  encode(): ArrayBuffer {
    this.writeFileId();
    this.writeDeviceInfo();
    this.writeStartEvent();
    this.writeRecords();
    this.writeLap();
    this.writeSession();
    this.writeStopEvent();

    return this.getFile() as ArrayBuffer;
  }

  private writeFileId(): void {
    const m = this.activityStructure.fileId;

    new Message(
      FitConstants.mesg_num.file_id,
      FitMessages.file_id,
      "type",
      "manufacturer",
      "product",
      "serial_number",
      "time_created",
      "number",
    ).writeDataMessage(m.type, m.manufacturer, m.product, m.serialNumber, m.timeCreated, m.number);
  }

  private writeDeviceInfo(): void {
    const m = this.activityStructure.deviceInfo;

    new Message(
      FitConstants.mesg_num.device_info,
      FitMessages.device_info,
      "timestamp",
      "device_index",
      "manufacturer",
      "product",
      "serial_number",
      "software_version",
    ).writeDataMessage(
      m.timestamp,
      m.deviceIndex,
      m.manufacturer,
      m.product,
      m.serialNumber,
      m.softwareVersion,
    );
  }

  private writeStartEvent(): void {
    const m = this.activityStructure.startEvent;

    new Message(
      FitConstants.mesg_num.event,
      FitMessages.event,
      "timestamp",
      "event",
      "event_type",
      "event_group",
    ).writeDataMessage(m.timestamp, m.event, m.eventType, m.eventGroup);
  }

  private writeStopEvent(): void {
    const m = this.activityStructure.stopEvent;

    new Message(
      FitConstants.mesg_num.event,
      FitMessages.event,
      "timestamp",
      "event",
      "event_type",
      "event_group",
    ).writeDataMessage(m.timestamp, m.event, m.eventType, m.eventGroup);
  }

  private writeLap(): void {
    const m = this.activityStructure.lap;

    const hasHeartRate = typeof m.avgHeartRate === "number" && typeof m.maxHeartRate === "number";
    const hasCadence = typeof m.avgCadence === "number" && typeof m.maxCadence === "number";

    const fields = [
      "timestamp",
      "event",
      "event_type",
      "start_time",
      "start_position_lat",
      "start_position_long",
      "end_position_lat",
      "end_position_long",
      "total_elapsed_time",
      "total_timer_time",
      "total_distance",
      "total_ascent",
      "total_descent",
      "avg_speed",
      "max_speed",
      "avg_power",
      "max_power",
      "sport",
    ];

    if (hasHeartRate) {
      fields.push("avg_heart_rate", "max_heart_rate");
    }

    if (hasCadence) {
      fields.push("avg_cadence", "max_cadence");
    }

    const message = new Message(FitConstants.mesg_num.lap, FitMessages.lap, ...(fields as never[]));
    const values: number[] = [
      m.timestamp,
      FitConstants.event.lap,
      FitConstants.event_type.stop,
      m.startTime,
      m.startPositionLat,
      m.startPositionLong,
      m.endPositionLat,
      m.endPositionLong,
      m.totalElapsedTime,
      m.totalTimerTime,
      m.totalDistance,
      m.totalAscent,
      m.totalDescent,
      m.avgSpeed,
      m.maxSpeed,
      m.avgPower,
      m.maxPower,
      FitConstants.sport.cycling,
    ];

    if (hasHeartRate) {
      values.push(m.avgHeartRate as number, m.maxHeartRate as number);
    }

    if (hasCadence) {
      values.push(m.avgCadence as number, m.maxCadence as number);
    }

    message.writeDataMessage(...values);
  }

  private writeSession(): void {
    const m = this.activityStructure.session;

    const hasHeartRate = typeof m.avgHeartRate === "number" && typeof m.maxHeartRate === "number";
    const hasCadence = typeof m.avgCadence === "number" && typeof m.maxCadence === "number";

    const fields = [
      "timestamp",
      "event",
      "event_type",
      "start_time",
      "start_position_lat",
      "start_position_long",
      "sport",
      "sub_sport",
      "total_elapsed_time",
      "total_timer_time",
      "total_distance",
      "total_ascent",
      "total_descent",
      "avg_speed",
      "max_speed",
      "avg_power",
      "max_power",
      "num_laps",
    ];

    if (hasHeartRate) {
      fields.push("avg_heart_rate", "max_heart_rate");
    }

    if (hasCadence) {
      fields.push("avg_cadence", "max_cadence");
    }

    const message = new Message(FitConstants.mesg_num.session, FitMessages.session, ...(fields as never[]));
    const values: number[] = [
      m.timestamp,
      FitConstants.event.session,
      FitConstants.event_type.stop,
      m.startTime,
      m.startPositionLat,
      m.startPositionLong,
      m.sport,
      m.subSport,
      m.totalElapsedTime,
      m.totalTimerTime,
      m.totalDistance,
      m.totalAscent,
      m.totalDescent,
      m.avgSpeed,
      m.maxSpeed,
      m.avgPower,
      m.maxPower,
      m.numLaps,
    ];

    if (hasHeartRate) {
      values.push(m.avgHeartRate as number, m.maxHeartRate as number);
    }

    if (hasCadence) {
      values.push(m.avgCadence as number, m.maxCadence as number);
    }

    message.writeDataMessage(...values);
  }

  private writeRecords(): void {
    for (const record of this.activityStructure.records) {
      const flags: RecordMessageFlags = {
        hasHeartRate: typeof record.heartRate === "number",
        hasCadence: typeof record.cadence === "number",
      };

      const message = this.getRecordMessage(flags);

      const values: number[] = [
        record.timestamp,
        record.positionLat,
        record.positionLong,
        record.altitude,
        record.distance,
        record.speed,
        record.power,
        record.grade,
      ];

      if (flags.hasHeartRate) {
        values.push(record.heartRate as number);
      }

      if (flags.hasCadence) {
        values.push(record.cadence as number);
      }

      message.writeDataMessage(...values);
    }
  }

  private getRecordMessage(flags: RecordMessageFlags): Message {
    const key = `${flags.hasHeartRate ? "hr" : "nohr"}-${flags.hasCadence ? "cad" : "nocad"}`;
    const cached = this.recordMessageCache.get(key);
    if (cached) {
      return cached;
    }

    const fields = [
      "timestamp",
      "position_lat",
      "position_long",
      "altitude",
      "distance",
      "speed",
      "power",
      "grade",
    ];

    if (flags.hasHeartRate) {
      fields.push("heart_rate");
    }

    if (flags.hasCadence) {
      fields.push("cadence");
    }

    const message = new Message(FitConstants.mesg_num.record, FitMessages.record, ...(fields as never[]));
    this.recordMessageCache.set(key, message);
    return message;
  }
}

export function exportVirtualActivityToFitArrayBuffer(
  activity: VirtualActivity,
  options: Partial<FitGeneratorOptions> = {},
): ArrayBuffer {
  const structure = buildFitActivityStructure(activity, {
    ...DEFAULT_GENERATOR_OPTIONS,
    ...options,
  });

  const encoder = new VirtualActivityFitEncoder(structure);
  return encoder.encode();
}

export async function validateFitArrayBuffer(
  buffer: ArrayBuffer,
): Promise<FitValidationResult> {
  const bytes = new Uint8Array(buffer);

  let fitDecoderValid = false;
  let fitReaderValid = false;
  let recordCount = 0;
  let sessionCount = 0;

  try {
    const decoded = parseRecords(fit2json(bytes.buffer));
    if (Array.isArray(decoded)) {
      fitDecoderValid = true;
      recordCount = decoded.filter((item: { type?: string }) => item.type === "record").length;
      sessionCount = decoded.filter((item: { type?: string }) => item.type === "session").length;
    }
  } catch {
    fitDecoderValid = false;
  }

  try {
    const parser = new FitParser({ force: true, mode: "list" });
    const parsed = await parser.parseAsync(Buffer.from(bytes));
    fitReaderValid = Boolean(parsed);
  } catch {
    fitReaderValid = false;
  }

  return {
    fitDecoderValid,
    fitReaderValid,
    recordCount,
    sessionCount,
  };
}
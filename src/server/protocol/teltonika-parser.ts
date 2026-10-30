import { calculateTeltonikaCrc16, verifyTeltonikaCrc } from "./crc16";
import {
  AvlRecord,
  DeviceIgnitionConfig,
  Fmc130TelemetryProperties,
  Fmc920TelemetryProperties,
  GpsData,
  IOElement,
  ParsedAvlPacket,
  ParsePacketResult,
  TELTONIKA_AVL_IDS,
  TELTONIKA_CODECS,
  TelemetryProperties,
} from "./teltonika-types";

export interface ParsePacketOptions {
  model?: string;
  ignitionConfig?: DeviceIgnitionConfig;
  previousIgnitionState?: "ON" | "OFF" | "Unknown";
}

/**
 * Extracts FMC920 essential I/O properties from parsed I/O map.
 * Preserves strict backward compatibility with existing FMC920 tests and integrations.
 */
export function extractFmc920Properties(ioElements: Record<number, IOElement>): Fmc920TelemetryProperties {
  // AVL ID 239: Ignition (1 byte, 0 = OFF, 1 = ON)
  let ignition: "ON" | "OFF" | "Unknown" = "Unknown";
  if (ioElements[TELTONIKA_AVL_IDS.IGNITION] !== undefined) {
    const raw = Number(ioElements[TELTONIKA_AVL_IDS.IGNITION].value);
    ignition = raw === 1 ? "ON" : "OFF";
  }

  // AVL ID 240: Movement (1 byte, 0 = Stationary, 1 = Moving)
  let movement: "Moving" | "Stationary" | "Unknown" = "Unknown";
  if (ioElements[TELTONIKA_AVL_IDS.MOVEMENT] !== undefined) {
    const raw = Number(ioElements[TELTONIKA_AVL_IDS.MOVEMENT].value);
    movement = raw === 1 ? "Moving" : "Stationary";
  }

  // AVL ID 66: External Voltage in mV (2 bytes) -> Volts
  let externalVoltage: number | null = null;
  if (ioElements[TELTONIKA_AVL_IDS.EXTERNAL_VOLTAGE_MV] !== undefined) {
    const mv = Number(ioElements[TELTONIKA_AVL_IDS.EXTERNAL_VOLTAGE_MV].value);
    externalVoltage = Math.round((mv / 1000) * 100) / 100;
  }

  // AVL ID 67: Internal Battery Voltage in mV (2 bytes) -> Volts
  let internalBatteryVoltage: number | null = null;
  if (ioElements[TELTONIKA_AVL_IDS.BATTERY_VOLTAGE_MV] !== undefined) {
    const mv = Number(ioElements[TELTONIKA_AVL_IDS.BATTERY_VOLTAGE_MV].value);
    internalBatteryVoltage = Math.round((mv / 1000) * 100) / 100;
  }

  // AVL ID 21: GSM Signal (1 byte, 0 - 5 bars)
  let gsmSignal: number | null = null;
  if (ioElements[TELTONIKA_AVL_IDS.GSM_SIGNAL] !== undefined) {
    gsmSignal = Math.min(5, Math.max(0, Number(ioElements[TELTONIKA_AVL_IDS.GSM_SIGNAL].value)));
  }

  return {
    ignition,
    movement,
    externalVoltage,
    internalBatteryVoltage,
    gsmSignal,
  };
}

/**
 * Extracts comprehensive FMC130 telemetry fields and resolves model-specific ignition configuration.
 */
export function extractFmc130Properties(
  ioElements: Record<number, IOElement>,
  ignitionConfig?: DeviceIgnitionConfig,
  previousIgnitionState?: "ON" | "OFF" | "Unknown"
): Fmc130TelemetryProperties {
  // Base properties
  const base = extractFmc920Properties(ioElements);

  // Digital Inputs (AVL IDs 1, 2, 3)
  const din1 = ioElements[TELTONIKA_AVL_IDS.DIN1] !== undefined
    ? Number(ioElements[TELTONIKA_AVL_IDS.DIN1].value)
    : null;
  const din2 = ioElements[TELTONIKA_AVL_IDS.DIN2] !== undefined
    ? Number(ioElements[TELTONIKA_AVL_IDS.DIN2].value)
    : null;
  const din3 = ioElements[TELTONIKA_AVL_IDS.DIN3] !== undefined
    ? Number(ioElements[TELTONIKA_AVL_IDS.DIN3].value)
    : null;

  // Analog Inputs in mV (AVL IDs 9, 10)
  const ain1Mv = ioElements[TELTONIKA_AVL_IDS.AIN1] !== undefined
    ? Number(ioElements[TELTONIKA_AVL_IDS.AIN1].value)
    : null;
  const ain2Mv = ioElements[TELTONIKA_AVL_IDS.AIN2] !== undefined
    ? Number(ioElements[TELTONIKA_AVL_IDS.AIN2].value)
    : null;

  // Digital Outputs (AVL IDs 179, 180)
  const dout1 = ioElements[TELTONIKA_AVL_IDS.DOUT1] !== undefined
    ? Number(ioElements[TELTONIKA_AVL_IDS.DOUT1].value)
    : null;
  const dout2 = ioElements[TELTONIKA_AVL_IDS.DOUT2] !== undefined
    ? Number(ioElements[TELTONIKA_AVL_IDS.DOUT2].value)
    : null;

  // Engine RPM (AVL ID 85, 2 bytes)
  const engineRpm = ioElements[TELTONIKA_AVL_IDS.ENGINE_RPM] !== undefined
    ? Number(ioElements[TELTONIKA_AVL_IDS.ENGINE_RPM].value)
    : null;

  // Engine Coolant Temperature in °C (AVL ID 115, 1 byte signed)
  let engineTemp: number | null = null;
  if (ioElements[TELTONIKA_AVL_IDS.ENGINE_TEMP] !== undefined) {
    let t = Number(ioElements[TELTONIKA_AVL_IDS.ENGINE_TEMP].value);
    if (t > 127) t = t - 256;
    engineTemp = t;
  }

  // Odometer (AVL ID 16: meters -> km, or AVL ID 87: km)
  let odometerKm: number | null = null;
  if (ioElements[TELTONIKA_AVL_IDS.ODOMETER_METERS] !== undefined) {
    const meters = Number(ioElements[TELTONIKA_AVL_IDS.ODOMETER_METERS].value);
    odometerKm = Math.round((meters / 1000) * 100) / 100;
  } else if (ioElements[TELTONIKA_AVL_IDS.TOTAL_MILEAGE] !== undefined) {
    odometerKm = Number(ioElements[TELTONIKA_AVL_IDS.TOTAL_MILEAGE].value);
  }

  // Fuel Information
  let fuelLevel: number | null = null;
  if (ioElements[TELTONIKA_AVL_IDS.FUEL_LEVEL_PERCENT] !== undefined) {
    fuelLevel = Number(ioElements[TELTONIKA_AVL_IDS.FUEL_LEVEL_PERCENT].value);
  } else if (ioElements[TELTONIKA_AVL_IDS.FUEL_LEVEL_LITERS] !== undefined) {
    fuelLevel = Number(ioElements[TELTONIKA_AVL_IDS.FUEL_LEVEL_LITERS].value);
  }

  const fuelUsedLiters = ioElements[TELTONIKA_AVL_IDS.FUEL_CONSUMED_LITERS] !== undefined
    ? Number(ioElements[TELTONIKA_AVL_IDS.FUEL_CONSUMED_LITERS].value)
    : null;

  // Trip Distance & GNSS Extra
  const tripDistanceMeters = ioElements[TELTONIKA_AVL_IDS.TRIP_DISTANCE_METERS] !== undefined
    ? Number(ioElements[TELTONIKA_AVL_IDS.TRIP_DISTANCE_METERS].value)
    : null;
  const gnssStatus = ioElements[TELTONIKA_AVL_IDS.GNSS_STATUS] !== undefined
    ? Number(ioElements[TELTONIKA_AVL_IDS.GNSS_STATUS].value)
    : null;
  const gnssPdop = ioElements[TELTONIKA_AVL_IDS.GNSS_PDOP] !== undefined
    ? Number(ioElements[TELTONIKA_AVL_IDS.GNSS_PDOP].value)
    : null;
  const gnssHdop = ioElements[TELTONIKA_AVL_IDS.GNSS_HDOP] !== undefined
    ? Number(ioElements[TELTONIKA_AVL_IDS.GNSS_HDOP].value)
    : null;

  // Temperature Sensors & iButton
  const temperature1 = ioElements[TELTONIKA_AVL_IDS.TEMP_1] !== undefined
    ? Math.round((Number(ioElements[TELTONIKA_AVL_IDS.TEMP_1].value) / 10) * 10) / 10
    : null;
  const temperature2 = ioElements[TELTONIKA_AVL_IDS.TEMP_2] !== undefined
    ? Math.round((Number(ioElements[TELTONIKA_AVL_IDS.TEMP_2].value) / 10) * 10) / 10
    : null;
  const ibutton = ioElements[TELTONIKA_AVL_IDS.IBUTTON] !== undefined
    ? ioElements[TELTONIKA_AVL_IDS.IBUTTON].value.toString(16).toUpperCase()
    : null;

  // Configurable Ignition Detection Logic
  // Never assume AVL ID 239 is always the source without verifying configuration!
  const source = ignitionConfig?.source || "DIN1";
  let ignition: "ON" | "OFF" | "Unknown" = "Unknown";

  switch (source) {
    case "DIN1":
      if (din1 !== null) {
        ignition = din1 === 1 ? "ON" : "OFF";
      } else if (ioElements[TELTONIKA_AVL_IDS.IGNITION] !== undefined) {
        // Fallback to AVL ID 239 if DIN1 is not sent in this packet
        ignition = Number(ioElements[TELTONIKA_AVL_IDS.IGNITION].value) === 1 ? "ON" : "OFF";
      }
      break;

    case "VOLTAGE": {
      const highThresh = ignitionConfig?.highVoltageThreshold ?? 13.2;
      const lowThresh = ignitionConfig?.lowVoltageThreshold ?? 12.8;
      if (base.externalVoltage !== null) {
        if (base.externalVoltage >= highThresh) {
          ignition = "ON";
        } else if (base.externalVoltage <= lowThresh) {
          ignition = "OFF";
        } else {
          // Hysteresis between lowThresh and highThresh: preserve previous verified state
          if (previousIgnitionState === "ON" || previousIgnitionState === "OFF") {
            ignition = previousIgnitionState;
          } else {
            ignition = base.externalVoltage >= (highThresh + lowThresh) / 2 ? "ON" : "OFF";
          }
        }
      }
      break;
    }

    case "ACCELEROMETER":
      if (base.movement !== "Unknown") {
        ignition = base.movement === "Moving" ? "ON" : "OFF";
      } else if (ioElements[TELTONIKA_AVL_IDS.IGNITION] !== undefined) {
        ignition = Number(ioElements[TELTONIKA_AVL_IDS.IGNITION].value) === 1 ? "ON" : "OFF";
      }
      break;

    case "RPM": {
      const rpmThresh = ignitionConfig?.rpmThreshold ?? 400;
      if (engineRpm !== null) {
        ignition = engineRpm >= rpmThresh ? "ON" : "OFF";
      }
      break;
    }

    case "AUTO_AVL239":
    default:
      if (ioElements[TELTONIKA_AVL_IDS.IGNITION] !== undefined) {
        ignition = Number(ioElements[TELTONIKA_AVL_IDS.IGNITION].value) === 1 ? "ON" : "OFF";
      } else if (din1 !== null) {
        ignition = din1 === 1 ? "ON" : "OFF";
      }
      break;
  }

  return {
    ...base,
    ignition,
    odometerKm,
    fuelLevel,
    fuelUsedLiters,
    engineRpm,
    engineTemp,
    din1,
    din2,
    din3,
    ain1Mv,
    ain2Mv,
    dout1,
    dout2,
    tripDistanceMeters,
    gnssStatus,
    gnssPdop,
    gnssHdop,
    temperature1,
    temperature2,
    ibutton,
    ignitionSourceUsed: source,
  };
}

/**
 * Resolves model-appropriate telemetry properties extractor.
 */
export function extractModelProperties(
  model: string | undefined,
  ioElements: Record<number, IOElement>,
  ignitionConfig?: DeviceIgnitionConfig,
  previousIgnitionState?: "ON" | "OFF" | "Unknown"
): TelemetryProperties {
  if (model && model.includes("130")) {
    return extractFmc130Properties(ioElements, ignitionConfig, previousIgnitionState);
  }
  // If custom ignitionConfig is provided, apply it via extractFmc130Properties
  if (ignitionConfig && ignitionConfig.source !== "AUTO_AVL239") {
    return extractFmc130Properties(ioElements, ignitionConfig, previousIgnitionState);
  }
  const base = extractFmc920Properties(ioElements);
  return {
    ...base,
    odometerKm: null,
    fuelLevel: null,
    fuelUsedLiters: null,
    engineRpm: null,
    engineTemp: null,
    din1: null,
    din2: null,
    din3: null,
    ain1Mv: null,
    ain2Mv: null,
    dout1: null,
    dout2: null,
    tripDistanceMeters: null,
    gnssStatus: null,
    gnssPdop: null,
    gnssHdop: null,
    temperature1: null,
    temperature2: null,
    ibutton: null,
    ignitionSourceUsed: "AUTO_AVL239",
  };
}

/**
 * Parses a single Teltonika AVL packet from a Buffer slice.
 * Automatically supports Codec 8 (0x08), Codec 8 Extended (0x8E), and Codec 16 (0x10).
 */
export function parseSingleTeltonikaPacket(buf: Buffer, options?: ParsePacketOptions): ParsePacketResult {
  // Minimum possible packet length:
  // 4 (preamble) + 4 (data length) + 1 (codec) + 1 (N1) + 1 (N2) + 4 (crc) = 15 bytes
  if (buf.length < 15) {
    return {
      success: false,
      error: `Buffer too short (${buf.length} bytes, minimum is 15)`,
      errorType: "BUFFER_TOO_SHORT",
      consumedBytes: 0,
    };
  }

  // 1. Verify 4-byte zero preamble (0x00000000)
  const preamble = buf.readUInt32BE(0);
  if (preamble !== 0x00000000) {
    return {
      success: false,
      error: `Invalid preamble: 0x${preamble.toString(16).padStart(8, "0")} (expected 0x00000000)`,
      errorType: "INVALID_PREAMBLE",
      consumedBytes: 1, // Skip 1 byte to attempt re-sync
    };
  }

  // 2. Read 4-byte big-endian data length
  const dataLength = buf.readUInt32BE(4);
  const totalPacketLength = 8 + dataLength + 4; // 8 header (preamble + length) + dataLength + 4 (CRC)

  if (buf.length < totalPacketLength) {
    return {
      success: false,
      error: `Incomplete packet: buffer has ${buf.length} bytes, packet requires ${totalPacketLength} bytes`,
      errorType: "INCOMPLETE_PACKET",
      consumedBytes: 0, // Wait for more data
    };
  }

  // 3. Extract Payload slice (from Codec ID to Record Count N2)
  const payload = buf.subarray(8, 8 + dataLength);
  const rawHex = buf.subarray(0, totalPacketLength).toString("hex");

  // 4. Verify 4-byte CRC-16
  const receivedCrc = buf.readUInt32BE(8 + dataLength);
  if (!verifyTeltonikaCrc(payload, receivedCrc)) {
    const expectedCrc = calculateTeltonikaCrc16(payload);
    return {
      success: false,
      error: `CRC verification failed: received 0x${receivedCrc.toString(16)}, expected 0x${expectedCrc.toString(16)}`,
      errorType: "CRC_MISMATCH",
      consumedBytes: totalPacketLength,
      rawHex,
    };
  }

  // 5. Inspect Codec ID (Supports Codec 8, Codec 8 Extended, Codec 16)
  let offset = 0;
  const codecId = payload.readUInt8(offset);
  offset += 1;

  if (
    codecId !== TELTONIKA_CODECS.CODEC_8 &&
    codecId !== TELTONIKA_CODECS.CODEC_8_EXTENDED &&
    codecId !== TELTONIKA_CODECS.CODEC_16
  ) {
    return {
      success: false,
      error: `Unsupported Teltonika codec: 0x${codecId.toString(16)}`,
      errorType: "UNSUPPORTED_CODEC",
      consumedBytes: totalPacketLength,
      rawHex,
    };
  }

  const isExtended = codecId === TELTONIKA_CODECS.CODEC_8_EXTENDED || codecId === TELTONIKA_CODECS.CODEC_16;
  const codecName =
    codecId === TELTONIKA_CODECS.CODEC_16
      ? "Codec 16"
      : codecId === TELTONIKA_CODECS.CODEC_8_EXTENDED
      ? "Codec 8 Extended"
      : "Codec 8";

  // 6. Record Count N1
  const recordCountN1 = payload.readUInt8(offset);
  offset += 1;

  if (recordCountN1 <= 0) {
    return {
      success: false,
      error: `Invalid record count N1: ${recordCountN1}`,
      errorType: "INVALID_RECORD_COUNT",
      consumedBytes: totalPacketLength,
      rawHex,
    };
  }

  // 7. Parse AVL Records
  const records: AvlRecord[] = [];

  for (let r = 0; r < recordCountN1; r++) {
    if (offset + 24 > payload.length) {
      return {
        success: false,
        error: `Truncated AVL record #${r + 1} at offset ${offset}`,
        errorType: "TRUNCATED_RECORD",
        consumedBytes: totalPacketLength,
        rawHex,
      };
    }

    // Timestamp (8 bytes uint64 BE)
    const timestampBig = payload.readBigUInt64BE(offset);
    offset += 8;
    const timestampMs = Number(timestampBig);
    const timestamp = new Date(timestampMs);

    // Priority (1 byte)
    const priority = payload.readUInt8(offset);
    offset += 1;

    // GPS Element (15 bytes)
    const rawLon = payload.readInt32BE(offset);
    offset += 4;
    const rawLat = payload.readInt32BE(offset);
    offset += 4;
    const altitude = payload.readInt16BE(offset);
    offset += 2;
    const angle = payload.readUInt16BE(offset);
    offset += 2;
    const satellites = payload.readUInt8(offset);
    offset += 1;
    const speed = payload.readUInt16BE(offset);
    offset += 2;

    const gps: GpsData = {
      longitude: rawLon / 10000000,
      latitude: rawLat / 10000000,
      altitude,
      angle,
      satellites,
      speed,
    };

    // I/O Elements
    const ioElements: Record<number, IOElement> = {};

    let eventIoId = 0;
    let totalIoCount = 0;

    if (isExtended) {
      // Codec 8 Extended (0x8E) and Codec 16 (0x10) use 2-byte IDs and 2-byte counts
      eventIoId = payload.readUInt16BE(offset);
      offset += 2;
      totalIoCount = payload.readUInt16BE(offset);
      offset += 2;

      // 1-byte elements
      const count1 = payload.readUInt16BE(offset);
      offset += 2;
      for (let i = 0; i < count1; i++) {
        const id = payload.readUInt16BE(offset);
        offset += 2;
        const val = payload.readUInt8(offset);
        offset += 1;
        ioElements[id] = { id, length: 1, value: val };
      }

      // 2-byte elements
      const count2 = payload.readUInt16BE(offset);
      offset += 2;
      for (let i = 0; i < count2; i++) {
        const id = payload.readUInt16BE(offset);
        offset += 2;
        const val = payload.readUInt16BE(offset);
        offset += 2;
        ioElements[id] = { id, length: 2, value: val };
      }

      // 4-byte elements
      const count4 = payload.readUInt16BE(offset);
      offset += 2;
      for (let i = 0; i < count4; i++) {
        const id = payload.readUInt16BE(offset);
        offset += 2;
        const val = payload.readUInt32BE(offset);
        offset += 4;
        ioElements[id] = { id, length: 4, value: val };
      }

      // 8-byte elements
      const count8 = payload.readUInt16BE(offset);
      offset += 2;
      for (let i = 0; i < count8; i++) {
        const id = payload.readUInt16BE(offset);
        offset += 2;
        const val = payload.readBigUInt64BE(offset);
        offset += 8;
        ioElements[id] = { id, length: 8, value: val };
      }

      // X-byte (variable length) elements
      // If remaining payload before N2 has at least 2 bytes for variable element count
      if (offset + 2 <= payload.length - 1) {
        const countX = payload.readUInt16BE(offset);
        offset += 2;
        for (let i = 0; i < countX; i++) {
          const id = payload.readUInt16BE(offset);
          offset += 2;
          const len = payload.readUInt16BE(offset);
          offset += 2;
          const rawBuffer = payload.subarray(offset, offset + len);
          offset += len;
          ioElements[id] = { id, length: len, value: 0, rawBuffer };
        }
      }
    } else {
      // Standard Codec 8 (0x08)
      eventIoId = payload.readUInt8(offset);
      offset += 1;
      totalIoCount = payload.readUInt8(offset);
      offset += 1;

      // 1-byte elements
      const count1 = payload.readUInt8(offset);
      offset += 1;
      for (let i = 0; i < count1; i++) {
        const id = payload.readUInt8(offset);
        offset += 1;
        const val = payload.readUInt8(offset);
        offset += 1;
        ioElements[id] = { id, length: 1, value: val };
      }

      // 2-byte elements
      const count2 = payload.readUInt8(offset);
      offset += 1;
      for (let i = 0; i < count2; i++) {
        const id = payload.readUInt8(offset);
        offset += 1;
        const val = payload.readUInt16BE(offset);
        offset += 2;
        ioElements[id] = { id, length: 2, value: val };
      }

      // 4-byte elements
      const count4 = payload.readUInt8(offset);
      offset += 1;
      for (let i = 0; i < count4; i++) {
        const id = payload.readUInt8(offset);
        offset += 1;
        const val = payload.readUInt32BE(offset);
        offset += 4;
        ioElements[id] = { id, length: 4, value: val };
      }

      // 8-byte elements
      const count8 = payload.readUInt8(offset);
      offset += 1;
      for (let i = 0; i < count8; i++) {
        const id = payload.readUInt8(offset);
        offset += 1;
        const val = payload.readBigUInt64BE(offset);
        offset += 8;
        ioElements[id] = { id, length: 8, value: val };
      }
    }

    // Extract telemetry properties according to device model & ignition config
    const properties = extractModelProperties(
      options?.model,
      ioElements,
      options?.ignitionConfig,
      options?.previousIgnitionState
    );

    records.push({
      timestamp,
      timestampMs,
      priority,
      gps,
      eventIoId,
      totalIoCount,
      ioElements,
      properties,
    });
  }

  // 8. Record Count N2
  if (offset >= payload.length) {
    return {
      success: false,
      error: `Missing Record Count N2 at end of payload`,
      errorType: "MISSING_RECORD_COUNT_N2",
      consumedBytes: totalPacketLength,
      rawHex,
    };
  }

  const recordCountN2 = payload.readUInt8(offset);
  offset += 1;

  if (recordCountN1 !== recordCountN2) {
    return {
      success: false,
      error: `Record count mismatch: N1=${recordCountN1}, N2=${recordCountN2}`,
      errorType: "RECORD_COUNT_MISMATCH",
      consumedBytes: totalPacketLength,
      rawHex,
    };
  }

  const packet: ParsedAvlPacket = {
    codecId,
    codecName,
    recordCount: recordCountN1,
    records,
    crc: receivedCrc,
    rawPayloadLength: dataLength,
    rawHex,
  };

  return {
    success: true,
    packet,
    consumedBytes: totalPacketLength,
  };
}

/**
 * Handles TCP streaming data chunks, extracting any complete packets.
 * Returns parsed packets and unconsumed buffer bytes.
 */
export function extractPacketsFromStream(
  streamBuffer: Buffer,
  options?: ParsePacketOptions
): {
  packets: ParsedAvlPacket[];
  errors: { error: string; errorType: string; rawHex?: string }[];
  remainingBuffer: Buffer;
} {
  const packets: ParsedAvlPacket[] = [];
  const errors: { error: string; errorType: string; rawHex?: string }[] = [];
  let current = streamBuffer;

  while (current.length >= 15) {
    const result = parseSingleTeltonikaPacket(current, options);
    if (result.success) {
      packets.push(result.packet);
      current = current.subarray(result.consumedBytes);
    } else {
      if (result.consumedBytes === 0) {
        // Wait for more TCP data
        break;
      }
      errors.push({
        error: result.error,
        errorType: result.errorType,
        rawHex: result.rawHex,
      });
      current = current.subarray(result.consumedBytes);
    }
  }

  return {
    packets,
    errors,
    remainingBuffer: current,
  };
}

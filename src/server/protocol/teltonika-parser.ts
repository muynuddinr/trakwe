import { calculateTeltonikaCrc16, verifyTeltonikaCrc } from "./crc16";
import {
  AvlRecord,
  Fmc920TelemetryProperties,
  GpsData,
  IOElement,
  ParsedAvlPacket,
  ParsePacketResult,
  TELTONIKA_CODECS,
} from "./teltonika-types";

/**
 * Extracts FMC920 essential I/O properties from parsed I/O map.
 * Missing properties are left undefined/null, not assumed as 0.
 */
export function extractFmc920Properties(ioElements: Record<number, IOElement>): Fmc920TelemetryProperties {
  // AVL ID 239: Ignition (1 byte, 0 = OFF, 1 = ON)
  let ignition: "ON" | "OFF" | "Unknown" = "Unknown";
  if (ioElements[239] !== undefined) {
    const raw = Number(ioElements[239].value);
    ignition = raw === 1 ? "ON" : "OFF";
  }

  // AVL ID 240: Movement (1 byte, 0 = Stationary, 1 = Moving)
  let movement: "Moving" | "Stationary" | "Unknown" = "Unknown";
  if (ioElements[240] !== undefined) {
    const raw = Number(ioElements[240].value);
    movement = raw === 1 ? "Moving" : "Stationary";
  }

  // AVL ID 66: External Voltage in mV (2 bytes) -> Volts
  let externalVoltage: number | null = null;
  if (ioElements[66] !== undefined) {
    const mv = Number(ioElements[66].value);
    // Convert mV to Volts with 2 decimal precision
    externalVoltage = Math.round((mv / 1000) * 100) / 100;
  }

  // AVL ID 67: Internal Battery Voltage in mV (2 bytes) -> Volts
  let internalBatteryVoltage: number | null = null;
  if (ioElements[67] !== undefined) {
    const mv = Number(ioElements[67].value);
    internalBatteryVoltage = Math.round((mv / 1000) * 100) / 100;
  }

  // AVL ID 21: GSM Signal (1 byte, 0 - 5 bars)
  let gsmSignal: number | null = null;
  if (ioElements[21] !== undefined) {
    gsmSignal = Math.min(5, Math.max(0, Number(ioElements[21].value)));
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
 * Parses a single Teltonika AVL packet from a Buffer slice.
 */
export function parseSingleTeltonikaPacket(buf: Buffer): ParsePacketResult {
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

  // 5. Inspect Codec ID
  let offset = 0;
  const codecId = payload.readUInt8(offset);
  offset += 1;

  if (codecId !== TELTONIKA_CODECS.CODEC_8 && codecId !== TELTONIKA_CODECS.CODEC_8_EXTENDED) {
    return {
      success: false,
      error: `Unsupported Teltonika codec: 0x${codecId.toString(16)}`,
      errorType: "UNSUPPORTED_CODEC",
      consumedBytes: totalPacketLength,
      rawHex,
    };
  }

  const isExtended = codecId === TELTONIKA_CODECS.CODEC_8_EXTENDED;
  const codecName = isExtended ? "Codec 8 Extended" : "Codec 8";

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
      const countX = payload.readUInt16BE(offset);
      offset += 2;
      for (let i = 0; i < countX; i++) {
        const id = payload.readUInt16BE(offset);
        offset += 2;
        const len = payload.readUInt16BE(offset);
        offset += 2;
        // In real cases len bytes payload
        offset += len;
        ioElements[id] = { id, length: len, value: 0 };
      }
    } else {
      // Standard Codec 8
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

    const properties = extractFmc920Properties(ioElements);

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
export function extractPacketsFromStream(streamBuffer: Buffer): {
  packets: ParsedAvlPacket[];
  errors: { error: string; errorType: string; rawHex?: string }[];
  remainingBuffer: Buffer;
} {
  const packets: ParsedAvlPacket[] = [];
  const errors: { error: string; errorType: string; rawHex?: string }[] = [];
  let current = streamBuffer;

  while (current.length >= 15) {
    const result = parseSingleTeltonikaPacket(current);
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

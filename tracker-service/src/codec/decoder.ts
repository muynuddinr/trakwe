import {
  DecodedAvlPacket,
  NormalizedTelemetry,
  TeltonikaAvlRecord
} from '../types';
import { verifyTeltonikaCrc, calculateTeltonikaCrc16 } from './crc16';
import { Codec8Decoder } from './codec8';
import { Codec8ExtDecoder } from './codec8ext';

export interface PacketParseResult {
  success: boolean;
  bytesConsumed: number;
  decodedPacket?: DecodedAvlPacket;
  ackBuffer?: Buffer;
  error?: string;
}

// UAE geographic bounding box for telemetry tagging (approximate bounds)
export function isWithinUaeBounds(lat: number, lng: number): boolean {
  return lat >= 22.0 && lat <= 26.6 && lng >= 51.0 && lng <= 56.8;
}

export class TeltonikaDecoder {
  /**
   * Maximum allowed AVL packet size in bytes to prevent DoS / memory exhaustion
   */
  public static readonly MAX_PACKET_SIZE = 65536;

  /**
   * Generates the mandatory 4-byte Big-Endian ACK response.
   * e.g., 5 processed records -> Buffer <00 00 00 05>
   */
  public static createAck(recordCount: number): Buffer {
    const ack = Buffer.alloc(4);
    ack.writeUInt32BE(recordCount, 0);
    return ack;
  }

  /**
   * Attempts to parse a Teltonika TCP packet from a buffer.
   * Handles stream framing:
   * [4B Preamble (0x00000000)] [4B Data Length (BE)] [Payload (DataLength bytes)] [4B CRC (BE)]
   */
  public static parsePacket(buffer: Buffer): PacketParseResult {
    // We need at least 12 bytes for header (8) + minimal payload (2) + CRC (4)
    if (buffer.length < 12) {
      return { success: false, bytesConsumed: 0 }; // Need more data from TCP stream
    }

    // 1. Validate Preamble (4 bytes of 0x00)
    const preamble = buffer.readUInt32BE(0);
    if (preamble !== 0) {
      // Stream is misaligned or corrupt
      return {
        success: false,
        bytesConsumed: 1, // Advance 1 byte to seek next preamble
        error: `Invalid preamble: expected 0x00000000, received 0x${preamble.toString(16)}`
      };
    }

    // 2. Read Data Length (4 bytes BE)
    const dataLength = buffer.readUInt32BE(4);
    if (dataLength <= 0 || dataLength > TeltonikaDecoder.MAX_PACKET_SIZE) {
      return {
        success: false,
        bytesConsumed: 4,
        error: `Invalid data length: ${dataLength} bytes (max ${TeltonikaDecoder.MAX_PACKET_SIZE})`
      };
    }

    const totalPacketSize = 4 + 4 + dataLength + 4; // Preamble + Length + Payload + CRC
    if (buffer.length < totalPacketSize) {
      // Partial message received; wait for remainder of TCP stream
      return { success: false, bytesConsumed: 0 };
    }

    // Extract payload and CRC
    const payload = buffer.subarray(8, 8 + dataLength);
    const packetCrc = buffer.readUInt32BE(8 + dataLength);

    // 3. CRC-16 Validation (Polynomial 0xA001)
    if (!verifyTeltonikaCrc(payload, packetCrc)) {
      const expectedCrc = calculateTeltonikaCrc16(payload);
      return {
        success: false,
        bytesConsumed: totalPacketSize,
        error: `CRC-16 mismatch: packet CRC=0x${packetCrc.toString(16)}, calculated CRC=0x${expectedCrc.toString(16)}`
      };
    }

    // 4. Codec Dispatch
    const codecId = payload.readUInt8(0);
    let decodedPacket: DecodedAvlPacket;

    try {
      if (codecId === 0x08) {
        decodedPacket = Codec8Decoder.decodePayload(payload);
      } else if (codecId === 0x8E) {
        decodedPacket = Codec8ExtDecoder.decodePayload(payload);
      } else {
        return {
          success: false,
          bytesConsumed: totalPacketSize,
          error: `Unsupported Teltonika codec ID: 0x${codecId.toString(16)}. Supported: 0x08, 0x8E`
        };
      }
    } catch (err: any) {
      return {
        success: false,
        bytesConsumed: totalPacketSize,
        error: `Protocol decode failure: ${err?.message || String(err)}`
      };
    }

    // 5. Generate 4-byte Big-Endian ACK for successfully processed records
    const ackBuffer = TeltonikaDecoder.createAck(decodedPacket.recordCount);

    return {
      success: true,
      bytesConsumed: totalPacketSize,
      decodedPacket,
      ackBuffer
    };
  }

  /**
   * Normalizes an AVL record into the unified Trackwe telemetry model
   */
  public static normalizeRecord(
    record: TeltonikaAvlRecord,
    imei: string,
    vehicleId: string
  ): NormalizedTelemetry {
    const rawIo: Record<number, number | string> = {};
    for (const [k, v] of Object.entries(record.io.elements)) {
      rawIo[Number(k)] = typeof v === 'bigint' ? v.toString() : v;
    }

    // Essential FMC920 I/O Element IDs:
    // 239: Ignition (1 byte: 0/1)
    // 240: Movement (1 byte: 0/1)
    // 66:  External Voltage (2 bytes mV -> Volts)
    // 67:  Internal Battery (2 bytes mV -> Volts)
    // 21:  GSM Signal (1 byte: 0-5)
    const rawIgnition = record.io.elements[239];
    const rawMovement = record.io.elements[240];
    const rawExtVoltage = record.io.elements[66];
    const rawIntBattery = record.io.elements[67];
    const rawGsm = record.io.elements[21];

    const ignition = rawIgnition !== undefined ? Number(rawIgnition) === 1 : false;
    const movement = rawMovement !== undefined ? Number(rawMovement) === 1 : (record.gps.speed > 3);
    const externalVoltage = rawExtVoltage !== undefined
      ? Number(rawExtVoltage) / 1000.0
      : 12.6; // Default standard 12V automotive battery
    const internalBattery = rawIntBattery !== undefined
      ? Number(rawIntBattery) / 1000.0
      : 3.8;  // Default 3.7-4.2V Li-ion backup
    const gsmSignal = rawGsm !== undefined ? Math.min(5, Math.max(0, Number(rawGsm))) : 4;

    // Determine status
    let status: 'Moving' | 'Idle' | 'Offline' = 'Offline';
    if (record.gps.speed > 3 || movement) {
      status = 'Moving';
    } else if (ignition || record.gps.speed <= 3) {
      status = 'Idle';
    }

    const isUae = isWithinUaeBounds(record.gps.latitude, record.gps.longitude);

    return {
      imei,
      vehicleId,
      deviceTimestamp: record.timestamp.toISOString(),
      serverTimestamp: new Date().toISOString(),
      lat: record.gps.latitude,
      lng: record.gps.longitude,
      speed: Math.round(record.gps.speed),
      heading: record.gps.angle,
      altitude: record.gps.altitude,
      satellites: record.gps.satellites,
      ignition,
      movement,
      externalVoltage: Number(externalVoltage.toFixed(2)),
      internalBattery: Number(internalBattery.toFixed(2)),
      gsmSignal,
      rawIo,
      status,
      isLiveHardware: true,
      isUaeCorridor: isUae,
      hasGpsFix: record.gps.isValid
    };
  }
}

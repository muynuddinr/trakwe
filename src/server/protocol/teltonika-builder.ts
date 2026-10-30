import { calculateTeltonikaCrc16 } from "./crc16";
import { TELTONIKA_AVL_IDS, TELTONIKA_CODECS } from "./teltonika-types";

export interface SyntheticAvlRecordInput {
  timestamp?: Date | number;
  priority?: number;
  latitude: number;
  longitude: number;
  altitude?: number;
  angle?: number;
  satellites?: number;
  speed?: number;
  ignition?: 0 | 1; // AVL ID 239
  movement?: 0 | 1; // AVL ID 240
  externalVoltageMv?: number; // AVL ID 66, e.g. 12400 for 12.4V
  internalBatteryVoltageMv?: number; // AVL ID 67, e.g. 3800 for 3.8V
  gsmSignal?: number; // AVL ID 21, 0-5
  // Extended FMC130 fields
  din1?: 0 | 1; // AVL ID 1
  din2?: 0 | 1; // AVL ID 2
  din3?: 0 | 1; // AVL ID 3
  ain1Mv?: number; // AVL ID 9
  ain2Mv?: number; // AVL ID 10
  odometerMeters?: number; // AVL ID 16
  odometerKm?: number; // Convenience: sets AVL ID 16 in meters
  fuelPercent?: number; // AVL ID 83
  fuelLiters?: number; // AVL ID 89
  fuelConsumedLiters?: number; // AVL ID 84
  engineRpm?: number; // AVL ID 85
  engineTemp?: number; // AVL ID 115
  tripDistanceMeters?: number; // AVL ID 199
  customIo1?: Array<[number, number]>; // [id, 1-byte value]
  customIo2?: Array<[number, number]>; // [id, 2-byte value]
  customIo4?: Array<[number, number]>; // [id, 4-byte value]
  customIo8?: Array<[number, bigint]>; // [id, 8-byte value]
}

/**
 * Builds a 2-byte IMEI length + ASCII IMEI buffer for Phase 1 handshake.
 */
export function buildImeiHandshakeFrame(imei: string): Buffer {
  const imeiBuffer = Buffer.from(imei, "ascii");
  const lengthBuffer = Buffer.alloc(2);
  lengthBuffer.writeUInt16BE(imeiBuffer.length, 0);
  return Buffer.concat([lengthBuffer, imeiBuffer]);
}

/**
 * Helper to collect and partition IO elements from SyntheticAvlRecordInput
 */
function partitionIoElements(rec: SyntheticAvlRecordInput) {
  const io1: Array<[number, number]> = [];
  const io2: Array<[number, number]> = [];
  const io4: Array<[number, number]> = [];
  const io8: Array<[number, bigint]> = [];

  // 1-byte elements
  if (rec.din1 !== undefined) io1.push([TELTONIKA_AVL_IDS.DIN1, rec.din1]);
  if (rec.din2 !== undefined) io1.push([TELTONIKA_AVL_IDS.DIN2, rec.din2]);
  if (rec.din3 !== undefined) io1.push([TELTONIKA_AVL_IDS.DIN3, rec.din3]);
  if (rec.gsmSignal !== undefined) io1.push([TELTONIKA_AVL_IDS.GSM_SIGNAL, rec.gsmSignal]);
  if (rec.fuelPercent !== undefined) io1.push([TELTONIKA_AVL_IDS.FUEL_LEVEL_PERCENT, rec.fuelPercent]);
  if (rec.engineTemp !== undefined) {
    const unsigned = rec.engineTemp < 0 ? rec.engineTemp + 256 : rec.engineTemp;
    io1.push([TELTONIKA_AVL_IDS.ENGINE_TEMP, unsigned]);
  }
  if (rec.ignition !== undefined) io1.push([TELTONIKA_AVL_IDS.IGNITION, rec.ignition]);
  if (rec.movement !== undefined) io1.push([TELTONIKA_AVL_IDS.MOVEMENT, rec.movement]);
  if (rec.customIo1) io1.push(...rec.customIo1);

  // 2-byte elements
  if (rec.externalVoltageMv !== undefined) io2.push([TELTONIKA_AVL_IDS.EXTERNAL_VOLTAGE_MV, rec.externalVoltageMv]);
  if (rec.internalBatteryVoltageMv !== undefined) io2.push([TELTONIKA_AVL_IDS.BATTERY_VOLTAGE_MV, rec.internalBatteryVoltageMv]);
  if (rec.ain1Mv !== undefined) io2.push([TELTONIKA_AVL_IDS.AIN1, rec.ain1Mv]);
  if (rec.ain2Mv !== undefined) io2.push([TELTONIKA_AVL_IDS.AIN2, rec.ain2Mv]);
  if (rec.engineRpm !== undefined) io2.push([TELTONIKA_AVL_IDS.ENGINE_RPM, rec.engineRpm]);
  if (rec.fuelLiters !== undefined) io2.push([TELTONIKA_AVL_IDS.FUEL_LEVEL_LITERS, rec.fuelLiters]);
  if (rec.customIo2) io2.push(...rec.customIo2);

  // 4-byte elements
  if (rec.odometerMeters !== undefined) {
    io4.push([TELTONIKA_AVL_IDS.ODOMETER_METERS, rec.odometerMeters]);
  } else if (rec.odometerKm !== undefined) {
    io4.push([TELTONIKA_AVL_IDS.ODOMETER_METERS, Math.round(rec.odometerKm * 1000)]);
  }
  if (rec.fuelConsumedLiters !== undefined) io4.push([TELTONIKA_AVL_IDS.FUEL_CONSUMED_LITERS, rec.fuelConsumedLiters]);
  if (rec.tripDistanceMeters !== undefined) io4.push([TELTONIKA_AVL_IDS.TRIP_DISTANCE_METERS, rec.tripDistanceMeters]);
  if (rec.customIo4) io4.push(...rec.customIo4);

  // 8-byte elements
  if (rec.customIo8) io8.push(...rec.customIo8);

  return { io1, io2, io4, io8 };
}

/**
 * Builds a syntactically valid Teltonika Codec 8 (0x08) packet.
 */
export function buildCodec8Packet(records: SyntheticAvlRecordInput[]): Buffer {
  if (records.length === 0 || records.length > 255) {
    throw new Error("Codec 8 requires 1-255 records");
  }

  const payloadChunks: Buffer[] = [];

  // Codec ID (1 byte)
  const codecIdBuf = Buffer.alloc(1);
  codecIdBuf.writeUInt8(TELTONIKA_CODECS.CODEC_8, 0);
  payloadChunks.push(codecIdBuf);

  // Record Count N1 (1 byte)
  const countN1Buf = Buffer.alloc(1);
  countN1Buf.writeUInt8(records.length, 0);
  payloadChunks.push(countN1Buf);

  // Encode records
  for (const rec of records) {
    const recBuf = Buffer.alloc(24);
    const tsMs = rec.timestamp instanceof Date ? rec.timestamp.getTime() : (rec.timestamp ?? Date.now());
    recBuf.writeBigUInt64BE(BigInt(tsMs), 0);
    recBuf.writeUInt8(rec.priority ?? 0, 8);

    recBuf.writeInt32BE(Math.round(rec.longitude * 10000000), 9);
    recBuf.writeInt32BE(Math.round(rec.latitude * 10000000), 13);
    recBuf.writeInt16BE(rec.altitude ?? 15, 17);
    recBuf.writeUInt16BE(rec.angle ?? 90, 19);
    recBuf.writeUInt8(rec.satellites ?? 12, 21);
    recBuf.writeUInt16BE(rec.speed ?? 45, 22);
    payloadChunks.push(recBuf);

    const { io1, io2, io4, io8 } = partitionIoElements(rec);
    const totalIo = io1.length + io2.length + io4.length + io8.length;

    const headerBuf = Buffer.alloc(2);
    headerBuf.writeUInt8(0, 0); // Event IO ID
    headerBuf.writeUInt8(totalIo, 1); // Total IO count
    payloadChunks.push(headerBuf);

    // 1-byte elements
    const count1Buf = Buffer.alloc(1 + io1.length * 2);
    count1Buf.writeUInt8(io1.length, 0);
    let o1 = 1;
    for (const [id, val] of io1) {
      count1Buf.writeUInt8(id, o1);
      count1Buf.writeUInt8(val, o1 + 1);
      o1 += 2;
    }
    payloadChunks.push(count1Buf);

    // 2-byte elements
    const count2Buf = Buffer.alloc(1 + io2.length * 3);
    count2Buf.writeUInt8(io2.length, 0);
    let o2 = 1;
    for (const [id, val] of io2) {
      count2Buf.writeUInt8(id, o2);
      count2Buf.writeUInt16BE(val, o2 + 1);
      o2 += 3;
    }
    payloadChunks.push(count2Buf);

    // 4-byte elements
    const count4Buf = Buffer.alloc(1 + io4.length * 5);
    count4Buf.writeUInt8(io4.length, 0);
    let o4 = 1;
    for (const [id, val] of io4) {
      count4Buf.writeUInt8(id, o4);
      count4Buf.writeUInt32BE(val, o4 + 1);
      o4 += 5;
    }
    payloadChunks.push(count4Buf);

    // 8-byte elements
    const count8Buf = Buffer.alloc(1 + io8.length * 9);
    count8Buf.writeUInt8(io8.length, 0);
    let o8 = 1;
    for (const [id, val] of io8) {
      count8Buf.writeUInt8(id, o8);
      count8Buf.writeBigUInt64BE(val, o8 + 1);
      o8 += 9;
    }
    payloadChunks.push(count8Buf);
  }

  // Record Count N2 (1 byte)
  const countN2Buf = Buffer.alloc(1);
  countN2Buf.writeUInt8(records.length, 0);
  payloadChunks.push(countN2Buf);

  // Combine payload
  const payload = Buffer.concat(payloadChunks);
  const crc16 = calculateTeltonikaCrc16(payload);

  const header = Buffer.alloc(8);
  header.writeUInt32BE(0x00000000, 0);
  header.writeUInt32BE(payload.length, 4);

  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc16, 0);

  return Buffer.concat([header, payload, crcBuf]);
}

/**
 * Builds a syntactically valid Teltonika Codec 8 Extended (0x8E) packet.
 */
export function buildCodec8ExtendedPacket(records: SyntheticAvlRecordInput[]): Buffer {
  return buildExtendedOrCodec16Packet(records, TELTONIKA_CODECS.CODEC_8_EXTENDED);
}

/**
 * Builds a syntactically valid Teltonika Codec 16 (0x10) packet.
 */
export function buildCodec16Packet(records: SyntheticAvlRecordInput[]): Buffer {
  return buildExtendedOrCodec16Packet(records, TELTONIKA_CODECS.CODEC_16);
}

function buildExtendedOrCodec16Packet(records: SyntheticAvlRecordInput[], codecId: number): Buffer {
  if (records.length === 0 || records.length > 255) {
    throw new Error("Extended codec requires 1-255 records");
  }

  const payloadChunks: Buffer[] = [];

  // Codec ID (1 byte)
  const codecIdBuf = Buffer.alloc(1);
  codecIdBuf.writeUInt8(codecId, 0);
  payloadChunks.push(codecIdBuf);

  // Record Count N1 (1 byte)
  const countN1Buf = Buffer.alloc(1);
  countN1Buf.writeUInt8(records.length, 0);
  payloadChunks.push(countN1Buf);

  for (const rec of records) {
    const recBuf = Buffer.alloc(24);
    const tsMs = rec.timestamp instanceof Date ? rec.timestamp.getTime() : (rec.timestamp ?? Date.now());
    recBuf.writeBigUInt64BE(BigInt(tsMs), 0);
    recBuf.writeUInt8(rec.priority ?? 0, 8);

    recBuf.writeInt32BE(Math.round(rec.longitude * 10000000), 9);
    recBuf.writeInt32BE(Math.round(rec.latitude * 10000000), 13);
    recBuf.writeInt16BE(rec.altitude ?? 15, 17);
    recBuf.writeUInt16BE(rec.angle ?? 90, 19);
    recBuf.writeUInt8(rec.satellites ?? 12, 21);
    recBuf.writeUInt16BE(rec.speed ?? 45, 22);
    payloadChunks.push(recBuf);

    const { io1, io2, io4, io8 } = partitionIoElements(rec);
    const totalIo = io1.length + io2.length + io4.length + io8.length;

    const headerBuf = Buffer.alloc(4);
    headerBuf.writeUInt16BE(0, 0); // Event IO ID (2 bytes)
    headerBuf.writeUInt16BE(totalIo, 2); // Total IO count (2 bytes)
    payloadChunks.push(headerBuf);

    // 1-byte elements (count 2B, id 2B, val 1B)
    const count1Buf = Buffer.alloc(2 + io1.length * 3);
    count1Buf.writeUInt16BE(io1.length, 0);
    let o1 = 2;
    for (const [id, val] of io1) {
      count1Buf.writeUInt16BE(id, o1);
      count1Buf.writeUInt8(val, o1 + 2);
      o1 += 3;
    }
    payloadChunks.push(count1Buf);

    // 2-byte elements (count 2B, id 2B, val 2B)
    const count2Buf = Buffer.alloc(2 + io2.length * 4);
    count2Buf.writeUInt16BE(io2.length, 0);
    let o2 = 2;
    for (const [id, val] of io2) {
      count2Buf.writeUInt16BE(id, o2);
      count2Buf.writeUInt16BE(val, o2 + 2);
      o2 += 4;
    }
    payloadChunks.push(count2Buf);

    // 4-byte elements (count 2B, id 2B, val 4B)
    const count4Buf = Buffer.alloc(2 + io4.length * 6);
    count4Buf.writeUInt16BE(io4.length, 0);
    let o4 = 2;
    for (const [id, val] of io4) {
      count4Buf.writeUInt16BE(id, o4);
      count4Buf.writeUInt32BE(val, o4 + 2);
      o4 += 6;
    }
    payloadChunks.push(count4Buf);

    // 8-byte elements (count 2B, id 2B, val 8B)
    const count8Buf = Buffer.alloc(2 + io8.length * 10);
    count8Buf.writeUInt16BE(io8.length, 0);
    let o8 = 2;
    for (const [id, val] of io8) {
      count8Buf.writeUInt16BE(id, o8);
      count8Buf.writeBigUInt64BE(val, o8 + 2);
      o8 += 10;
    }
    payloadChunks.push(count8Buf);

    // X-byte elements count (2B) = 0
    const countXBuf = Buffer.alloc(2);
    countXBuf.writeUInt16BE(0, 0);
    payloadChunks.push(countXBuf);
  }

  // Record Count N2 (1 byte)
  const countN2Buf = Buffer.alloc(1);
  countN2Buf.writeUInt8(records.length, 0);
  payloadChunks.push(countN2Buf);

  const payload = Buffer.concat(payloadChunks);
  const crc16 = calculateTeltonikaCrc16(payload);

  const header = Buffer.alloc(8);
  header.writeUInt32BE(0x00000000, 0);
  header.writeUInt32BE(payload.length, 4);

  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc16, 0);

  return Buffer.concat([header, payload, crcBuf]);
}

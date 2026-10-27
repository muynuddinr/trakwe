import { calculateTeltonikaCrc16 } from "./crc16";
import { TELTONIKA_CODECS } from "./teltonika-types";

export interface SyntheticAvlRecordInput {
  timestamp?: Date | number;
  priority?: number;
  latitude: number;
  longitude: number;
  altitude?: number;
  angle?: number;
  satellites?: number;
  speed?: number;
  ignition?: 0 | 1;
  movement?: 0 | 1;
  externalVoltageMv?: number; // e.g. 12400 for 12.4V
  internalBatteryVoltageMv?: number; // e.g. 3800 for 3.8V
  gsmSignal?: number; // 0-5
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
 * Builds a syntactically valid Teltonika Codec 8 packet.
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
    const recBuf = Buffer.alloc(24); // 8 timestamp + 1 priority + 15 GPS = 24 bytes
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

    // IO Elements (Event IO ID = 0, Total IO Count)
    const io1: Array<[number, number]> = [];
    const io2: Array<[number, number]> = [];

    if (rec.ignition !== undefined) io1.push([239, rec.ignition]);
    if (rec.movement !== undefined) io1.push([240, rec.movement]);
    if (rec.gsmSignal !== undefined) io1.push([21, rec.gsmSignal]);

    if (rec.externalVoltageMv !== undefined) io2.push([66, rec.externalVoltageMv]);
    if (rec.internalBatteryVoltageMv !== undefined) io2.push([67, rec.internalBatteryVoltageMv]);

    const totalIo = io1.length + io2.length;
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

    // 4-byte elements (0)
    const count4Buf = Buffer.alloc(1);
    count4Buf.writeUInt8(0, 0);
    payloadChunks.push(count4Buf);

    // 8-byte elements (0)
    const count8Buf = Buffer.alloc(1);
    count8Buf.writeUInt8(0, 0);
    payloadChunks.push(count8Buf);
  }

  // Record Count N2 (1 byte)
  const countN2Buf = Buffer.alloc(1);
  countN2Buf.writeUInt8(records.length, 0);
  payloadChunks.push(countN2Buf);

  // Combine payload
  const payload = Buffer.concat(payloadChunks);

  // Calculate CRC-16 over payload
  const crc16 = calculateTeltonikaCrc16(payload);

  // Build full packet: Preamble (4) + Data Length (4) + Payload + CRC (4)
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
  const payloadChunks: Buffer[] = [];

  // Codec ID (1 byte) -> 0x8E
  const codecIdBuf = Buffer.alloc(1);
  codecIdBuf.writeUInt8(TELTONIKA_CODECS.CODEC_8_EXTENDED, 0);
  payloadChunks.push(codecIdBuf);

  // Record Count N1 (1 byte)
  const countN1Buf = Buffer.alloc(1);
  countN1Buf.writeUInt8(records.length, 0);
  payloadChunks.push(countN1Buf);

  // Encode records
  for (const rec of records) {
    const recBuf = Buffer.alloc(24); // 8 timestamp + 1 priority + 15 GPS = 24 bytes
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

    // In Codec 8 Extended, IO counts and IDs are 2 bytes
    const io1: Array<[number, number]> = [];
    const io2: Array<[number, number]> = [];

    if (rec.ignition !== undefined) io1.push([239, rec.ignition]);
    if (rec.movement !== undefined) io1.push([240, rec.movement]);
    if (rec.gsmSignal !== undefined) io1.push([21, rec.gsmSignal]);

    if (rec.externalVoltageMv !== undefined) io2.push([66, rec.externalVoltageMv]);
    if (rec.internalBatteryVoltageMv !== undefined) io2.push([67, rec.internalBatteryVoltageMv]);

    const totalIo = io1.length + io2.length;
    const headerBuf = Buffer.alloc(4);
    headerBuf.writeUInt16BE(0, 0); // Event IO ID (2 bytes)
    headerBuf.writeUInt16BE(totalIo, 2); // Total IO count (2 bytes)
    payloadChunks.push(headerBuf);

    // 1-byte elements
    const count1Buf = Buffer.alloc(2 + io1.length * 3);
    count1Buf.writeUInt16BE(io1.length, 0);
    let o1 = 2;
    for (const [id, val] of io1) {
      count1Buf.writeUInt16BE(id, o1);
      count1Buf.writeUInt8(val, o1 + 2);
      o1 += 3;
    }
    payloadChunks.push(count1Buf);

    // 2-byte elements
    const count2Buf = Buffer.alloc(2 + io2.length * 4);
    count2Buf.writeUInt16BE(io2.length, 0);
    let o2 = 2;
    for (const [id, val] of io2) {
      count2Buf.writeUInt16BE(id, o2);
      count2Buf.writeUInt16BE(val, o2 + 2);
      o2 += 4;
    }
    payloadChunks.push(count2Buf);

    // 4-byte (0)
    const count4Buf = Buffer.alloc(2);
    count4Buf.writeUInt16BE(0, 0);
    payloadChunks.push(count4Buf);

    // 8-byte (0)
    const count8Buf = Buffer.alloc(2);
    count8Buf.writeUInt16BE(0, 0);
    payloadChunks.push(count8Buf);

    // X-byte (0)
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

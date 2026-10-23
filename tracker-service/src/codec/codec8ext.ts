import { TeltonikaAvlRecord, DecodedAvlPacket } from '../types';
import { calculateTeltonikaCrc16 } from './crc16';

export class Codec8ExtDecoder {
  /**
   * Decodes a Codec 8 Extended (0x8E) payload.
   */
  public static decodePayload(payload: Buffer): DecodedAvlPacket {
    let offset = 0;
    const codecId = payload.readUInt8(offset++);
    if (codecId !== 0x8E) {
      throw new Error(`Invalid Codec ID for Codec 8 Extended: expected 0x8E, received 0x${codecId.toString(16)}`);
    }

    const recordCountN1 = payload.readUInt8(offset++);
    if (recordCountN1 === 0) {
      throw new Error('Codec 8 Extended payload has 0 records');
    }

    const records: TeltonikaAvlRecord[] = [];

    for (let i = 0; i < recordCountN1; i++) {
      if (offset + 24 > payload.length) {
        throw new Error(`Truncated Codec 8 Extended record ${i + 1}: buffer exhausted before GPS header`);
      }

      // Timestamp (8 bytes)
      const timestampMs = Number(payload.readBigUInt64BE(offset));
      offset += 8;

      // Priority (1 byte)
      const priority = payload.readUInt8(offset++);

      // GPS (15 bytes)
      const rawLon = payload.readInt32BE(offset);
      offset += 4;
      const rawLat = payload.readInt32BE(offset);
      offset += 4;
      const altitude = payload.readInt16BE(offset);
      offset += 2;
      const angle = payload.readUInt16BE(offset);
      offset += 2;
      const satellites = payload.readUInt8(offset++);
      const speed = payload.readUInt16BE(offset);
      offset += 2;

      const longitude = rawLon / 10000000.0;
      const latitude = rawLat / 10000000.0;
      const isValid = !(longitude === 0 && latitude === 0) &&
                      longitude >= -180 && longitude <= 180 &&
                      latitude >= -90 && latitude <= 90;

      // I/O Elements (Extended: 2-byte IDs and counts)
      if (offset + 4 > payload.length) {
        throw new Error(`Truncated Codec 8 Extended record ${i + 1}: buffer exhausted before I/O header`);
      }
      const eventId = payload.readUInt16BE(offset);
      offset += 2;
      const totalIoCount = payload.readUInt16BE(offset);
      offset += 2;
      const elements: Record<number, number | bigint> = {};

      // 1-byte elements
      if (offset + 2 > payload.length) throw new Error('Truncated 1-byte extended I/O count');
      const count1 = payload.readUInt16BE(offset);
      offset += 2;
      for (let j = 0; j < count1; j++) {
        if (offset + 3 > payload.length) throw new Error('Truncated 1-byte extended I/O element');
        const id = payload.readUInt16BE(offset);
        offset += 2;
        const val = payload.readUInt8(offset++);
        elements[id] = val;
      }

      // 2-byte elements
      if (offset + 2 > payload.length) throw new Error('Truncated 2-byte extended I/O count');
      const count2 = payload.readUInt16BE(offset);
      offset += 2;
      for (let j = 0; j < count2; j++) {
        if (offset + 4 > payload.length) throw new Error('Truncated 2-byte extended I/O element');
        const id = payload.readUInt16BE(offset);
        offset += 2;
        const val = payload.readUInt16BE(offset);
        offset += 2;
        elements[id] = val;
      }

      // 4-byte elements
      if (offset + 2 > payload.length) throw new Error('Truncated 4-byte extended I/O count');
      const count4 = payload.readUInt16BE(offset);
      offset += 2;
      for (let j = 0; j < count4; j++) {
        if (offset + 6 > payload.length) throw new Error('Truncated 4-byte extended I/O element');
        const id = payload.readUInt16BE(offset);
        offset += 2;
        const val = payload.readUInt32BE(offset);
        offset += 4;
        elements[id] = val;
      }

      // 8-byte elements
      if (offset + 2 > payload.length) throw new Error('Truncated 8-byte extended I/O count');
      const count8 = payload.readUInt16BE(offset);
      offset += 2;
      for (let j = 0; j < count8; j++) {
        if (offset + 10 > payload.length) throw new Error('Truncated 8-byte extended I/O element');
        const id = payload.readUInt16BE(offset);
        offset += 2;
        const val = payload.readBigUInt64BE(offset);
        offset += 8;
        elements[id] = val;
      }

      // Variable-length (X-byte) elements (if present)
      // Check if there is enough space for countX + at least 1 byte before end or next record
      if (offset + 2 <= payload.length - 1) { // -1 for N2
        const countX = payload.readUInt16BE(offset);
        offset += 2;
        for (let j = 0; j < countX; j++) {
          if (offset + 4 > payload.length) break;
          const id = payload.readUInt16BE(offset);
          offset += 2;
          const len = payload.readUInt16BE(offset);
          offset += 2;
          if (offset + len <= payload.length) {
            // Store length as element value or read as hex/number if fits
            elements[id] = len;
            offset += len;
          }
        }
      }

      records.push({
        timestampMs,
        timestamp: new Date(timestampMs),
        priority,
        gps: {
          longitude,
          latitude,
          altitude,
          angle,
          satellites,
          speed,
          isValid
        },
        io: {
          eventId,
          totalCount: totalIoCount,
          elements
        }
      });
    }

    if (offset >= payload.length) {
      throw new Error('Missing Codec 8 Extended Number of Data 2');
    }
    const recordCountN2 = payload.readUInt8(offset++);

    if (recordCountN1 !== recordCountN2) {
      throw new Error(`Record count mismatch: N1=${recordCountN1}, N2=${recordCountN2}`);
    }

    const calculatedCrc = calculateTeltonikaCrc16(payload.subarray(0, offset));

    return {
      codec: 0x8E,
      codecName: 'Codec 8 Extended',
      recordCount: recordCountN1,
      records,
      crc: calculatedCrc,
      calculatedCrc,
      rawPayloadLength: offset
    };
  }

  /**
   * Helper to build a complete Codec 8 Extended packet
   */
  public static buildPacket(records: Array<{
    timestampMs?: number;
    priority?: number;
    longitude: number;
    latitude: number;
    altitude?: number;
    angle?: number;
    satellites?: number;
    speed: number;
    ioElements?: Record<number, number>;
  }>): Buffer {
    const payloadParts: Buffer[] = [];
    const count = records.length;

    // Header: Codec ID (0x8E) + N1
    const head = Buffer.alloc(2);
    head.writeUInt8(0x8E, 0);
    head.writeUInt8(count, 1);
    payloadParts.push(head);

    for (const rec of records) {
      const ts = BigInt(rec.timestampMs ?? Date.now());
      const prio = rec.priority ?? 1;
      const lon = Math.round(rec.longitude * 10000000);
      const lat = Math.round(rec.latitude * 10000000);
      const alt = rec.altitude ?? 15;
      const ang = rec.angle ?? 180;
      const sat = rec.satellites ?? 14;
      const spd = Math.round(rec.speed);

      // GPS + Timestamp block: 8 + 1 + 15 = 24 bytes
      const gpsBuf = Buffer.alloc(24);
      gpsBuf.writeBigUInt64BE(ts, 0);
      gpsBuf.writeUInt8(prio, 8);
      gpsBuf.writeInt32BE(lon, 9);
      gpsBuf.writeInt32BE(lat, 13);
      gpsBuf.writeInt16BE(alt, 17);
      gpsBuf.writeUInt16BE(ang, 19);
      gpsBuf.writeUInt8(sat, 21);
      gpsBuf.writeUInt16BE(spd, 22);
      payloadParts.push(gpsBuf);

      const io = rec.ioElements || {};
      const io1: Array<[number, number]> = [];
      const io2: Array<[number, number]> = [];
      const io4: Array<[number, number]> = [];

      for (const [idStr, val] of Object.entries(io)) {
        const id = parseInt(idStr, 10);
        if (id === 66 || id === 67) {
          io2.push([id, val]);
        } else if (id === 239 || id === 240 || id === 21) {
          io1.push([id, val]);
        } else if (val > 65535) {
          io4.push([id, val]);
        } else if (val > 255) {
          io2.push([id, val]);
        } else {
          io1.push([id, val]);
        }
      }

      const totalIo = io1.length + io2.length + io4.length;
      const ioHeader = Buffer.alloc(4);
      ioHeader.writeUInt16BE(0, 0); // eventId
      ioHeader.writeUInt16BE(totalIo, 2);
      payloadParts.push(ioHeader);

      // 1-byte elements (2-byte count, 2-byte ID, 1-byte value)
      const buf1 = Buffer.alloc(2 + io1.length * 3);
      buf1.writeUInt16BE(io1.length, 0);
      let o1 = 2;
      for (const [id, val] of io1) {
        buf1.writeUInt16BE(id, o1);
        o1 += 2;
        buf1.writeUInt8(val & 0xff, o1++);
      }
      payloadParts.push(buf1);

      // 2-byte elements (2-byte count, 2-byte ID, 2-byte value)
      const buf2 = Buffer.alloc(2 + io2.length * 4);
      buf2.writeUInt16BE(io2.length, 0);
      let o2 = 2;
      for (const [id, val] of io2) {
        buf2.writeUInt16BE(id, o2);
        o2 += 2;
        buf2.writeUInt16BE(val & 0xffff, o2);
        o2 += 2;
      }
      payloadParts.push(buf2);

      // 4-byte elements (2-byte count, 2-byte ID, 4-byte value)
      const buf4 = Buffer.alloc(2 + io4.length * 6);
      buf4.writeUInt16BE(io4.length, 0);
      let o4 = 2;
      for (const [id, val] of io4) {
        buf4.writeUInt16BE(id, o4);
        o4 += 2;
        buf4.writeUInt32BE(val >>> 0, o4);
        o4 += 4;
      }
      payloadParts.push(buf4);

      // 8-byte elements
      const buf8 = Buffer.alloc(2);
      buf8.writeUInt16BE(0, 0);
      payloadParts.push(buf8);
    }

    // Number of Data 2
    const tail = Buffer.alloc(1);
    tail.writeUInt8(count, 0);
    payloadParts.push(tail);

    const payload = Buffer.concat(payloadParts);
    const dataLength = payload.length;
    const crc = calculateTeltonikaCrc16(payload);

    const packet = Buffer.alloc(8 + dataLength + 4);
    packet.writeUInt32BE(0, 0);
    packet.writeUInt32BE(dataLength, 4);
    payload.copy(packet, 8);
    packet.writeUInt32BE(crc, 8 + dataLength);

    return packet;
  }
}

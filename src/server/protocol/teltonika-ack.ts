/**
 * Encodes the standard Teltonika 4-byte big-endian acknowledgement packet.
 *
 * @param recordCount Number of records accepted and persisted
 * @returns 4-byte Buffer containing big-endian record count (e.g. 0x00 0x00 0x00 0x05)
 */
export function encodeTeltonikaAck(recordCount: number): Buffer {
  if (recordCount < 0 || recordCount > 0xffffffff) {
    throw new Error(`Invalid record count for ACK: ${recordCount}`);
  }
  const ack = Buffer.alloc(4);
  ack.writeUInt32BE(recordCount, 0);
  return ack;
}

/**
 * Validates whether a response is a valid 4-byte Teltonika ACK matching expected count.
 */
export function decodeTeltonikaAck(buffer: Buffer): number {
  if (buffer.length < 4) {
    throw new Error(`Buffer too short for Teltonika ACK: ${buffer.length} bytes (expected 4)`);
  }
  return buffer.readUInt32BE(0);
}

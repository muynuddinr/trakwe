/**
 * Teltonika CRC-16 Calculation
 *
 * Protocol specification:
 * - Algorithm: CRC-16/IBM (Modbus / ANSI)
 * - Polynomial: 0xA001 (reversed 0x8005)
 * - Initial value: 0x0000
 * - Calculation range: starts at Codec ID byte and ends at Number of Data 2 byte
 *   (excluding 4-byte preamble, 4-byte length, and 4-byte CRC).
 * - Transmitted in Teltonika packets as 4 bytes Big-Endian (0x00 0x00 [MSB] [LSB]).
 */

export function calculateTeltonikaCrc16(buffer: Buffer): number {
  let crc = 0x0000;
  for (let i = 0; i < buffer.length; i++) {
    crc ^= buffer[i];
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x0001) !== 0) {
        crc = (crc >>> 1) ^ 0xa001;
      } else {
        crc = crc >>> 1;
      }
    }
  }
  return crc & 0xffff;
}

/**
 * Validates that the CRC in the packet matches the calculated CRC over the payload.
 *
 * @param payloadBuffer Buffer from Codec ID to Number of Data 2
 * @param packetCrc The 4-byte or 2-byte CRC read from the packet
 */
export function verifyTeltonikaCrc(payloadBuffer: Buffer, packetCrc: number): boolean {
  const calculated = calculateTeltonikaCrc16(payloadBuffer);
  // Match lower 16 bits
  return (packetCrc & 0xffff) === calculated;
}

/**
 * Formats a 16-bit CRC into a 4-byte Teltonika Big-Endian CRC Buffer
 */
export function formatCrc4Bytes(crc: number): Buffer {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(crc & 0xffff, 0);
  return buf;
}

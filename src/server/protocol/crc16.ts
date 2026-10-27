/**
 * Teltonika CRC-16/IBM Implementation
 *
 * Teltonika protocol packets conclude with a 4-byte CRC-16 field.
 * The checksum is computed across the payload: from the Codec ID byte
 * up to and including the second Record Count (N2) byte.
 *
 * Algorithm: CRC-16/IBM (also known as CRC-16/ARC or USB, polynomial 0xA001, initial 0x0000)
 */
export function calculateTeltonikaCrc16(data: Buffer): number {
  let crc = 0x0000;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
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
 * Validates a received 4-byte CRC field against calculated CRC-16 of payload.
 */
export function verifyTeltonikaCrc(payload: Buffer, receivedCrc: number): boolean {
  const calculated = calculateTeltonikaCrc16(payload);
  // Compare lower 16 bits (Teltonika sends 4-byte CRC where lower 2 bytes contain the 16-bit CRC)
  return (receivedCrc & 0xffff) === calculated;
}

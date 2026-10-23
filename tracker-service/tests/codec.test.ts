import assert from 'assert';
import { calculateTeltonikaCrc16, verifyTeltonikaCrc, formatCrc4Bytes } from '../src/codec/crc16';
import { Codec8Decoder } from '../src/codec/codec8';
import { Codec8ExtDecoder } from '../src/codec/codec8ext';
import { TeltonikaDecoder } from '../src/codec/decoder';

export async function runCodecTests(): Promise<{ passed: number; failed: number }> {
  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void) {
    try {
      fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✗ ${name}: ${err?.message || String(err)}`);
      failed++;
    }
  }

  console.log('\n--- Teltonika Protocol Decoder & CRC Unit Tests ---');

  // Test 1: CRC-16 Calculation
  test('CRC-16 calculation matches standard test vector "123456789" = 0xBB3D', () => {
    const data = Buffer.from('123456789', 'ascii');
    const crc = calculateTeltonikaCrc16(data);
    assert.strictEqual(crc.toString(16).toLowerCase(), 'bb3d');
  });

  // Test 2: Authentic Traccar / Teltonika Codec 8 Fixture with 3 Records
  // Fixture from Traccar TeltonikaProtocolDecoderTest.java line 59
  const authenticCodec8FixtureHex =
    '00000000000000e708030000018293d62060000de1f6a62159767e00000000000000000b074504f00050041500c801ef004f630342320043000344000001f100006019000000018291b0c790000de1f6a62159767e006e0144070000ef12074503f00050051505c800ef004f0207b5000eb6000b423324180000ce00dc43001144000004c700000007f100006019cd0003c7776300ea4e2e000000018291aff0b8000de1f91f21597405006f00f61300080012074503f00150051504c800ef014f0207b50009b600054236c1180008ce00dc43003f44000004c700000003f100006019cd0003c7776300ea4e2700030000a48d';

  test('Valid Codec 8 packet decoding with authentic hardware capture fixture', () => {
    const buffer = Buffer.from(authenticCodec8FixtureHex, 'hex');
    const result = TeltonikaDecoder.parsePacket(buffer);

    assert.strictEqual(result.success, true);
    assert.ok(result.decodedPacket);
    assert.strictEqual(result.decodedPacket?.codec, 0x08);
    assert.strictEqual(result.decodedPacket?.codecName, 'Codec 8');
    assert.strictEqual(result.decodedPacket?.recordCount, 3);
    assert.strictEqual(result.decodedPacket?.records.length, 3);

    // Verify first record coordinates and timestamp
    const rec1 = result.decodedPacket!.records[0];
    assert.ok(rec1.gps.latitude > 0, 'Latitude should be positive');
    assert.ok(rec1.gps.longitude > 0, 'Longitude should be positive');
    assert.strictEqual(rec1.gps.isValid, true);

    // Verify 4-byte Big-Endian ACK for 3 records -> <00 00 00 03>
    assert.deepStrictEqual(result.ackBuffer, Buffer.from([0x00, 0x00, 0x00, 0x03]));
  });

  // Test 3: Authentic Traccar / Teltonika Codec 8 Extended Fixture with 2 Records
  // Fixture from Traccar TeltonikaProtocolDecoderTest.java line 71
  const authenticCodec8ExtFixtureHex =
    '00000000000000b98e0200000179555c7bf8010b3a1cfbebc142b00000000000000000ec000f000900f00000150000c80000450200710100740001070100fa0000ec01000500b500000018000000430d560044000000190000000100f1000000000000000000000179555c83c8010b3a1cfbebc142b0000000000000000185000f000900f00000150000c80000450200710100740001070100fa00018511000500b500000018000000430d560044000000190000000100f100000000000000000200003251';

  test('Valid Codec 8 Extended packet decoding with authentic hardware capture fixture', () => {
    const buffer = Buffer.from(authenticCodec8ExtFixtureHex, 'hex');
    const result = TeltonikaDecoder.parsePacket(buffer);

    assert.strictEqual(result.success, true);
    assert.ok(result.decodedPacket);
    assert.strictEqual(result.decodedPacket?.codec, 0x8E);
    assert.strictEqual(result.decodedPacket?.codecName, 'Codec 8 Extended');
    assert.strictEqual(result.decodedPacket?.recordCount, 2);
    assert.strictEqual(result.decodedPacket?.records.length, 2);

    // Verify 4-byte ACK for 2 records -> <00 00 00 02>
    assert.deepStrictEqual(result.ackBuffer, Buffer.from([0x00, 0x00, 0x00, 0x02]));
  });

  // Test 4: Multiple records in a packet
  test('Multiple records parsing and validation', () => {
    const buffer = Buffer.from(authenticCodec8FixtureHex, 'hex');
    const result = TeltonikaDecoder.parsePacket(buffer);
    assert.strictEqual(result.decodedPacket?.recordCount, 3);
    assert.strictEqual(result.decodedPacket?.records.length, 3);
    for (let i = 0; i < 3; i++) {
      assert.ok(result.decodedPacket!.records[i].timestampMs > 0);
    }
  });

  // Test 5: GPS and Essential FMC920 I/O Field Extraction
  test('GPS and essential FMC920 I/O fields (Ignition 239, Movement 240, Voltage 66/67, GSM 21)', () => {
    const syntheticPacket = Codec8Decoder.buildPacket([
      {
        timestampMs: 1730000000000,
        longitude: 55.2708,
        latitude: 25.2048,
        speed: 68,
        altitude: 15,
        angle: 45,
        satellites: 14,
        ioElements: {
          239: 1,     // Ignition ON
          240: 1,     // In motion
          66: 12600,  // External voltage 12600 mV = 12.6V
          67: 3850,   // Internal battery 3850 mV = 3.85V
          21: 5       // Max GSM signal
        }
      }
    ]);

    const result = TeltonikaDecoder.parsePacket(syntheticPacket);
    assert.strictEqual(result.success, true);
    const rec = result.decodedPacket!.records[0];

    const normalized = TeltonikaDecoder.normalizeRecord(rec, '356289104928172', 'v-dxb-01');
    assert.strictEqual(normalized.ignition, true);
    assert.strictEqual(normalized.movement, true);
    assert.strictEqual(normalized.externalVoltage, 12.6);
    assert.strictEqual(normalized.internalBattery, 3.85);
    assert.strictEqual(normalized.gsmSignal, 5);
    assert.strictEqual(normalized.speed, 68);
    assert.strictEqual(normalized.isUaeCorridor, true);
    assert.strictEqual(normalized.status, 'Moving');
  });

  // Test 6: Invalid packet length (truncated)
  test('Gracefully detects truncated/partial stream without crashing', () => {
    const buffer = Buffer.from(authenticCodec8FixtureHex, 'hex');
    const truncated = buffer.subarray(0, 30); // only 30 bytes
    const result = TeltonikaDecoder.parsePacket(truncated);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.bytesConsumed, 0); // expects more data
  });

  // Test 7: Invalid record count (tampered N2)
  test('Rejects packet with mismatched N1 vs N2 record counts', () => {
    const buffer = Buffer.from(authenticCodec8FixtureHex, 'hex');
    // Tamper N2 (byte right before CRC)
    const tampered = Buffer.from(buffer);
    const dataLength = tampered.readUInt32BE(4);
    tampered.writeUInt8(99, 8 + dataLength - 1); // change N2 to 99

    // Recompute CRC so CRC check passes but N1/N2 validation fails
    const payload = tampered.subarray(8, 8 + dataLength);
    const newCrc = calculateTeltonikaCrc16(payload);
    tampered.writeUInt32BE(newCrc, 8 + dataLength);

    const result = TeltonikaDecoder.parsePacket(tampered);
    assert.strictEqual(result.success, false);
    assert.ok(result.error?.includes('Record count mismatch'));
  });

  // Test 8: CRC validation rejects corrupted packet
  test('Rejects corrupted packet with invalid CRC', () => {
    const buffer = Buffer.from(authenticCodec8FixtureHex, 'hex');
    const corrupted = Buffer.from(buffer);
    // Corrupt one payload byte
    corrupted[20] ^= 0xff;

    const result = TeltonikaDecoder.parsePacket(corrupted);
    assert.strictEqual(result.success, false);
    assert.ok(result.error?.includes('CRC-16 mismatch'));
  });

  // Test 9: Correct 4-byte ACK generation
  test('Generates correct 4-byte Big-Endian ACK for arbitrary record counts', () => {
    const ack1 = TeltonikaDecoder.createAck(1);
    assert.deepStrictEqual(ack1, Buffer.from([0x00, 0x00, 0x00, 0x01]));

    const ack5 = TeltonikaDecoder.createAck(5);
    assert.deepStrictEqual(ack5, Buffer.from([0x00, 0x00, 0x00, 0x05]));

    const ack12 = TeltonikaDecoder.createAck(12);
    assert.deepStrictEqual(ack12, Buffer.from([0x00, 0x00, 0x00, 0x0c]));
  });

  return { passed, failed };
}

if (require.main === module || process.argv[1]?.includes('codec.test')) {
  runCodecTests().then(({ passed, failed }) => {
    console.log(`\nTest Summary: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
  });
}

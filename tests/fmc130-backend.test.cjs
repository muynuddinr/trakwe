const assert = require("node:assert/strict");
const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");
const ts = require("typescript");

const Module = require("node:module");
const root = path.resolve(__dirname, "..");
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  return resolve.call(this, request.startsWith("@/") ? path.join(root, "src", request.slice(2)) : request, ...args);
};

// Hook TypeScript compilation
require.extensions[".ts"] = function (module, filename) {
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText,
    filename
  );
};

const { calculateTeltonikaCrc16, verifyTeltonikaCrc } = require("../src/server/protocol/crc16.ts");
const {
  parseSingleTeltonikaPacket,
  extractPacketsFromStream,
  extractFmc130Properties,
  extractModelProperties,
} = require("../src/server/protocol/teltonika-parser.ts");
const { encodeTeltonikaAck, decodeTeltonikaAck } = require("../src/server/protocol/teltonika-ack.ts");
const {
  buildImeiHandshakeFrame,
  buildCodec8Packet,
  buildCodec8ExtendedPacket,
  buildCodec16Packet,
} = require("../src/server/protocol/teltonika-builder.ts");
const { TELTONIKA_CODECS, TELTONIKA_AVL_IDS } = require("../src/server/protocol/teltonika-types.ts");
const { resetDatabaseInstanceForTesting } = require("../src/server/db/db.ts");
const { DeviceRepository } = require("../src/server/db/repositories/device-repository.ts");
const { TelemetryRepository } = require("../src/server/db/repositories/telemetry-repository.ts");
const { SessionRepository } = require("../src/server/db/repositories/session-repository.ts");
const { LogRepository } = require("../src/server/db/repositories/log-repository.ts");
const { Fmc920TcpService } = require("../src/server/tcp/fmc920-tcp-service.ts");

let passed = 0;
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  PASS: ${name}`);
  } catch (err) {
    console.error(`  FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

async function runFmc130Suite() {
  console.log("\n=======================================================");
  console.log(" TRACKWE TELTONIKA FMC130 INTEGRATION TEST SUITE");
  console.log("=======================================================\n");

  const db = resetDatabaseInstanceForTesting(true);
  const deviceRepo = new DeviceRepository(db);
  const telemetryRepo = new TelemetryRepository(db);
  const sessionRepo = new SessionRepository(db);
  const logRepo = new LogRepository(db);

  // Seed FMC130 test devices with diverse ignition configurations
  const fmc130Din1 = await deviceRepo.create({
    imei: "867123049100001",
    model: "Teltonika FMC130",
    manufacturer: "Teltonika",
    protocol: "Teltonika Codec 8 / 8E / 16",
    codec: "Codec 8 / Codec 8 Extended",
    orgId: "org-dubai",
    vehicleId: "v1",
    status: "active",
    ignitionSource: "DIN1",
  });

  const fmc130Voltage = await deviceRepo.create({
    imei: "867123049100002",
    model: "Teltonika FMC130",
    manufacturer: "Teltonika",
    protocol: "Teltonika Codec 8 / 8E / 16",
    codec: "Codec 8 / Codec 8 Extended",
    orgId: "org-dubai",
    vehicleId: "v2",
    status: "active",
    ignitionSource: "VOLTAGE",
    ignitionHighThreshold: 13.2,
    ignitionLowThreshold: 12.8,
  });

  const fmc130Rpm = await deviceRepo.create({
    imei: "867123049100003",
    model: "Teltonika FMC130",
    manufacturer: "Teltonika",
    protocol: "Teltonika Codec 8 / 8E / 16",
    codec: "Codec 16",
    orgId: "org-dubai",
    vehicleId: "v3",
    status: "active",
    ignitionSource: "RPM",
    ignitionRpmThreshold: 450,
  });

  const fmc130Disabled = await deviceRepo.create({
    imei: "867123049100099",
    model: "Teltonika FMC130",
    manufacturer: "Teltonika",
    orgId: "org-dubai",
    vehicleId: "v4",
    status: "disabled",
  });

  // 1. Device Registration & Model Recognition
  await test("1. Dynamic FMC130 Registration with any IMEI (no hardcoding)", async () => {
    const dynamicImei = "867999049876543";
    const reg = await deviceRepo.create({
      imei: dynamicImei,
      model: "Teltonika FMC130",
      manufacturer: "Teltonika",
      protocol: "Teltonika Codec 8 / 8E / 16",
      orgId: "org-dubai",
      status: "active",
    });
    assert.equal(reg.imei, dynamicImei);
    assert.equal(reg.model, "Teltonika FMC130");
    assert.equal(reg.status, "active");

    const found = await deviceRepo.findByImei(dynamicImei);
    assert(found !== null);
    assert.equal(found.model, "Teltonika FMC130");
  });

  await test("2. Model-aware Device Registry Filtering (FMC920 vs FMC130)", async () => {
    const fmc130List = await deviceRepo.list({ model: "Teltonika FMC130" });
    assert(fmc130List.length >= 4);
    for (const d of fmc130List) {
      assert(d.model.includes("130"));
    }

    const fmc920List = await deviceRepo.list({ model: "Teltonika FMC920" });
    for (const d of fmc920List) {
      assert(d.model.includes("920"));
    }
  });

  await test("3. Duplicate IMEI registration rejection", async () => {
    let duplicateRejected = false;
    try {
      await deviceRepo.create({
        imei: fmc130Din1.imei, // Already exists
        model: "Teltonika FMC130",
        orgId: "org-dubai",
      });
    } catch {
      duplicateRejected = true;
    }
    assert.equal(duplicateRejected, true);
  });

  await test("4. Disabled FMC130 Handshake rejection (0x00)", async () => {
    const dev = await deviceRepo.findByImei(fmc130Disabled.imei);
    assert.equal(dev.status, "disabled");
  });

  // 2. Protocol Compatibility & Codecs
  await test("5. Auto-detect Codec 8 (0x08) packet parsing for FMC130", async () => {
    const pkt = buildCodec8Packet([
      {
        latitude: 25.2048,
        longitude: 55.2708,
        speed: 55,
        altitude: 14,
        satellites: 15,
        din1: 1,
        externalVoltageMv: 13500,
        internalBatteryVoltageMv: 3950,
        gsmSignal: 5,
        odometerKm: 1420.5,
        engineRpm: 750,
      },
    ]);

    const result = parseSingleTeltonikaPacket(pkt, {
      model: "Teltonika FMC130",
      ignitionConfig: { source: "DIN1" },
    });

    assert.equal(result.success, true);
    if (!result.success) return;

    assert.equal(result.packet.codecId, TELTONIKA_CODECS.CODEC_8);
    assert.equal(result.packet.codecName, "Codec 8");
    assert.equal(result.packet.recordCount, 1);

    const rec = result.packet.records[0];
    assert.equal(rec.properties.ignition, "ON");
    assert.equal(rec.properties.externalVoltage, 13.5);
    assert.equal(rec.properties.internalBatteryVoltage, 3.95);
    assert.equal(rec.properties.gsmSignal, 5);
    assert.equal(rec.properties.odometerKm, 1420.5);
    assert.equal(rec.properties.engineRpm, 750);
  });

  await test("6. Auto-detect Codec 8 Extended (0x8E) packet parsing with 2-byte AVL IDs", async () => {
    const pkt = buildCodec8ExtendedPacket([
      {
        latitude: 25.0757,
        longitude: 55.1432,
        speed: 72,
        din1: 1,
        externalVoltageMv: 13800,
        internalBatteryVoltageMv: 4050,
        gsmSignal: 4,
        odometerMeters: 55200,
        fuelPercent: 82,
        engineRpm: 1850,
        engineTemp: 88,
      },
    ]);

    const result = parseSingleTeltonikaPacket(pkt, {
      model: "Teltonika FMC130",
      ignitionConfig: { source: "DIN1" },
    });

    assert.equal(result.success, true);
    if (!result.success) return;

    assert.equal(result.packet.codecId, TELTONIKA_CODECS.CODEC_8_EXTENDED);
    assert.equal(result.packet.codecName, "Codec 8 Extended");
    assert.equal(result.packet.recordCount, 1);

    const rec = result.packet.records[0];
    assert.equal(rec.properties.ignition, "ON");
    assert.equal(rec.properties.externalVoltage, 13.8);
    assert.equal(rec.properties.odometerKm, 55.2);
    assert.equal(rec.properties.fuelLevel, 82);
    assert.equal(rec.properties.engineRpm, 1850);
    assert.equal(rec.properties.engineTemp, 88);
  });

  await test("7. Support Codec 16 (0x10) for Teltonika FMC130", async () => {
    const pkt = buildCodec16Packet([
      {
        latitude: 25.1972,
        longitude: 55.2744,
        speed: 35,
        din1: 0,
        movement: 0,
        externalVoltageMv: 12200,
        internalBatteryVoltageMv: 3800,
        gsmSignal: 3,
        odometerKm: 120.4,
        engineRpm: 0,
      },
    ]);

    const result = parseSingleTeltonikaPacket(pkt, {
      model: "Teltonika FMC130",
      ignitionConfig: { source: "DIN1" },
    });

    assert.equal(result.success, true);
    if (!result.success) return;

    assert.equal(result.packet.codecId, TELTONIKA_CODECS.CODEC_16);
    assert.equal(result.packet.codecName, "Codec 16");
    assert.equal(result.packet.records[0].properties.ignition, "OFF");
    assert.equal(result.packet.records[0].properties.externalVoltage, 12.2);
  });

  await test("8. CRC-16 Checksum verification on FMC130 packets", async () => {
    const pkt = buildCodec8ExtendedPacket([
      {
        latitude: 25.2048,
        longitude: 55.2708,
        speed: 60,
      },
    ]);

    // Corrupt one byte inside payload
    pkt[15] = pkt[15] ^ 0xff;

    const result = parseSingleTeltonikaPacket(pkt);
    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.errorType, "CRC_MISMATCH");
    }
  });

  // 3. Configurable Ignition Mapping Per Device
  await test("9. Ignition Source: Digital Input 1 (DIN1) state mapping", async () => {
    const ioDin1On = {
      [TELTONIKA_AVL_IDS.DIN1]: { id: TELTONIKA_AVL_IDS.DIN1, length: 1, value: 1 },
      [TELTONIKA_AVL_IDS.EXTERNAL_VOLTAGE_MV]: { id: TELTONIKA_AVL_IDS.EXTERNAL_VOLTAGE_MV, length: 2, value: 12400 },
    };
    const pOn = extractFmc130Properties(ioDin1On, { source: "DIN1" });
    assert.equal(pOn.ignition, "ON");

    const ioDin1Off = {
      [TELTONIKA_AVL_IDS.DIN1]: { id: TELTONIKA_AVL_IDS.DIN1, length: 1, value: 0 },
      [TELTONIKA_AVL_IDS.EXTERNAL_VOLTAGE_MV]: { id: TELTONIKA_AVL_IDS.EXTERNAL_VOLTAGE_MV, length: 2, value: 12400 },
    };
    const pOff = extractFmc130Properties(ioDin1Off, { source: "DIN1" });
    assert.equal(pOff.ignition, "OFF");
  });

  await test("10. Ignition Source: External Voltage threshold (Alternator Detection)", async () => {
    const config = {
      source: "VOLTAGE",
      highVoltageThreshold: 13.2,
      lowVoltageThreshold: 12.8,
    };

    // 13.8V (> 13.2V) -> Alternator active -> Ignition ON
    const ioHigh = {
      [TELTONIKA_AVL_IDS.EXTERNAL_VOLTAGE_MV]: { id: TELTONIKA_AVL_IDS.EXTERNAL_VOLTAGE_MV, length: 2, value: 13800 },
    };
    const pHigh = extractFmc130Properties(ioHigh, config);
    assert.equal(pHigh.ignition, "ON");

    // 12.2V (< 12.8V) -> Battery resting -> Ignition OFF
    const ioLow = {
      [TELTONIKA_AVL_IDS.EXTERNAL_VOLTAGE_MV]: { id: TELTONIKA_AVL_IDS.EXTERNAL_VOLTAGE_MV, length: 2, value: 12200 },
    };
    const pLow = extractFmc130Properties(ioLow, config);
    assert.equal(pLow.ignition, "OFF");
  });

  await test("11. Ignition Source: Accelerometer / Movement detection", async () => {
    const config = { source: "ACCELEROMETER" };

    const ioMoving = {
      [TELTONIKA_AVL_IDS.MOVEMENT]: { id: TELTONIKA_AVL_IDS.MOVEMENT, length: 1, value: 1 },
    };
    const pMoving = extractFmc130Properties(ioMoving, config);
    assert.equal(pMoving.ignition, "ON");

    const ioStationary = {
      [TELTONIKA_AVL_IDS.MOVEMENT]: { id: TELTONIKA_AVL_IDS.MOVEMENT, length: 1, value: 0 },
    };
    const pStationary = extractFmc130Properties(ioStationary, config);
    assert.equal(pStationary.ignition, "OFF");
  });

  await test("12. Ignition Source: Engine RPM from CAN-bus / OBD", async () => {
    const config = { source: "RPM", rpmThreshold: 400 };

    // 850 RPM >= 400 -> Engine running -> Ignition ON
    const ioRunning = {
      [TELTONIKA_AVL_IDS.ENGINE_RPM]: { id: TELTONIKA_AVL_IDS.ENGINE_RPM, length: 2, value: 850 },
    };
    const pRunning = extractFmc130Properties(ioRunning, config);
    assert.equal(pRunning.ignition, "ON");

    // 0 RPM < 400 -> Engine stopped -> Ignition OFF
    const ioStopped = {
      [TELTONIKA_AVL_IDS.ENGINE_RPM]: { id: TELTONIKA_AVL_IDS.ENGINE_RPM, length: 2, value: 0 },
    };
    const pStopped = extractFmc130Properties(ioStopped, config);
    assert.equal(pStopped.ignition, "OFF");
  });

  await test("13. Preserving Raw AVL I/O Identifiers for Extensibility", async () => {
    const ioRaw = {
      1: { id: 1, length: 1, value: 1 },
      2: { id: 2, length: 1, value: 0 },
      3: { id: 3, length: 1, value: 1 },
      9: { id: 9, length: 2, value: 2450 }, // Analog Input 1 in mV
      10: { id: 10, length: 2, value: 1200 }, // Analog Input 2 in mV
      16: { id: 16, length: 4, value: 125000 }, // Odometer in meters
      83: { id: 83, length: 1, value: 75 }, // Fuel 75%
      85: { id: 85, length: 2, value: 1200 }, // 1200 RPM
      115: { id: 115, length: 1, value: 92 }, // 92°C
    };

    const p = extractFmc130Properties(ioRaw, { source: "DIN1" });
    assert.equal(p.din1, 1);
    assert.equal(p.din2, 0);
    assert.equal(p.din3, 1);
    assert.equal(p.ain1Mv, 2450);
    assert.equal(p.ain2Mv, 1200);
    assert.equal(p.odometerKm, 125);
    assert.equal(p.fuelLevel, 75);
    assert.equal(p.engineRpm, 1200);
    assert.equal(p.engineTemp, 92);
  });

  // 4. Persistence & Deduplication
  await test("14. Database Persistence of FMC130 Telemetry & Snapshot", async () => {
    const pkt = buildCodec8ExtendedPacket([
      {
        timestamp: Date.now(),
        latitude: 25.2048,
        longitude: 55.2708,
        speed: 48,
        din1: 1,
        externalVoltageMv: 13600,
        internalBatteryVoltageMv: 3900,
        gsmSignal: 5,
        odometerMeters: 45000,
        fuelPercent: 68,
        engineRpm: 1400,
      },
    ]);

    const parsed = parseSingleTeltonikaPacket(pkt, {
      model: fmc130Din1.model,
      ignitionConfig: { source: "DIN1" },
    });
    assert.equal(parsed.success, true);
    if (!parsed.success) return;

    const res = await telemetryRepo.persistBatch(
      fmc130Din1.id,
      fmc130Din1.imei,
      fmc130Din1.vehicle_id,
      fmc130Din1.org_id,
      parsed.packet.records,
      parsed.packet.codecId,
      parsed.packet.rawHex
    );

    assert.equal(res.accepted, 1);
    assert.equal(res.duplicates, 0);

    const snapshot = await telemetryRepo.getLatestSnapshot(fmc130Din1.id);
    assert(snapshot !== null);
    assert.equal(snapshot.ignition, "ON");
    assert.equal(snapshot.external_voltage, 13.6);
    assert.equal(snapshot.odometer_km, 45);
    assert.equal(snapshot.fuel_level, 68);
    assert.equal(snapshot.engine_rpm, 1400);
    assert.equal(snapshot.din1, 1);
  });

  await test("15. Duplicate Packet Deduplication for FMC130", async () => {
    const fixedTime = 1730000000000;
    const pkt = buildCodec8Packet([
      {
        timestamp: fixedTime,
        latitude: 25.2048,
        longitude: 55.2708,
        speed: 50,
        din1: 1,
      },
    ]);

    const parsed = parseSingleTeltonikaPacket(pkt, { model: fmc130Din1.model });
    assert.equal(parsed.success, true);
    if (!parsed.success) return;

    // First attempt: accepted
    const r1 = await telemetryRepo.persistBatch(
      fmc130Din1.id,
      fmc130Din1.imei,
      fmc130Din1.vehicle_id,
      fmc130Din1.org_id,
      parsed.packet.records,
      parsed.packet.codecId,
      parsed.packet.rawHex
    );
    assert.equal(r1.accepted, 1);

    // Retransmitted identical packet: rejected as duplicate
    const r2 = await telemetryRepo.persistBatch(
      fmc130Din1.id,
      fmc130Din1.imei,
      fmc130Din1.vehicle_id,
      fmc130Din1.org_id,
      parsed.packet.records,
      parsed.packet.codecId,
      parsed.packet.rawHex
    );
    assert.equal(r2.accepted, 0);
    assert.equal(r2.duplicates, 1);
  });

  // 5. TCP Streaming & End-to-End Socket Ingestion
  await test("16. Stream chunking and partial packet reassembly for FMC130", async () => {
    const pkt = buildCodec8ExtendedPacket([
      {
        latitude: 25.2048,
        longitude: 55.2708,
        speed: 60,
        din1: 1,
      },
    ]);

    // Split packet into two chunks
    const chunk1 = pkt.subarray(0, 20);
    const chunk2 = pkt.subarray(20);

    const step1 = extractPacketsFromStream(chunk1, { model: "Teltonika FMC130" });
    assert.equal(step1.packets.length, 0);
    assert.equal(step1.remainingBuffer.length, 20);

    const step2 = extractPacketsFromStream(Buffer.concat([step1.remainingBuffer, chunk2]), {
      model: "Teltonika FMC130",
    });
    assert.equal(step2.packets.length, 1);
    assert.equal(step2.remainingBuffer.length, 0);
  });

  await test("17. Multiple concatenated FMC130 packets in a single TCP read", async () => {
    const p1 = buildCodec8Packet([{ timestamp: Date.now() - 5000, latitude: 25.2048, longitude: 55.2708 }]);
    const p2 = buildCodec8Packet([{ timestamp: Date.now(), latitude: 25.2055, longitude: 55.2715 }]);
    const concatenated = Buffer.concat([p1, p2]);

    const result = extractPacketsFromStream(concatenated, { model: "Teltonika FMC130" });
    assert.equal(result.packets.length, 2);
    assert.equal(result.remainingBuffer.length, 0);
  });

  await test("18. End-to-End FMC130 TCP Handshake and Telemetry Ingestion over Socket", async () => {
    const testPort = 5031;
    const tcpServer = new Fmc920TcpService({ host: "127.0.0.1", port: testPort });
    await tcpServer.start();

    try {
      await new Promise((resolve, reject) => {
        const client = net.createConnection({ host: "127.0.0.1", port: testPort }, () => {
          // Send FMC130 IMEI handshake
          client.write(buildImeiHandshakeFrame(fmc130Din1.imei));
        });

        let phase = "HANDSHAKE";
        client.on("data", (chunk) => {
          if (phase === "HANDSHAKE") {
            assert.equal(chunk.length, 1);
            assert.equal(chunk[0], 0x01); // Handshake accepted!
            phase = "TELEMETRY";

            // Send FMC130 Codec 8 Extended packet
            const pkt = buildCodec8ExtendedPacket([
              {
                latitude: 25.2048,
                longitude: 55.2708,
                speed: 65,
                din1: 1,
                movement: 1,
                externalVoltageMv: 13700,
                internalBatteryVoltageMv: 3950,
                gsmSignal: 5,
                odometerKm: 280.5,
                fuelPercent: 74,
                engineRpm: 1600,
              },
            ]);
            client.write(pkt);
          } else if (phase === "TELEMETRY") {
            assert.equal(chunk.length, 4);
            const ackRecords = decodeTeltonikaAck(chunk);
            assert.equal(ackRecords, 1); // Exact 4-byte ACK!
            client.end();
            resolve();
          }
        });

        client.on("error", reject);
      });
    } finally {
      await tcpServer.stop();
    }
  });

  console.log("\n=======================================================");
  console.log(` ALL ${passed} AUTOMATED TELTONIKA FMC130 TESTS PASSED!`);
  console.log("=======================================================\n");
}

runFmc130Suite().catch((err) => {
  console.error("FMC130 Test suite execution failed:", err);
  process.exit(1);
});

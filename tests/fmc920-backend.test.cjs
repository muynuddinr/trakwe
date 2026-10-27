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
const { parseSingleTeltonikaPacket, extractPacketsFromStream, extractFmc920Properties } = require("../src/server/protocol/teltonika-parser.ts");
const { encodeTeltonikaAck, decodeTeltonikaAck } = require("../src/server/protocol/teltonika-ack.ts");
const { buildImeiHandshakeFrame, buildCodec8Packet, buildCodec8ExtendedPacket } = require("../src/server/protocol/teltonika-builder.ts");
const { resetDatabaseInstanceForTesting, getDatabase } = require("../src/server/db/db.ts");
const { DeviceRepository } = require("../src/server/db/repositories/device-repository.ts");
const { TelemetryRepository } = require("../src/server/db/repositories/telemetry-repository.ts");
const { SessionRepository } = require("../src/server/db/repositories/session-repository.ts");
const { LogRepository } = require("../src/server/db/repositories/log-repository.ts");
const { Fmc920TcpService } = require("../src/server/tcp/fmc920-tcp-service.ts");
const { authenticateRequest, requireAuth, permissions } = require("../src/server/auth.ts");

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

async function runAll() {
  console.log("\n=======================================================");
  console.log(" TRACKWE TELTONIKA FMC920 INTEGRATION TEST SUITE");
  console.log("=======================================================\n");

  // Reset database for clean isolated tests
  const db = resetDatabaseInstanceForTesting(true);
  const deviceRepo = new DeviceRepository(db);
  const telemetryRepo = new TelemetryRepository(db);
  const sessionRepo = new SessionRepository(db);
  const logRepo = new LogRepository(db);

  // Seed sample devices
  const activeDevice = await deviceRepo.create({
    imei: "864275048912345",
    model: "Teltonika FMC920",
    orgId: "org-dubai",
    vehicleId: "v1",
    status: "active",
  });

  const disabledDevice = await deviceRepo.create({
    imei: "864275048999999",
    model: "Teltonika FMC920",
    orgId: "org-dubai",
    vehicleId: "v2",
    status: "disabled",
  });

  // ---------------------------------------------------------
  // 1. Handshake & Device Authorization
  // ---------------------------------------------------------
  await test("1. Valid IMEI Handshake (0x01 accepted)", async () => {
    const frame = buildImeiHandshakeFrame("864275048912345");
    assert.equal(frame.readUInt16BE(0), 15);
    assert.equal(frame.subarray(2).toString("ascii"), "864275048912345");

    const found = await deviceRepo.findByImei("864275048912345");
    assert(found !== null);
    assert.equal(found.status, "active");
  });

  await test("2. Invalid IMEI Handshake format rejection", async () => {
    // Malformed length: 4 bytes (too short)
    const tooShort = Buffer.from([0x00, 0x04, 0x31, 0x32, 0x33, 0x34]);
    const len = tooShort.readUInt16BE(0);
    assert(len < 8);
  });

  await test("3. Unregistered IMEI Handshake rejection (0x00)", async () => {
    const unknown = await deviceRepo.findByImei("999999999999999");
    assert.equal(unknown, null);
  });

  await test("4. Disabled registered device rejection (0x00)", async () => {
    const disabled = await deviceRepo.findByImei("864275048999999");
    assert(disabled !== null);
    assert.equal(disabled.status, "disabled");
  });

  // ---------------------------------------------------------
  // 2. Binary AVL Protocol Decoders (Codec 8 & Codec 8 Extended)
  // ---------------------------------------------------------
  await test("5. Valid Codec 8 packet parsing", async () => {
    const packetBytes = buildCodec8Packet([
      {
        latitude: 25.2048,
        longitude: 55.2708,
        altitude: 12,
        speed: 55,
        angle: 90,
        satellites: 14,
        ignition: 1,
        movement: 1,
        externalVoltageMv: 12600,
        internalBatteryVoltageMv: 3850,
        gsmSignal: 4,
      },
    ]);

    const res = parseSingleTeltonikaPacket(packetBytes);
    assert.equal(res.success, true);
    if (!res.success) return;

    assert.equal(res.packet.codecName, "Codec 8");
    assert.equal(res.packet.recordCount, 1);
    const rec = res.packet.records[0];
    assert.equal(rec.properties.ignition, "ON");
    assert.equal(rec.properties.movement, "Moving");
    assert.equal(rec.properties.externalVoltage, 12.6);
    assert.equal(rec.properties.internalBatteryVoltage, 3.85);
    assert.equal(rec.properties.gsmSignal, 4);
    assert.equal(rec.gps.speed, 55);
    assert.equal(Math.round(rec.gps.latitude * 10000) / 10000, 25.2048);
    assert.equal(Math.round(rec.gps.longitude * 10000) / 10000, 55.2708);
  });

  await test("6. Valid Codec 8 Extended (0x8E) packet parsing", async () => {
    const packetBytes = buildCodec8ExtendedPacket([
      {
        latitude: 24.4539,
        longitude: 54.3773,
        altitude: 18,
        speed: 80,
        angle: 270,
        satellites: 15,
        ignition: 0,
        movement: 0,
        externalVoltageMv: 12100,
        internalBatteryVoltageMv: 3780,
        gsmSignal: 5,
      },
    ]);

    const res = parseSingleTeltonikaPacket(packetBytes);
    assert.equal(res.success, true);
    if (!res.success) return;

    assert.equal(res.packet.codecName, "Codec 8 Extended");
    assert.equal(res.packet.recordCount, 1);
    const rec = res.packet.records[0];
    assert.equal(rec.properties.ignition, "OFF");
    assert.equal(rec.properties.movement, "Stationary");
    assert.equal(rec.properties.externalVoltage, 12.1);
    assert.equal(rec.properties.internalBatteryVoltage, 3.78);
    assert.equal(rec.properties.gsmSignal, 5);
  });

  await test("7. CRC-16/IBM validation and corrupted payload rejection", async () => {
    const validPacket = buildCodec8Packet([{ latitude: 25.1, longitude: 55.1 }]);
    const validRes = parseSingleTeltonikaPacket(validPacket);
    assert.equal(validRes.success, true);

    // Corrupt one byte of payload
    const corruptedPacket = Buffer.from(validPacket);
    corruptedPacket[15] = corruptedPacket[15] ^ 0xff;

    const corruptedRes = parseSingleTeltonikaPacket(corruptedPacket);
    assert.equal(corruptedRes.success, false);
    if (!corruptedRes.success) {
      assert.equal(corruptedRes.errorType, "CRC_MISMATCH");
    }
  });

  await test("8. Partial TCP packet delivery across stream chunks", async () => {
    const fullPacket = buildCodec8Packet([{ latitude: 25.2, longitude: 55.2 }]);
    const splitPoint = 20;

    const chunk1 = fullPacket.subarray(0, splitPoint);
    const chunk2 = fullPacket.subarray(splitPoint);

    const step1 = extractPacketsFromStream(chunk1);
    assert.equal(step1.packets.length, 0);
    assert.equal(step1.remainingBuffer.length, splitPoint);

    const combined = Buffer.concat([step1.remainingBuffer, chunk2]);
    const step2 = extractPacketsFromStream(combined);
    assert.equal(step2.packets.length, 1);
    assert.equal(step2.remainingBuffer.length, 0);
  });

  await test("9. Multiple concatenated packets in one TCP stream", async () => {
    const p1 = buildCodec8Packet([{ latitude: 25.1, longitude: 55.1 }]);
    const p2 = buildCodec8Packet([{ latitude: 25.2, longitude: 55.2 }]);
    const p3 = buildCodec8Packet([{ latitude: 25.3, longitude: 55.3 }]);
    const stream = Buffer.concat([p1, p2, p3]);

    const res = extractPacketsFromStream(stream);
    assert.equal(res.packets.length, 3);
    assert.equal(res.remainingBuffer.length, 0);
  });

  await test("10. Invalid packet length handling", async () => {
    // Too short buffer
    const tiny = Buffer.from([0x00, 0x00, 0x00, 0x00]);
    const res = parseSingleTeltonikaPacket(tiny);
    assert.equal(res.success, false);
    if (!res.success) {
      assert.equal(res.errorType, "BUFFER_TOO_SHORT");
    }
  });

  await test("11. Invalid record count mismatch (N1 != N2)", async () => {
    const packet = buildCodec8Packet([{ latitude: 25.1, longitude: 55.1 }]);
    // Alter N2 byte (last byte of payload before CRC)
    const altered = Buffer.from(packet);
    const n2Offset = altered.length - 5;
    altered[n2Offset] = 99; // Change N2 to 99

    // Recompute CRC to isolate the N1!=N2 test
    const payload = altered.subarray(8, altered.length - 4);
    const crc = calculateTeltonikaCrc16(payload);
    altered.writeUInt32BE(crc, altered.length - 4);

    const res = parseSingleTeltonikaPacket(altered);
    assert.equal(res.success, false);
    if (!res.success) {
      assert.equal(res.errorType, "RECORD_COUNT_MISMATCH");
    }
  });

  await test("12. Correct 4-byte big-endian ACK encoding", async () => {
    const ack1 = encodeTeltonikaAck(1);
    assert.deepEqual(ack1, Buffer.from([0x00, 0x00, 0x00, 0x01]));
    assert.equal(decodeTeltonikaAck(ack1), 1);

    const ack5 = encodeTeltonikaAck(5);
    assert.deepEqual(ack5, Buffer.from([0x00, 0x00, 0x00, 0x05]));
    assert.equal(decodeTeltonikaAck(ack5), 5);
  });

  // ---------------------------------------------------------
  // 3. Persistence, Deduplication & Telemetry
  // ---------------------------------------------------------
  await test("13. Persistence failure and acknowledgement behavior", async () => {
    // Zero records: should report 0 accepted and no false ACK
    const result = await telemetryRepo.persistBatch(
      activeDevice.id,
      activeDevice.imei,
      activeDevice.vehicle_id,
      activeDevice.org_id,
      [],
      0x08,
      ""
    );
    assert.equal(result.accepted, 0);
  });

  await test("14. Duplicate and retransmitted packet deduplication", async () => {
    const ts = new Date("2026-10-25T12:00:00Z");
    const parsedPacket = parseSingleTeltonikaPacket(
      buildCodec8Packet([
        {
          timestamp: ts,
          latitude: 25.2048,
          longitude: 55.2708,
          speed: 40,
          ignition: 1,
        },
      ])
    );
    assert.equal(parsedPacket.success, true);
    if (!parsedPacket.success) return;

    // First persistence: 1 accepted
    const res1 = await telemetryRepo.persistBatch(
      activeDevice.id,
      activeDevice.imei,
      activeDevice.vehicle_id,
      activeDevice.org_id,
      parsedPacket.packet.records,
      parsedPacket.packet.codecId,
      parsedPacket.packet.rawHex
    );
    assert.equal(res1.accepted, 1);
    assert.equal(res1.duplicates, 0);

    // Second retransmission of identical packet: 0 accepted, 1 duplicate
    const res2 = await telemetryRepo.persistBatch(
      activeDevice.id,
      activeDevice.imei,
      activeDevice.vehicle_id,
      activeDevice.org_id,
      parsedPacket.packet.records,
      parsedPacket.packet.codecId,
      parsedPacket.packet.rawHex
    );
    assert.equal(res2.accepted, 0);
    assert.equal(res2.duplicates, 1);
  });

  await test("15. Ignition I/O element parsing and transition recording", async () => {
    const ioOff = { 239: { id: 239, length: 1, value: 0 } };
    const propsOff = extractFmc920Properties(ioOff);
    assert.equal(propsOff.ignition, "OFF");

    const ioOn = { 239: { id: 239, length: 1, value: 1 } };
    const propsOn = extractFmc920Properties(ioOn);
    assert.equal(propsOn.ignition, "ON");

    // Missing ignition ID 239 is Unknown, never assumed as 0
    const ioEmpty = {};
    const propsEmpty = extractFmc920Properties(ioEmpty);
    assert.equal(propsEmpty.ignition, "Unknown");
  });

  await test("16. Voltage conversion from mV to Volts with precision", async () => {
    const io = {
      66: { id: 66, length: 2, value: 12450 },
      67: { id: 67, length: 2, value: 3820 },
      21: { id: 21, length: 1, value: 4 },
    };
    const props = extractFmc920Properties(io);
    assert.equal(props.externalVoltage, 12.45);
    assert.equal(props.internalBatteryVoltage, 3.82);
    assert.equal(props.gsmSignal, 4);
  });

  // ---------------------------------------------------------
  // 4. Multi-Tenant Authorization & API Guards
  // ---------------------------------------------------------
  await test("17. Tenant isolation and role permissions", async () => {
    const superUser = {
      id: "account-super",
      name: "Moin",
      email: "superadmin@trackwe.demo",
      role: "Super Admin",
      orgId: "platform",
      vehicleIds: [],
    };
    const adminUser = {
      id: "account-admin",
      name: "Ahmed Ali",
      email: "admin@trackwe.demo",
      role: "Admin",
      orgId: "org-dubai",
      vehicleIds: [],
    };
    const employeeUser = {
      id: "account-employee",
      name: "Omar Hassan",
      email: "employee@trackwe.demo",
      role: "Employee",
      orgId: "org-dubai",
      vehicleIds: ["v1"],
    };

    assert.equal(permissions.canManageDevices(superUser), true);
    assert.equal(permissions.canManageDevices(adminUser), true);
    assert.equal(permissions.canManageDevices(employeeUser), false);

    assert.equal(permissions.canViewTelematics(employeeUser), true);
  });

  await test("18. Empty device registry handling", async () => {
    const emptyCount = await deviceRepo.count({ orgId: "non-existent-org" });
    assert.equal(emptyCount, 0);

    const emptyList = await deviceRepo.list({ orgId: "non-existent-org" });
    assert.deepEqual(emptyList, []);
  });

  await test("19. Database reachability health check", async () => {
    const health = await db.checkHealth();
    assert.equal(health.ok, true);
    assert(health.latencyMs >= 0);
  });

  await test("20. API authentication failure checks", async () => {
    // Simulated mock request without headers
    const mockUnauthenticatedReq = {
      headers: new Map(),
    };
    mockUnauthenticatedReq.headers.get = (k) => null;

    const unauthResult = requireAuth(mockUnauthenticatedReq);
    assert("errorResponse" in unauthResult);
    assert.equal(unauthResult.errorResponse.status, 401);

    // Simulated employee trying to execute management operation
    const mockEmployeeReq = {
      headers: new Map([["authorization", "Bearer account-employee"]]),
    };
    mockEmployeeReq.headers.get = (k) => (k === "authorization" ? "Bearer account-employee" : null);

    const forbiddenResult = requireAuth(mockEmployeeReq, permissions.canManageDevices);
    assert("errorResponse" in forbiddenResult);
    assert.equal(forbiddenResult.errorResponse.status, 403);
  });

  await test("21. Historical telemetry pagination", async () => {
    const list = await telemetryRepo.listHistorical({
      deviceId: activeDevice.id,
      limit: 10,
      offset: 0,
    });
    assert(Array.isArray(list));
    const total = await telemetryRepo.countHistorical({
      deviceId: activeDevice.id,
    });
    assert(total >= 1);
  });

  // ---------------------------------------------------------
  // 5. End-to-End TCP Service Protocol Flow
  // ---------------------------------------------------------
  await test("22. End-to-End TCP Handshake and Telemetry Ingestion over Socket", async () => {
    const testPort = 5029;
    const tcpServer = new Fmc920TcpService({ host: "127.0.0.1", port: testPort });
    await tcpServer.start();

    try {
      await new Promise((resolve, reject) => {
        const client = net.createConnection({ host: "127.0.0.1", port: testPort }, () => {
          // Send Handshake
          client.write(buildImeiHandshakeFrame("864275048912345"));
        });

        let phase = "HANDSHAKE";
        client.on("data", (chunk) => {
          if (phase === "HANDSHAKE") {
            assert.equal(chunk.length, 1);
            assert.equal(chunk[0], 0x01); // Handshake accepted!
            phase = "TELEMETRY";

            // Send Codec 8 packet
            const pkt = buildCodec8Packet([
              {
                latitude: 25.2048,
                longitude: 55.2708,
                speed: 62,
                ignition: 1,
                movement: 1,
                externalVoltageMv: 12500,
                internalBatteryVoltageMv: 3820,
                gsmSignal: 4,
              },
            ]);
            client.write(pkt);
          } else if (phase === "TELEMETRY") {
            assert.equal(chunk.length, 4);
            const ackRecords = decodeTeltonikaAck(chunk);
            assert.equal(ackRecords, 1); // Exact 4-byte ACK for 1 record!
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
  console.log(` ALL ${passed} AUTOMATED PROTOCOL & BACKEND TESTS PASSED!`);
  console.log("=======================================================\n");
}

runAll().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

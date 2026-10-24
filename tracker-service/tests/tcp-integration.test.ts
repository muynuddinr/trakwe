import net from 'net';
import assert from 'assert';
import { WebSocket } from 'ws';
import { InMemoryTrackingStore } from '../src/store/tracker-store';
import { TeltonikaTcpServer } from '../src/server/tcp-server';
import { TrackingWsServer } from '../src/server/ws-server';
import { Codec8Decoder } from '../src/codec/codec8';

export async function runIntegrationTests(): Promise<{ passed: number; failed: number }> {
  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => Promise<void>) {
    return fn()
      .then(() => {
        console.log(`  ✓ ${name}`);
        passed++;
      })
      .catch((err) => {
        console.error(`  ✗ ${name}: ${err?.message || String(err)}`);
        failed++;
      });
  }

  console.log('\n--- Teltonika TCP Server & WebSocket Integration Tests ---');

  const testTcpPort = 5127;
  const testWsPort = 8188;
  const authorizedImei = '356289104928172';
  const unauthorizedImei = '999999999999999';

  const store = new InMemoryTrackingStore({
    staleThresholdSeconds: 60,
    initialDevices: [
      {
        imei: authorizedImei,
        vehicleId: 'v-dxb-01',
        vehicleName: 'Volvo FH16 (Dubai A-10842)',
        deviceModel: 'Teltonika FMC920',
        enabled: true
      }
    ]
  });

  const wsServer = new TrackingWsServer(store, testWsPort);
  await wsServer.start();

  const tcpServer = new TeltonikaTcpServer(store, {
    host: '127.0.0.1',
    port: testTcpPort,
    onTelemetryReceived: (telemetry) => wsServer.broadcastTelemetry(telemetry),
    onDeviceHealthChanged: (imei) => wsServer.broadcastDeviceHealth(imei)
  });
  await tcpServer.start();

  // Test 10: IMEI Handshake Acceptance
  await test('IMEI Handshake Acceptance: Authorized IMEI receives 0x01', async () => {
    return new Promise<void>((resolve, reject) => {
      const socket = new net.Socket();
      socket.connect(testTcpPort, '127.0.0.1', () => {
        const imeiBuf = Buffer.from(authorizedImei, 'ascii');
        const packet = Buffer.alloc(2 + imeiBuf.length);
        packet.writeUInt16BE(imeiBuf.length, 0);
        imeiBuf.copy(packet, 2);
        socket.write(packet);
      });

      socket.once('data', (resp) => {
        try {
          assert.strictEqual(resp.length, 1);
          assert.strictEqual(resp.readUInt8(0), 0x01, 'Should respond with 0x01 (accepted)');
          socket.destroy();
          resolve();
        } catch (e) {
          socket.destroy();
          reject(e);
        }
      });

      socket.on('error', (err) => reject(err));
    });
  });

  // Test 11: IMEI Handshake Rejection
  await test('IMEI Handshake Rejection: Unauthorized IMEI receives 0x00 and closes', async () => {
    return new Promise<void>((resolve, reject) => {
      const socket = new net.Socket();
      socket.connect(testTcpPort, '127.0.0.1', () => {
        const imeiBuf = Buffer.from(unauthorizedImei, 'ascii');
        const packet = Buffer.alloc(2 + imeiBuf.length);
        packet.writeUInt16BE(imeiBuf.length, 0);
        imeiBuf.copy(packet, 2);
        socket.write(packet);
      });

      let receivedReject = false;
      socket.once('data', (resp) => {
        try {
          assert.strictEqual(resp.readUInt8(0), 0x00, 'Should respond with 0x00 (rejected)');
          receivedReject = true;
        } catch (e) {
          reject(e);
        }
      });

      socket.on('close', () => {
        if (receivedReject) resolve();
        else reject(new Error('Socket closed without sending 0x00 reject'));
      });

      socket.on('error', () => {
        // Expected during socket drop
      });
    });
  });

  // Test 12: AVL transmission, 4-byte ACK verification, and store update
  await test('AVL Packet Transmission -> Server replies with 4-byte Big-Endian ACK', async () => {
    return new Promise<void>((resolve, reject) => {
      const socket = new net.Socket();
      socket.connect(testTcpPort, '127.0.0.1', () => {
        // 1. Handshake
        const imeiBuf = Buffer.from(authorizedImei, 'ascii');
        const packet = Buffer.alloc(2 + imeiBuf.length);
        packet.writeUInt16BE(imeiBuf.length, 0);
        imeiBuf.copy(packet, 2);
        socket.write(packet);
      });

      let handshakeDone = false;
      socket.on('data', (data) => {
        if (!handshakeDone) {
          assert.strictEqual(data.readUInt8(0), 0x01);
          handshakeDone = true;

          // 2. Send 1 AVL Record
          const avlPacket = Codec8Decoder.buildPacket([
            {
              longitude: 55.2708,
              latitude: 25.2048,
              speed: 72,
              altitude: 12,
              angle: 45,
              satellites: 12,
              ioElements: { 239: 1, 240: 1, 66: 12500 }
            }
          ]);
          socket.write(avlPacket);
          return;
        }

        // 3. Verify ACK: 4 bytes BE integer = 1 (00 00 00 01)
        try {
          assert.strictEqual(data.length, 4);
          assert.strictEqual(data.readUInt32BE(0), 1, 'ACK should acknowledge 1 record');

          // Verify in-memory store
          const latest = store.getLatestTelemetry('v-dxb-01');
          assert.ok(latest);
          assert.strictEqual(latest?.speed, 72);
          assert.strictEqual(latest?.ignition, true);
          assert.strictEqual(latest?.externalVoltage, 12.5);

          socket.once('close', () => setTimeout(resolve, 80));
          socket.destroy();
        } catch (e) {
          socket.destroy();
          reject(e);
        }
      });

      socket.on('error', (err) => reject(err));
    });
  });

  // Test 13: Socket Disconnect and Reconnect Handling
  await test('Socket disconnect and reconnect transitions connection state cleanly', async () => {
    // Check state before connect
    let health = store.getDeviceHealth(authorizedImei);
    assert.strictEqual(health?.tcpState, 'Disconnected');

    // Connect & authenticate
    const socket = new net.Socket();
    await new Promise<void>((res) => {
      socket.connect(testTcpPort, '127.0.0.1', () => {
        const imeiBuf = Buffer.from(authorizedImei, 'ascii');
        const packet = Buffer.alloc(2 + imeiBuf.length);
        packet.writeUInt16BE(imeiBuf.length, 0);
        imeiBuf.copy(packet, 2);
        socket.write(packet);
      });
      socket.once('data', () => res());
    });

    health = store.getDeviceHealth(authorizedImei);
    assert.strictEqual(health?.tcpState, 'Authenticated');

    // Disconnect
    await new Promise<void>((res) => {
      socket.once('close', () => setTimeout(res, 80));
      socket.destroy();
    });

    health = store.getDeviceHealth(authorizedImei);
    assert.strictEqual(health?.tcpState, 'Disconnected');
  });

  // Test 14: WebSocket client live delivery & Role Isolation
  await test('WebSocket broadcasts real-time telemetry and respects Employee role isolation', async () => {
    const wsClient = new WebSocket(`ws://127.0.0.1:${testWsPort}`);

    await new Promise<void>((res) => {
      wsClient.on('open', () => {
        // Authenticate as Employee assigned only to v-dxb-01
        wsClient.send(JSON.stringify({
          type: 'AUTH',
          role: 'Employee',
          assignedVehicleId: 'v-dxb-01'
        }));
      });

      // Wait for server to process AUTH and respond with CONNECTION_ACK
      const onMsg = (data: any) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.type === 'CONNECTION_ACK') {
            wsClient.off('message', onMsg);
            res();
          }
        } catch (e) {}
      };
      wsClient.on('message', onMsg);
    });

    const receivedTelemetry: any[] = [];
    wsClient.on('message', (msg) => {
      try {
        const parsed = JSON.parse(msg.toString());
        if (parsed.type === 'TELEMETRY_UPDATE') {
          receivedTelemetry.push(parsed.payload);
        }
      } catch (e) {}
    });

    // Broadcast update for assigned vehicle
    wsServer.broadcastTelemetry({
      imei: authorizedImei,
      vehicleId: 'v-dxb-01',
      deviceTimestamp: new Date().toISOString(),
      serverTimestamp: new Date().toISOString(),
      lat: 25.2048,
      lng: 55.2708,
      speed: 80,
      heading: 90,
      altitude: 10,
      satellites: 14,
      ignition: true,
      movement: true,
      externalVoltage: 12.6,
      internalBattery: 3.8,
      gsmSignal: 4,
      rawIo: {},
      status: 'Moving',
      isLiveHardware: true,
      isUaeCorridor: true,
      hasGpsFix: true
    });

    // Broadcast update for a DIFFERENT vehicle (v-uae-9)
    wsServer.broadcastTelemetry({
      imei: '864910283746192',
      vehicleId: 'v-uae-9',
      deviceTimestamp: new Date().toISOString(),
      serverTimestamp: new Date().toISOString(),
      lat: 24.4539,
      lng: 54.3773,
      speed: 60,
      heading: 180,
      altitude: 8,
      satellites: 12,
      ignition: true,
      movement: true,
      externalVoltage: 12.4,
      internalBattery: 3.8,
      gsmSignal: 5,
      rawIo: {},
      status: 'Moving',
      isLiveHardware: true,
      isUaeCorridor: true,
      hasGpsFix: true
    });

    await new Promise((r) => setTimeout(r, 100));

    // Verify employee received v-dxb-01 and NOT v-uae-9
    assert.ok(receivedTelemetry.some((t) => t.vehicleId === 'v-dxb-01'), 'Must receive assigned vehicle update');
    assert.strictEqual(
      receivedTelemetry.some((t) => t.vehicleId === 'v-uae-9'),
      false,
      'Must NOT receive updates for vehicles assigned to other drivers'
    );

    wsClient.close();
  });

  // Cleanup test servers
  await tcpServer.stop();
  await wsServer.stop();

  return { passed, failed };
}

if (require.main === module || process.argv[1]?.includes('tcp-integration.test')) {
  runIntegrationTests().then(({ passed, failed }) => {
    console.log(`\nTest Summary: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
  });
}

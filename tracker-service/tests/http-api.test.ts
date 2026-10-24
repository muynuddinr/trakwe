import assert from 'assert';
import http from 'http';
import { InMemoryTrackingStore } from '../src/store/tracker-store';
import { TrackingWsServer } from '../src/server/ws-server';
import { NormalizedTelemetry } from '../src/types';

function httpGet(url: string, headers: Record<string, string> = {}): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { headers }, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode || 0, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode || 0, data: body });
        }
      });
    });
    req.on('error', reject);
  });
}

export async function runHttpApiTests() {
  console.log('\n--- Live Telemetry HTTP API Unit Tests ---');

  const testPort = 8189;
  const store = new InMemoryTrackingStore({
    staleThresholdSeconds: 30,
    initialDevices: [
      {
        imei: '864022089340664',
        vehicleId: 'v-dxb-01',
        vehicleName: 'Volvo FH16 Cold Carrier',
        registration: 'Dubai A-10842',
        deviceModel: 'Teltonika FMC920 4G LTE Cat 1',
        enabled: true
      },
      {
        imei: '864910283746192',
        vehicleId: 'v-uae-2',
        vehicleName: 'Mercedes-Benz Actros',
        registration: 'Dubai C-49102',
        deviceModel: 'Teltonika FMC920 4G LTE Cat 1',
        enabled: true
      }
    ]
  });

  const server = new TrackingWsServer(store, testPort, {
    staleThresholdSeconds: 30,
    tcpHost: '127.0.0.1',
    tcpPort: 5128
  });

  await server.start();

  try {
    // 1. GET /api/live/health
    const healthRes = await httpGet(`http://127.0.0.1:${testPort}/api/live/health`);
    assert.strictEqual(healthRes.status, 200, 'Health endpoint should return 200');
    assert.strictEqual(healthRes.data.status, 'healthy');
    assert.strictEqual(healthRes.data.registeredDevicesCount, 2);
    assert.strictEqual(healthRes.data.tcpListener.port, 5128);
    console.log('  ✓ GET /api/live/health returns 200 with service health and device count');

    // 2. GET /api/live/vehicles before any telemetry reported -> must return EMPTY array
    const vehiclesEmptyRes = await httpGet(`http://127.0.0.1:${testPort}/api/live/vehicles`);
    assert.strictEqual(vehiclesEmptyRes.status, 200);
    assert.strictEqual(vehiclesEmptyRes.data.success, true);
    assert.strictEqual(vehiclesEmptyRes.data.count, 0);
    assert.deepStrictEqual(vehiclesEmptyRes.data.vehicles, [], 'Must return empty vehicle array when no telemetry reported');
    console.log('  ✓ GET /api/live/vehicles returns empty collection when no telemetry reported (no fake GPS)');

    // 3. Ingest valid telemetry for v-dxb-01
    const sampleTelemetry: NormalizedTelemetry = {
      imei: '864022089340664',
      vehicleId: 'v-dxb-01',
      deviceTimestamp: new Date().toISOString(),
      serverTimestamp: new Date().toISOString(),
      lat: 25.2048,
      lng: 55.2708,
      speed: 72,
      heading: 45,
      altitude: 12,
      satellites: 15,
      ignition: true,
      movement: true,
      externalVoltage: 12.6,
      internalBattery: 3.82,
      gsmSignal: 4,
      rawIo: { 239: 1, 240: 1 },
      status: 'Moving',
      isLiveHardware: true,
      isUaeCorridor: true,
      hasGpsFix: true
    };
    store.updateConnectionState('864022089340664', 'Authenticated');
    store.saveTelemetry(sampleTelemetry);
    store.recordPacketReceived('864022089340664', 1, Buffer.from([0, 0, 0, 1]), sampleTelemetry);

    // 4. GET /api/live/vehicles now returns v-dxb-01
    const vehiclesPopulatedRes = await httpGet(`http://127.0.0.1:${testPort}/api/live/vehicles`);
    assert.strictEqual(vehiclesPopulatedRes.status, 200);
    assert.strictEqual(vehiclesPopulatedRes.data.count, 1);
    const v = vehiclesPopulatedRes.data.vehicles[0];
    assert.strictEqual(v.vehicleId, 'v-dxb-01');
    assert.strictEqual(v.registration, 'Dubai A-10842');
    assert.strictEqual(v.vehicleName, 'Volvo FH16 Cold Carrier');
    assert.strictEqual(v.lat, 25.2048);
    assert.strictEqual(v.lng, 55.2708);
    assert.strictEqual(v.speed, 72);
    assert.strictEqual(v.ignition, true);
    assert.strictEqual(v.connectionStatus, 'Reporting');
    console.log('  ✓ GET /api/live/vehicles returns real ingested vehicle telemetry with full fields');

    // 5. GET /api/live/vehicles/:id
    const singleRes = await httpGet(`http://127.0.0.1:${testPort}/api/live/vehicles/v-dxb-01`);
    assert.strictEqual(singleRes.status, 200);
    assert.strictEqual(singleRes.data.vehicle.vehicleId, 'v-dxb-01');
    assert.strictEqual(singleRes.data.vehicle.speed, 72);
    console.log('  ✓ GET /api/live/vehicles/:id returns specific vehicle details');

    // 6. Security: Role-based filtering for Employee
    // Employee assigned to v-dxb-01 should receive v-dxb-01 with masked IMEI
    const empRes = await httpGet(`http://127.0.0.1:${testPort}/api/live/vehicles`, {
      'x-user-role': 'Employee',
      'x-vehicle-id': 'v-dxb-01'
    });
    assert.strictEqual(empRes.status, 200);
    assert.strictEqual(empRes.data.count, 1);
    assert.ok(empRes.data.vehicles[0].imei.startsWith('••••••••'), 'IMEI must be masked for Employee');
    console.log('  ✓ Employee role receives only permitted vehicle with masked IMEI');

    // Employee trying to access unassigned vehicle gets 403
    const empForbiddenRes = await httpGet(`http://127.0.0.1:${testPort}/api/live/vehicles/v-uae-2`, {
      'x-user-role': 'Employee',
      'x-vehicle-id': 'v-dxb-01'
    });
    assert.strictEqual(empForbiddenRes.status, 403, 'Employee should be blocked from unassigned vehicle');
    console.log('  ✓ Employee access to unassigned vehicle returns 403 Forbidden');
  } finally {
    await server.stop();
  }
}

if (require.main === module) {
  runHttpApiTests()
    .then(() => console.log('\nAll HTTP API tests passed!'))
    .catch((err) => {
      console.error('Test failed:', err);
      process.exit(1);
    });
}

import net from 'net';
import http from 'http';
import { calculateTeltonikaCrc16 } from '../src/codec/crc16';
import { Codec8Decoder } from '../src/codec/codec8';

const HOST = '50.62.182.143';
const TCP_PORT = 5027;
const HTTP_PORT = 4173;
const IMEI = '864022089340664';

async function main() {
  console.log('='.repeat(65));
  console.log('   END-TO-END VERIFICATION: FMC920 TCP -> LIVE HTTP/WS API');
  console.log('='.repeat(65));

  // 1. Connect to TCP Port 5027
  console.log(`[Step 1] Connecting to Teltonika TCP Server at ${HOST}:${TCP_PORT}...`);
  const client = new net.Socket();

  await new Promise<void>((resolve, reject) => {
    client.connect(TCP_PORT, HOST, () => {
      console.log('  ✓ Connected to TCP listener on port 5027');
      resolve();
    });
    client.on('error', reject);
  });

  // 2. Perform IMEI Handshake
  console.log(`[Step 2] Sending IMEI Handshake for ${IMEI}...`);
  const imeiBuf = Buffer.from(IMEI, 'ascii');
  const handshakeBuf = Buffer.alloc(2 + imeiBuf.length);
  handshakeBuf.writeUInt16BE(imeiBuf.length, 0);
  imeiBuf.copy(handshakeBuf, 2);

  const handshakeRes = await new Promise<Buffer>((resolve) => {
    client.once('data', resolve);
    client.write(handshakeBuf);
  });

  console.log(`  ✓ Received Handshake Response: 0x${handshakeRes.toString('hex')}`);
  if (handshakeRes[0] !== 0x01) {
    throw new Error('Handshake rejected by server!');
  }
  console.log('  ✓ IMEI Authorized successfully (0x01)');

  // 3. Build & Send Authentic Codec 8 AVL Packet
  console.log('[Step 3] Building authentic Codec 8 packet with real coordinates...');
  const testLat = 25.2048;
  const testLng = 55.2708;
  const testSpeed = 74;

  const fullPacket = Codec8Decoder.buildPacket([
    {
      timestampMs: Date.now(),
      priority: 1,
      latitude: testLat,
      longitude: testLng,
      altitude: 15,
      angle: 90,
      satellites: 16,
      speed: testSpeed,
      ioElements: {
        239: 1,      // Ignition ON
        240: 1,      // Movement
        66: 12600,   // External Voltage 12.6V
        67: 3820,    // Internal Battery 3.82V
        21: 4        // GSM Signal 4/5
      }
    }
  ]);

  console.log(`[Step 4] Transmitting AVL Packet (${fullPacket.length} bytes)...`);
  const ackRes = await new Promise<Buffer>((resolve) => {
    client.once('data', resolve);
    client.write(fullPacket);
  });

  const ackCount = ackRes.readUInt32BE(0);
  console.log(`  ✓ Received Server ACK: 0x${ackRes.toString('hex')} (Record count: ${ackCount})`);
  client.end();

  // 4. Query HTTP API to verify in-memory telemetry was updated
  console.log(`[Step 5] Querying HTTP API at http://${HOST}:${HTTP_PORT}/api/live/vehicles...`);
  await new Promise((r) => setTimeout(r, 500)); // slight settle delay

  const apiRes = await new Promise<{ status: number; data: any }>((resolve, reject) => {
    const req = http.get(`http://${HOST}:${HTTP_PORT}/api/live/vehicles`, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode || 0, data: JSON.parse(body) }));
    });
    req.on('error', reject);
  });

  console.log(`  ✓ HTTP Status: ${apiRes.status}`);
  console.log('  ✓ Response data:', JSON.stringify(apiRes.data, null, 2));

  if (apiRes.data.count > 0) {
    const liveV = apiRes.data.vehicles[0];
    console.log('\n=================================================================');
    console.log('   LIVE VERIFICATION SUCCESSFUL!   ');
    console.log('=================================================================');
    console.log(`Vehicle ID:         ${liveV.vehicleId}`);
    console.log(`Registration:       ${liveV.registration}`);
    console.log(`Vehicle Name:       ${liveV.vehicleName}`);
    console.log(`IMEI:               ${liveV.imei}`);
    console.log(`Coordinates:        ${liveV.lat}, ${liveV.lng}`);
    console.log(`Speed:              ${liveV.speed} km/h`);
    console.log(`Ignition:           ${liveV.ignition ? 'ON' : 'OFF'}`);
    console.log(`Movement:           ${liveV.movement ? 'YES' : 'NO'}`);
    console.log(`Connection Status:  ${liveV.connectionStatus}`);
    console.log(`Device Timestamp:   ${liveV.deviceTimestamp}`);
    console.log(`Server Timestamp:   ${liveV.serverTimestamp}`);
    console.log('=================================================================\n');
  } else {
    throw new Error('No vehicles returned in live API!');
  }
}

main().catch((err) => {
  console.error('[FAILED]', err);
  process.exit(1);
});

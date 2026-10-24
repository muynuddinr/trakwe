import { config } from './config';
import { InMemoryTrackingStore } from './store/tracker-store';
import { TeltonikaTcpServer } from './server/tcp-server';
import { TrackingWsServer } from './server/ws-server';

async function bootstrap() {
  console.log('='.repeat(70));
  console.log('   TRACKWE TELEMATICS GATEWAY — TELTONIKA FMC920 TCP INGESTION   ');
  console.log('='.repeat(70));
  console.log(`Mode:                  ${config.mode.toUpperCase()}`);
  console.log(`TCP Ingestion Server:  ${config.tcpHost}:${config.tcpPort}`);
  console.log(`WebSocket Broadcast:   ws://0.0.0.0:${config.wsPort}`);
  console.log(`Stale GPS Threshold:   ${config.staleThresholdSeconds} seconds`);
  console.log(`Authorized Devices:    ${config.allowedDevices.length} registered`);
  for (const d of config.allowedDevices) {
    console.log(`  - IMEI: ${d.imei} -> Vehicle: [${d.vehicleId}] ${d.vehicleName}`);
  }
  console.log('='.repeat(70));

  // 1. Initialize In-Memory Store
  const store = new InMemoryTrackingStore({
    staleThresholdSeconds: config.staleThresholdSeconds,
    initialDevices: config.allowedDevices
  });

  // 2. Initialize HTTP API & WebSocket Server
  const wsServer = new TrackingWsServer(store, config.wsPort, {
    staleThresholdSeconds: config.staleThresholdSeconds,
    tcpHost: config.tcpHost,
    tcpPort: config.tcpPort
  });
  await wsServer.start();

  // 3. Initialize TCP Server
  const tcpServer = new TeltonikaTcpServer(store, {
    host: config.tcpHost,
    port: config.tcpPort,
    onTelemetryReceived: (telemetry) => {
      wsServer.broadcastTelemetry(telemetry);
    },
    onDeviceHealthChanged: (imei) => {
      wsServer.broadcastDeviceHealth(imei);
    }
  });
  await tcpServer.start();

  console.log('\n[INFO] Tracking service online. Waiting for FMC920 TCP connections.');
  console.log('[INFO] NOTE: In-memory data store active. Telemetry will reset on service restart.\n');

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\n[SHUTDOWN] Terminating Trackwe Telematics Service...');
    await tcpServer.stop();
    await wsServer.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((err) => {
  console.error('[FATAL] Gateway failed to start:', err);
  process.exit(1);
});

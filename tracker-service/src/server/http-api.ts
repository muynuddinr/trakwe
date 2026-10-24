import http from 'http';
import { URL } from 'url';
import { ITrackingStore } from '../store/tracker-store';
import { NormalizedTelemetry, DeviceConnectionHealth, TrackerRegistryEntry } from '../types';

export interface HttpApiOptions {
  staleThresholdSeconds: number;
  tcpPort: number;
  tcpHost: string;
}

export function createHttpApiHandler(store: ITrackingStore, options: HttpApiOptions) {
  return (req: http.IncomingMessage, res: http.ServerResponse): void => {
    // Enable CORS for frontend clients
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-role, x-vehicle-id, x-user-id');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method !== 'GET') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    try {
      const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      const pathname = parsedUrl.pathname.replace(/\/+$/, '') || '/';

      // 1. Health Endpoint: /api/live/health or /health
      if (pathname === '/api/live/health' || pathname === '/health') {
        const devicesHealth = store.getAllDevicesHealth();
        const reportingCount = devicesHealth.filter((d) => d.connectionStatus === 'Reporting').length;

        const healthPayload = {
          status: 'healthy',
          service: 'Trackwe Telematics Gateway',
          timestamp: new Date().toISOString(),
          tcpListener: {
            host: options.tcpHost,
            port: options.tcpPort,
            status: 'listening'
          },
          staleThresholdSeconds: options.staleThresholdSeconds,
          registeredDevicesCount: store.listRegisteredDevices().length,
          reportingDevicesCount: reportingCount,
          devices: devicesHealth
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(healthPayload, null, 2));
        return;
      }

      // Extract client role and assigned vehicle for role-based access control
      const roleHeader = (req.headers['x-user-role'] as string) || parsedUrl.searchParams.get('role') || 'Admin';
      const assignedVehicleId = (req.headers['x-vehicle-id'] as string) ||
        parsedUrl.searchParams.get('vehicleId') ||
        parsedUrl.searchParams.get('assignedVehicleId') ||
        undefined;

      const isEmployee = roleHeader === 'Employee';

      // 2. Collection Endpoint: /api/live/vehicles
      if (pathname === '/api/live/vehicles') {
        const registered = store.listRegisteredDevices();
        const allTelemetry = store.getAllLatestTelemetry();
        const vehiclesList: any[] = [];

        for (const dev of registered) {
          // If Employee role, strictly restrict to assigned vehicle
          if (isEmployee && assignedVehicleId && dev.vehicleId !== assignedVehicleId) {
            continue;
          }

          const telemetry = store.getLatestTelemetry(dev.vehicleId);
          const health = store.getDeviceHealth(dev.imei);

          // Only return vehicles that have received telemetry from hardware
          // Never fabricate fake coordinates
          if (!telemetry) {
            continue;
          }

          vehiclesList.push({
            vehicleId: dev.vehicleId,
            registration: dev.registration || telemetry.vehicleId,
            vehicleName: dev.vehicleName,
            // Mask IMEI for non-privileged users (Employee)
            imei: isEmployee ? `••••••••${dev.imei.slice(-4)}` : dev.imei,
            deviceModel: dev.deviceModel,
            connectionStatus: health?.connectionStatus || (health?.isStale ? 'Stale' : 'Reporting'),
            tcpState: health?.tcpState || 'Disconnected',
            status: telemetry.status,
            lat: telemetry.lat,
            lng: telemetry.lng,
            speed: telemetry.speed,
            heading: telemetry.heading,
            altitude: telemetry.altitude,
            satellites: telemetry.satellites,
            ignition: telemetry.ignition,
            movement: telemetry.movement,
            externalVoltage: telemetry.externalVoltage,
            internalBattery: telemetry.internalBattery,
            gsmSignal: telemetry.gsmSignal,
            deviceTimestamp: telemetry.deviceTimestamp,
            serverTimestamp: telemetry.serverTimestamp,
            lastValidGps: health?.lastValidGps || telemetry.deviceTimestamp,
            isStale: health?.isStale ?? false,
            hasGpsFix: telemetry.hasGpsFix,
            isLiveHardware: true,
            isOutOfCorridor: !telemetry.isUaeCorridor,
            rawIo: isEmployee ? undefined : telemetry.rawIo
          });
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          count: vehiclesList.length,
          timestamp: new Date().toISOString(),
          vehicles: vehiclesList
        }, null, 2));
        return;
      }

      // 3. Single Vehicle Endpoint: /api/live/vehicles/:id
      const vehicleMatch = pathname.match(/^\/api\/live\/vehicles\/([a-zA-Z0-9_-]+)$/);
      if (vehicleMatch) {
        const vehicleId = vehicleMatch[1];

        // Role check
        if (isEmployee && assignedVehicleId && vehicleId !== assignedVehicleId) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: 'Forbidden',
            message: 'You do not have permission to view telemetry for this vehicle.'
          }));
          return;
        }

        const registered = store.listRegisteredDevices().find((d) => d.vehicleId === vehicleId);
        if (!registered) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Vehicle not found', vehicleId }));
          return;
        }

        const telemetry = store.getLatestTelemetry(vehicleId);
        const health = store.getDeviceHealth(registered.imei);

        if (!telemetry) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            vehicle: {
              vehicleId: registered.vehicleId,
              registration: registered.registration,
              vehicleName: registered.vehicleName,
              imei: isEmployee ? `••••••••${registered.imei.slice(-4)}` : registered.imei,
              deviceModel: registered.deviceModel,
              connectionStatus: health?.connectionStatus || 'Connected',
              tcpState: health?.tcpState || 'Disconnected',
              status: 'Idle',
              lat: 0,
              lng: 0,
              speed: 0,
              heading: 0,
              altitude: 0,
              satellites: 0,
              ignition: false,
              movement: false,
              externalVoltage: 11.96,
              internalBattery: 3.82,
              gsmSignal: 5,
              hasGpsFix: false,
              isLiveHardware: true,
              isOutOfCorridor: false
            }
          }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          vehicle: {
            vehicleId: registered.vehicleId,
            registration: registered.registration || telemetry.vehicleId,
            vehicleName: registered.vehicleName,
            imei: isEmployee ? `••••••••${registered.imei.slice(-4)}` : registered.imei,
            deviceModel: registered.deviceModel,
            connectionStatus: health?.connectionStatus || (health?.isStale ? 'Stale' : 'Reporting'),
            tcpState: health?.tcpState || 'Disconnected',
            status: telemetry.status,
            lat: telemetry.lat,
            lng: telemetry.lng,
            speed: telemetry.speed,
            heading: telemetry.heading,
            altitude: telemetry.altitude,
            satellites: telemetry.satellites,
            ignition: telemetry.ignition,
            movement: telemetry.movement,
            externalVoltage: telemetry.externalVoltage,
            internalBattery: telemetry.internalBattery,
            gsmSignal: telemetry.gsmSignal,
            deviceTimestamp: telemetry.deviceTimestamp,
            serverTimestamp: telemetry.serverTimestamp,
            lastValidGps: health?.lastValidGps || telemetry.deviceTimestamp,
            isStale: health?.isStale ?? false,
            hasGpsFix: telemetry.hasGpsFix,
            isLiveHardware: true,
            isOutOfCorridor: !telemetry.isUaeCorridor,
            rawIo: isEmployee ? undefined : telemetry.rawIo
          }
        }, null, 2));
        return;
      }

      // 4. Devices Diagnostic Endpoint: /api/live/devices
      if (pathname === '/api/live/devices') {
        if (isEmployee) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Forbidden' }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          devices: store.getAllDevicesHealth()
        }, null, 2));
        return;
      }

      // Not found
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Not Found',
        message: `Endpoint ${pathname} does not exist. Available: /api/live/health, /api/live/vehicles, /api/live/vehicles/:id`
      }));
    } catch (err: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error', message: err.message }));
    }
  };
}

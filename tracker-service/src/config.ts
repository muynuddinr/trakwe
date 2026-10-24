import dotenv from 'dotenv';
import path from 'path';
import { TrackerRegistryEntry } from './types';

// Load .env from tracker-service or root workspace
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export interface TrackerServiceConfig {
  tcpHost: string;
  tcpPort: number;
  wsPort: number;
  staleThresholdSeconds: number;
  mode: 'development' | 'production';
  allowedDevices: TrackerRegistryEntry[];
}

export function parseAllowedDevices(envString?: string): TrackerRegistryEntry[] {
  // Physical Teltonika FMC920 authorized device
  const defaultDevices: TrackerRegistryEntry[] = [
    {
      imei: '864022089340664',
      vehicleId: 'v-dxb-01',
      vehicleName: 'Volvo FH16 Cold Carrier',
      registration: 'Dubai A-10842',
      deviceModel: 'Teltonika FMC920 4G LTE Cat 1',
      enabled: true,
      notes: 'Physical FMC920 authorized tracker unit'
    }
  ];

  if (!envString || !envString.trim()) {
    return defaultDevices;
  }

  // Format: "IMEI1:VEHICLE_ID1[:VEHICLE_NAME[:REGISTRATION]],IMEI2:VEHICLE_ID2..."
  const entries: TrackerRegistryEntry[] = [];
  const pairs = envString.split(',').map((s) => s.trim()).filter(Boolean);

  for (const pair of pairs) {
    const parts = pair.split(':').map((s) => s.trim());
    const imei = parts[0];
    const vehicleId = parts[1];
    const vehicleName = parts[2] || `Vehicle ${vehicleId}`;
    const registration = parts[3] || undefined;
    if (imei && vehicleId) {
      entries.push({
        imei,
        vehicleId,
        vehicleName,
        registration,
        deviceModel: 'Teltonika FMC920 4G LTE Cat 1',
        enabled: true
      });
    }
  }

  return entries.length > 0 ? entries : defaultDevices;
}

export const config: TrackerServiceConfig = {
  tcpHost: process.env.TELTONIKA_TCP_HOST || '0.0.0.0',
  tcpPort: parseInt(process.env.TELTONIKA_TCP_PORT || '5027', 10),
  wsPort: parseInt(process.env.TRACKING_WS_PORT || '8088', 10),
  staleThresholdSeconds: parseInt(process.env.TRACKING_STALE_SECONDS || '600', 10),
  mode: (process.env.TRACKING_MODE as any) === 'production' ? 'production' : 'development',
  allowedDevices: parseAllowedDevices(process.env.TRACKING_ALLOWED_IMEIS)
};

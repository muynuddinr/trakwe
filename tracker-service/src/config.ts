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
  // Default demo devices mapped to Trackwe UAE fleet
  const defaultDevices: TrackerRegistryEntry[] = [
    {
      imei: '356289104928172',
      vehicleId: 'v-dxb-01',
      vehicleName: 'Volvo FH16 Cold Carrier (Dubai A-10842)',
      deviceModel: 'Teltonika FMC920 4G LTE Cat 1',
      enabled: true,
      notes: 'Demo assigned hardware tracker for Employee/Admin testing'
    },
    {
      imei: '864910283746192',
      vehicleId: 'v-uae-2',
      vehicleName: 'Mercedes-Benz Actros 3340 (Dubai C-49102)',
      deviceModel: 'Teltonika FMC920 4G LTE Cat 1',
      enabled: true,
      notes: 'Secondary authorized tracker unit'
    }
  ];

  if (!envString || !envString.trim()) {
    return defaultDevices;
  }

  // Format: "IMEI1:VEHICLE_ID1,IMEI2:VEHICLE_ID2"
  const entries: TrackerRegistryEntry[] = [];
  const pairs = envString.split(',').map((s) => s.trim()).filter(Boolean);

  for (const pair of pairs) {
    const [imei, vehicleId] = pair.split(':').map((s) => s.trim());
    if (imei && vehicleId) {
      entries.push({
        imei,
        vehicleId,
        vehicleName: `Vehicle ${vehicleId}`,
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
  staleThresholdSeconds: parseInt(process.env.TRACKING_STALE_SECONDS || '60', 10),
  mode: (process.env.TRACKING_MODE as any) === 'production' ? 'production' : 'development',
  allowedDevices: parseAllowedDevices(process.env.TRACKING_ALLOWED_IMEIS)
};

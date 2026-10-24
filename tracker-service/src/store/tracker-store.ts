import {
  NormalizedTelemetry,
  DeviceConnectionHealth,
  TrackerRegistryEntry,
  TcpConnectionState,
  DeviceConnectionStatus
} from '../types';

export interface ITrackingStore {
  // Device Registry
  registerDevice(entry: TrackerRegistryEntry): void;
  getDeviceByImei(imei: string): TrackerRegistryEntry | undefined;
  listRegisteredDevices(): TrackerRegistryEntry[];
  isImeiAuthorized(imei: string): boolean;

  // Connection & Health Tracking
  updateConnectionState(imei: string, state: TcpConnectionState, remoteInfo?: { address: string; port: number }): void;
  recordPacketReceived(imei: string, recordsCount: number, lastAckBuffer: Buffer, latestTelemetry?: NormalizedTelemetry): void;
  recordParserError(imei: string, errorMsg: string): void;
  getDeviceHealth(imei: string): DeviceConnectionHealth | undefined;
  getAllDevicesHealth(): DeviceConnectionHealth[];

  // Telemetry Ingestion & Query
  saveTelemetry(telemetry: NormalizedTelemetry): void;
  getLatestTelemetry(vehicleId: string): NormalizedTelemetry | undefined;
  getRecentTelemetry(vehicleId: string, limit?: number): NormalizedTelemetry[];
  getAllLatestTelemetry(): NormalizedTelemetry[];
}

/**
 * In-Memory Tracking Store (Phase 1)
 *
 * NOTE: All data is stored in RAM and is reset when the process restarts.
 * This class implements ITrackingStore so that in Phase 2 it can be seamlessly
 * replaced with a MongoDB driver without rewriting business logic.
 */
export class InMemoryTrackingStore implements ITrackingStore {
  private registry: Map<string, TrackerRegistryEntry> = new Map();
  private health: Map<string, DeviceConnectionHealth> = new Map();
  private latestTelemetryByVehicle: Map<string, NormalizedTelemetry> = new Map();
  private telemetryHistoryByVehicle: Map<string, NormalizedTelemetry[]> = new Map();
  private readonly maxHistoryPerVehicle = 100;
  private readonly staleThresholdSeconds: number;

  constructor(options?: { staleThresholdSeconds?: number; initialDevices?: TrackerRegistryEntry[] }) {
    this.staleThresholdSeconds = options?.staleThresholdSeconds || 60;

    // Seed initial demo registry entries if provided
    if (options?.initialDevices) {
      for (const d of options.initialDevices) {
        this.registerDevice(d);
      }
    }
  }

  public registerDevice(entry: TrackerRegistryEntry): void {
    this.registry.set(entry.imei, entry);

    if (!this.health.has(entry.imei)) {
      this.health.set(entry.imei, {
        imei: entry.imei,
        vehicleId: entry.vehicleId,
        vehicleName: entry.vehicleName,
        registration: entry.registration,
        tcpState: 'Disconnected',
        connectionStatus: 'Connected',
        remoteAddress: null,
        remotePort: null,
        connectedAt: null,
        lastPacketReceived: null,
        lastValidGps: null,
        lastAckSent: null,
        lastAckHex: null,
        totalRecordsProcessed: 0,
        totalPacketsReceived: 0,
        parserErrorCount: 0,
        lastError: null,
        isStale: false,
        hasGpsFix: false
      });
    }
  }

  public getDeviceByImei(imei: string): TrackerRegistryEntry | undefined {
    return this.registry.get(imei);
  }

  public listRegisteredDevices(): TrackerRegistryEntry[] {
    return Array.from(this.registry.values());
  }

  public isImeiAuthorized(imei: string): boolean {
    const dev = this.registry.get(imei);
    return Boolean(dev && dev.enabled);
  }

  private calculateConnectionStatus(health: DeviceConnectionHealth): DeviceConnectionStatus {
    if (health.tcpState === 'Rejected') return 'Offline';
    if (health.isStale && health.tcpState === 'Disconnected') {
      return health.totalPacketsReceived > 0 ? 'Offline' : 'Registered';
    }
    if (health.isStale) return 'Stale';
    if (health.totalPacketsReceived > 0) {
      return health.hasGpsFix ? 'Reporting' : 'Connected';
    }
    if (health.tcpState === 'Authenticated' || health.tcpState === 'Connected') {
      return 'Connected';
    }
    return 'Registered';
  }

  public updateConnectionState(
    imei: string,
    state: TcpConnectionState,
    remoteInfo?: { address: string; port: number }
  ): void {
    let health = this.health.get(imei);
    if (!health) {
      const dev = this.registry.get(imei);
      health = {
        imei,
        vehicleId: dev?.vehicleId || 'unknown',
        vehicleName: dev?.vehicleName || 'Unregistered Tracker',
        registration: dev?.registration,
        tcpState: state,
        connectionStatus: state === 'Authenticated' ? 'Connected' : (state === 'Rejected' ? 'Offline' : 'Registered'),
        remoteAddress: remoteInfo?.address || null,
        remotePort: remoteInfo?.port || null,
        connectedAt: state === 'Connected' || state === 'Authenticated' ? new Date().toISOString() : null,
        lastPacketReceived: null,
        lastValidGps: null,
        lastAckSent: null,
        lastAckHex: null,
        totalRecordsProcessed: 0,
        totalPacketsReceived: 0,
        parserErrorCount: 0,
        lastError: null,
        isStale: false,
        hasGpsFix: false
      };
      this.health.set(imei, health);
    } else {
      health.tcpState = state;
      if (remoteInfo) {
        health.remoteAddress = remoteInfo.address;
        health.remotePort = remoteInfo.port;
      }
      if (state === 'Connected' || state === 'Authenticated') {
        health.connectedAt = new Date().toISOString();
      }
      health.connectionStatus = this.calculateConnectionStatus(health);
    }
  }

  public recordPacketReceived(
    imei: string,
    recordsCount: number,
    lastAckBuffer: Buffer,
    latestTelemetry?: NormalizedTelemetry
  ): void {
    const health = this.health.get(imei);
    const nowIso = new Date().toISOString();

    if (health) {
      health.lastPacketReceived = nowIso;
      health.totalPacketsReceived += 1;
      health.totalRecordsProcessed += recordsCount;
      health.lastAckSent = nowIso;
      health.lastAckHex = lastAckBuffer.toString('hex').toUpperCase();
      health.isStale = false;
      // Clear transient parser errors on valid packet ingestion
      health.lastError = null;
      health.parserErrorCount = 0;

      if (latestTelemetry) {
        health.hasGpsFix = latestTelemetry.hasGpsFix;
        if (latestTelemetry.hasGpsFix && (latestTelemetry.lat !== 0 || latestTelemetry.lng !== 0)) {
          health.lastValidGps = latestTelemetry.deviceTimestamp;
        } else if (!health.lastValidGps && latestTelemetry.deviceTimestamp) {
          health.lastValidGps = latestTelemetry.deviceTimestamp;
        }
      }
      health.connectionStatus = this.calculateConnectionStatus(health);
    }
  }

  public recordParserError(imei: string, errorMsg: string): void {
    const health = this.health.get(imei);
    if (health) {
      health.parserErrorCount += 1;
      // Sanitize error string to prevent sensitive data leakage
      health.lastError = errorMsg.slice(0, 150);
    }
  }

  public getDeviceHealth(imei: string): DeviceConnectionHealth | undefined {
    const health = this.health.get(imei);
    if (!health) return undefined;

    // Check staleness against threshold
    if (health.lastPacketReceived) {
      const elapsed = (Date.now() - new Date(health.lastPacketReceived).getTime()) / 1000;
      health.isStale = elapsed > this.staleThresholdSeconds;
    } else {
      health.isStale = true;
    }
    health.connectionStatus = this.calculateConnectionStatus(health);

    return health;
  }

  public getAllDevicesHealth(): DeviceConnectionHealth[] {
    return Array.from(this.registry.keys()).map((imei) => {
      return this.getDeviceHealth(imei)!;
    }).filter(Boolean);
  }

  public saveTelemetry(telemetry: NormalizedTelemetry): void {
    // 1. Update latest vehicle pointer
    this.latestTelemetryByVehicle.set(telemetry.vehicleId, telemetry);

    // 2. Append to recent history
    let history = this.telemetryHistoryByVehicle.get(telemetry.vehicleId);
    if (!history) {
      history = [];
      this.telemetryHistoryByVehicle.set(telemetry.vehicleId, history);
    }
    history.push(telemetry);
    if (history.length > this.maxHistoryPerVehicle) {
      history.shift(); // keep bounded to prevent memory growth
    }
  }

  public getLatestTelemetry(vehicleId: string): NormalizedTelemetry | undefined {
    return this.latestTelemetryByVehicle.get(vehicleId);
  }

  public getRecentTelemetry(vehicleId: string, limit = 20): NormalizedTelemetry[] {
    const history = this.telemetryHistoryByVehicle.get(vehicleId) || [];
    return history.slice(-limit);
  }

  public getAllLatestTelemetry(): NormalizedTelemetry[] {
    return Array.from(this.latestTelemetryByVehicle.values());
  }
}

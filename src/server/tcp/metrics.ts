export interface IngestionMetrics {
  isRunning: boolean;
  bindHost: string;
  bindPort: number;
  uptimeSeconds: number;
  activeSessions: number;
  authorizedConnections: number;
  rejectedConnections: number;
  packetsReceived: number;
  validPackets: number;
  invalidPackets: number;
  recordsProcessed: number;
  persistenceErrors: number;
  lastPacketReceiptTime: string | null;
  avgLatencyMs: number;
}

class IngestionMetricsManager {
  private startTime: number = Date.now();
  private running = false;
  private host = "0.0.0.0";
  private port = 5027;
  private activeSessionsCount = 0;
  private authorizedConnectionsCount = 0;
  private rejectedConnectionsCount = 0;
  private packetsReceivedCount = 0;
  private validPacketsCount = 0;
  private invalidPacketsCount = 0;
  private recordsProcessedCount = 0;
  private persistenceErrorsCount = 0;
  private lastPacketReceipt: string | null = null;
  private totalLatencyMs = 0;
  private latencyMeasurements = 0;

  setRunning(running: boolean, host = "0.0.0.0", port = 5027) {
    this.running = running;
    this.host = host;
    this.port = port;
    if (running) {
      this.startTime = Date.now();
    }
  }

  recordConnection(authorized: boolean) {
    if (authorized) {
      this.authorizedConnectionsCount++;
      this.activeSessionsCount++;
    } else {
      this.rejectedConnectionsCount++;
    }
  }

  recordDisconnection() {
    this.activeSessionsCount = Math.max(0, this.activeSessionsCount - 1);
  }

  recordPacket(valid: boolean, recordsCount = 0, latencyMs = 0) {
    this.packetsReceivedCount++;
    if (valid) {
      this.validPacketsCount++;
      this.recordsProcessedCount += recordsCount;
      this.lastPacketReceipt = new Date().toISOString();
      this.totalLatencyMs += latencyMs;
      this.latencyMeasurements++;
    } else {
      this.invalidPacketsCount++;
    }
  }

  recordPersistenceError() {
    this.persistenceErrorsCount++;
  }

  getSnapshot(): IngestionMetrics {
    const avgLatency =
      this.latencyMeasurements > 0
        ? Math.round((this.totalLatencyMs / this.latencyMeasurements) * 10) / 10
        : 0;

    return {
      isRunning: this.running,
      bindHost: this.host,
      bindPort: this.port,
      uptimeSeconds: this.running ? Math.floor((Date.now() - this.startTime) / 1000) : 0,
      activeSessions: this.activeSessionsCount,
      authorizedConnections: this.authorizedConnectionsCount,
      rejectedConnections: this.rejectedConnectionsCount,
      packetsReceived: this.packetsReceivedCount,
      validPackets: this.validPacketsCount,
      invalidPackets: this.invalidPacketsCount,
      recordsProcessed: this.recordsProcessedCount,
      persistenceErrors: this.persistenceErrorsCount,
      lastPacketReceiptTime: this.lastPacketReceipt,
      avgLatencyMs: avgLatency,
    };
  }

  reset() {
    this.activeSessionsCount = 0;
    this.authorizedConnectionsCount = 0;
    this.rejectedConnectionsCount = 0;
    this.packetsReceivedCount = 0;
    this.validPacketsCount = 0;
    this.invalidPacketsCount = 0;
    this.recordsProcessedCount = 0;
    this.persistenceErrorsCount = 0;
    this.lastPacketReceipt = null;
    this.totalLatencyMs = 0;
    this.latencyMeasurements = 0;
  }
}

export const ingestionMetrics = new IngestionMetricsManager();

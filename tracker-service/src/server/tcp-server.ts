import net from 'net';
import { ITrackingStore } from '../store/tracker-store';
import { TeltonikaDecoder } from '../codec/decoder';
import { NormalizedTelemetry } from '../types';

export interface TcpServerOptions {
  host: string;
  port: number;
  idleTimeoutMs?: number;
  onTelemetryReceived?: (telemetry: NormalizedTelemetry) => void;
  onDeviceHealthChanged?: (imei: string) => void;
}

export class TeltonikaTcpServer {
  private server: net.Server | null = null;
  private readonly store: ITrackingStore;
  private readonly options: TcpServerOptions;

  constructor(store: ITrackingStore, options: TcpServerOptions) {
    this.store = store;
    this.options = {
      idleTimeoutMs: 120000, // 2 minutes socket inactivity timeout
      ...options
    };
  }

  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => this.handleConnection(socket));

      this.server.on('error', (err) => {
        console.error('[TCP Server Error]', err.message);
        reject(err);
      });

      this.server.listen(this.options.port, this.options.host, () => {
        console.log(
          `[TCP Server] Listening for Teltonika FMC920 trackers on ${this.options.host}:${this.options.port}`
        );
        resolve();
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('[TCP Server] Stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  private handleConnection(socket: net.Socket): void {
    const remoteAddress = socket.remoteAddress || 'unknown';
    const remotePort = socket.remotePort || 0;
    const remoteInfo = { address: remoteAddress, port: remotePort };

    let state: 'WAITING_IMEI' | 'AUTHENTICATED' = 'WAITING_IMEI';
    let deviceImei: string | null = null;
    let streamBuffer = Buffer.alloc(0);

    socket.setTimeout(this.options.idleTimeoutMs!);

    socket.on('data', (chunk: Buffer) => {
      streamBuffer = Buffer.concat([streamBuffer, chunk]);

      // Phase 1: IMEI Handshake
      if (state === 'WAITING_IMEI') {
        if (streamBuffer.length < 2) {
          return; // Wait for at least 2-byte length
        }

        const imeiLen = streamBuffer.readUInt16BE(0);
        // Valid IMEI length is typically 15 bytes
        if (imeiLen <= 0 || imeiLen > 32) {
          console.warn(`[TCP] Rejected connection from ${remoteAddress}:${remotePort} - Invalid IMEI length: ${imeiLen}`);
          socket.write(Buffer.from([0x00])); // Reject
          socket.end();
          return;
        }

        if (streamBuffer.length < 2 + imeiLen) {
          return; // Wait for full IMEI string to arrive
        }

        const imei = streamBuffer.subarray(2, 2 + imeiLen).toString('ascii').trim();
        streamBuffer = streamBuffer.subarray(2 + imeiLen); // Consume IMEI

        const isAuthorized = this.store.isImeiAuthorized(imei);

        if (!isAuthorized) {
          console.warn(`[TCP] UNAUTHORIZED IMEI ATTEMPT: ${imei} from ${remoteAddress}:${remotePort}`);
          this.store.updateConnectionState(imei, 'Rejected', remoteInfo);
          socket.write(Buffer.from([0x00])); // 0x00 = Handshake Rejected
          socket.end();
          return;
        }

        // IMEI Accepted
        deviceImei = imei;
        state = 'AUTHENTICATED';
        this.store.updateConnectionState(imei, 'Authenticated', remoteInfo);
        this.options.onDeviceHealthChanged?.(imei);

        console.log(`[TCP] AUTHORIZED IMEI CONNECTED: ${imei} (${remoteAddress}:${remotePort}) -> Handshake 0x01 sent`);
        socket.write(Buffer.from([0x01])); // 0x01 = Handshake Accepted
      }

      // Phase 2: AVL Data Reception & Processing
      if (state === 'AUTHENTICATED' && deviceImei) {
        while (streamBuffer.length > 0) {
          const parseResult = TeltonikaDecoder.parsePacket(streamBuffer);

          if (!parseResult.success) {
            if (parseResult.bytesConsumed === 0) {
              // Incomplete packet in stream, wait for more chunks
              break;
            }

            // Corrupted or malformed packet encountered
            console.warn(
              `[TCP] Parser error for IMEI ${deviceImei}: ${parseResult.error}`
            );
            this.store.recordParserError(deviceImei, parseResult.error || 'Decode failed');
            this.options.onDeviceHealthChanged?.(deviceImei);

            // Discard corrupted chunk to resync
            streamBuffer = streamBuffer.subarray(parseResult.bytesConsumed);
            continue;
          }

          // Successfully decoded AVL packet
          const { decodedPacket, ackBuffer, bytesConsumed } = parseResult;
          streamBuffer = streamBuffer.subarray(bytesConsumed);

          if (decodedPacket && ackBuffer) {
            const dev = this.store.getDeviceByImei(deviceImei);
            const vehicleId = dev?.vehicleId || 'v-dxb-01';

            let latestTelemetry: NormalizedTelemetry | undefined;

            for (const record of decodedPacket.records) {
              const normalized = TeltonikaDecoder.normalizeRecord(record, deviceImei, vehicleId);
              this.store.saveTelemetry(normalized);
              latestTelemetry = normalized;

              // Notify WebSocket subscribers
              this.options.onTelemetryReceived?.(normalized);
            }

            // CRITICAL: Acknowledge valid packet with 4-byte BE record count
            socket.write(ackBuffer);

            // Record connection health & statistics
            this.store.recordPacketReceived(deviceImei, decodedPacket.recordCount, ackBuffer, latestTelemetry);
            this.options.onDeviceHealthChanged?.(deviceImei);

            console.log(
              `[TCP] Ingested ${decodedPacket.recordCount} records from IMEI ${deviceImei} [${decodedPacket.codecName}] -> Sent ACK ${ackBuffer.toString('hex')}`
            );
          }
        }
      }
    });

    socket.on('timeout', () => {
      console.log(`[TCP] Idle timeout on socket ${remoteAddress}:${remotePort} (IMEI: ${deviceImei || 'none'})`);
      socket.end();
    });

    socket.on('error', (err) => {
      console.warn(`[TCP Socket Error] (${remoteAddress}:${remotePort}): ${err.message}`);
    });

    socket.on('close', () => {
      if (deviceImei) {
        console.log(`[TCP] Socket closed for IMEI ${deviceImei}`);
        this.store.updateConnectionState(deviceImei, 'Disconnected');
        this.options.onDeviceHealthChanged?.(deviceImei);
      }
    });
  }
}

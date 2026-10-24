import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { ITrackingStore } from '../store/tracker-store';
import {
  NormalizedTelemetry,
  WebSocketMessage,
  DeviceConnectionHealth,
  TrackerRegistryEntry
} from '../types';
import { createHttpApiHandler, HttpApiOptions } from './http-api';

interface ClientContext {
  ws: WebSocket;
  isAlive: boolean;
  role?: string;
  assignedVehicleId?: string;
  isAuthenticated: boolean;
}

export class TrackingWsServer {
  private httpServer: http.Server | null = null;
  private wss: WebSocketServer | null = null;
  private readonly store: ITrackingStore;
  private readonly port: number;
  private readonly apiOptions: HttpApiOptions;
  private clients: Set<ClientContext> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(store: ITrackingStore, port: number, apiOptions?: Partial<HttpApiOptions>) {
    this.store = store;
    this.port = port;
    this.apiOptions = {
      staleThresholdSeconds: 60,
      tcpHost: '0.0.0.0',
      tcpPort: 5027,
      ...apiOptions
    };
  }

  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      // 1. Create HTTP API server
      const httpHandler = createHttpApiHandler(this.store, this.apiOptions);
      this.httpServer = http.createServer(httpHandler);

      // 2. Attach WebSocket server to the same HTTP server
      this.wss = new WebSocketServer({ server: this.httpServer });

      this.httpServer.on('error', (err) => {
        console.error(`[HTTP/WS Server Error] Failed on port ${this.port}:`, err.message);
        reject(err);
      });

      this.wss.on('error', (err) => {
        console.error(`[WS Server Error] Failed on port ${this.port}:`, err.message);
      });

      this.wss.on('connection', (ws, req) => {
        const clientCtx: ClientContext = {
          ws,
          isAlive: true,
          isAuthenticated: false
        };
        this.clients.add(clientCtx);

        // Ping / Pong for liveness detection
        ws.on('pong', () => {
          clientCtx.isAlive = true;
        });

        // Parse client auth / commands
        ws.on('message', (raw) => {
          try {
            const data = JSON.parse(raw.toString());
            if (data.type === 'AUTH') {
              clientCtx.role = data.role || 'Admin';
              clientCtx.assignedVehicleId = data.assignedVehicleId;
              clientCtx.isAuthenticated = true;

              // Send connection acknowledgment
              this.sendToClient(clientCtx, {
                type: 'CONNECTION_ACK',
                timestamp: new Date().toISOString(),
                payload: {
                  message: 'Authenticated to Trackwe Live Telemetry Gateway',
                  role: clientCtx.role,
                  assignedVehicleId: clientCtx.assignedVehicleId
                }
              });

              // Send current state snapshots
              this.sendInitialState(clientCtx);
            }
          } catch (e) {
            console.warn('[WS Server] Failed to parse client message');
          }
        });

        ws.on('close', () => {
          this.clients.delete(clientCtx);
        });

        ws.on('error', (err) => {
          console.warn('[WS Client Error]', err.message);
          this.clients.delete(clientCtx);
        });

        // Send initial state immediately for demo clients without explicit auth message
        this.sendInitialState(clientCtx);
      });

      // Heartbeat every 30s
      this.heartbeatInterval = setInterval(() => {
        for (const client of this.clients) {
          if (!client.isAlive) {
            client.ws.terminate();
            this.clients.delete(client);
            continue;
          }
          client.isAlive = false;
          client.ws.ping();
        }
      }, 30000);

      this.httpServer.listen(this.port, '0.0.0.0', () => {
        console.log(`[HTTP/WS Server] Live Telemetry HTTP API & WebSocket listening on http://0.0.0.0:${this.port}`);
        console.log(`  - Health:    GET http://0.0.0.0:${this.port}/api/live/health`);
        console.log(`  - Vehicles:  GET http://0.0.0.0:${this.port}/api/live/vehicles`);
        console.log(`  - WebSocket: ws://0.0.0.0:${this.port}/ws`);
        resolve();
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
      if (this.wss) {
        this.wss.close();
      }
      if (this.httpServer) {
        this.httpServer.close(() => {
          console.log('[HTTP/WS Server] Stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Broadcasts a new normalized telemetry record to relevant clients
   */
  public broadcastTelemetry(telemetry: NormalizedTelemetry): void {
    const message: WebSocketMessage<NormalizedTelemetry> = {
      type: 'TELEMETRY_UPDATE',
      timestamp: new Date().toISOString(),
      payload: telemetry
    };

    const serialized = JSON.stringify(message);

    for (const client of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        // Multi-tenant & Role-based filtering:
        // If employee, only send their assigned vehicle's telemetry
        if (client.role === 'Employee' && client.assignedVehicleId) {
          if (client.assignedVehicleId !== telemetry.vehicleId) {
            continue;
          }
        }
        client.ws.send(serialized);
      }
    }
  }

  /**
   * Broadcasts device connection health status to all connected management clients
   */
  public broadcastDeviceHealth(imei?: string): void {
    const healthList = imei
      ? [this.store.getDeviceHealth(imei)].filter(Boolean) as DeviceConnectionHealth[]
      : this.store.getAllDevicesHealth();

    const message: WebSocketMessage<DeviceConnectionHealth[]> = {
      type: 'DEVICE_HEALTH_UPDATE',
      timestamp: new Date().toISOString(),
      payload: healthList
    };

    const serialized = JSON.stringify(message);

    for (const client of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(serialized);
      }
    }
  }

  private sendInitialState(client: ClientContext): void {
    if (client.ws.readyState !== WebSocket.OPEN) return;

    // 1. Send Device Registry
    const registryMessage: WebSocketMessage<TrackerRegistryEntry[]> = {
      type: 'DEVICE_REGISTRY',
      timestamp: new Date().toISOString(),
      payload: this.store.listRegisteredDevices()
    };
    client.ws.send(JSON.stringify(registryMessage));

    // 2. Send Device Health
    const healthMessage: WebSocketMessage<DeviceConnectionHealth[]> = {
      type: 'DEVICE_HEALTH_UPDATE',
      timestamp: new Date().toISOString(),
      payload: this.store.getAllDevicesHealth()
    };
    client.ws.send(JSON.stringify(healthMessage));

    // 3. Send Latest Telemetry for all or assigned vehicles
    const allTelemetry = this.store.getAllLatestTelemetry();
    for (const t of allTelemetry) {
      if (client.role === 'Employee' && client.assignedVehicleId && client.assignedVehicleId !== t.vehicleId) {
        continue;
      }
      this.sendToClient(client, {
        type: 'TELEMETRY_UPDATE',
        timestamp: new Date().toISOString(),
        payload: t
      });
    }
  }

  private sendToClient(client: ClientContext, message: WebSocketMessage): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }
}

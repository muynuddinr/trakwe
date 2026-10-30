import * as net from "node:net";
import { DeviceRepository } from "../db/repositories/device-repository";
import { LogRepository } from "../db/repositories/log-repository";
import { SessionRepository } from "../db/repositories/session-repository";
import { TelemetryRepository } from "../db/repositories/telemetry-repository";
import { encodeTeltonikaAck } from "../protocol/teltonika-ack";
import { extractPacketsFromStream } from "../protocol/teltonika-parser";
import { DeviceIgnitionConfig } from "../protocol/teltonika-types";
import { ingestionMetrics } from "./metrics";

export interface Fmc920TcpServiceOptions {
  host?: string;
  port?: number;
  inactivityTimeoutMs?: number;
  maxBufferSizeBytes?: number;
  maxConnections?: number;
}

interface SocketContext {
  id: string;
  state: "WAITING_HANDSHAKE" | "AUTHENTICATED" | "CLOSED";
  deviceId: string | null;
  imei: string | null;
  model: string | null;
  ignitionConfig: DeviceIgnitionConfig | null;
  vehicleId: string | null;
  orgId: string | null;
  remoteIp: string;
  remotePort: number;
  buffer: Buffer;
  connectedAt: Date;
  lastKnownIgnition?: "ON" | "OFF" | "Unknown";
}

export class Fmc920TcpService {
  private server: net.Server | null = null;
  private readonly host: string;
  private readonly port: number;
  private readonly timeoutMs: number;
  private readonly maxBufferSize: number;
  private readonly maxConnections: number;

  private activeSockets = new Map<net.Socket, SocketContext>();

  private deviceRepo: DeviceRepository;
  private telemetryRepo: TelemetryRepository;
  private sessionRepo: SessionRepository;
  private logRepo: LogRepository;

  constructor(options: Fmc920TcpServiceOptions = {}) {
    this.host = options.host || process.env.GPS_TCP_HOST || process.env.TELTONIKA_TCP_HOST || "0.0.0.0";
    this.port = options.port || Number(process.env.GPS_TCP_PORT || process.env.TELTONIKA_TCP_PORT || 5027);
    this.timeoutMs = options.inactivityTimeoutMs || 300000; // 5 minutes inactivity
    this.maxBufferSize = options.maxBufferSizeBytes || 65536; // 64 KB
    this.maxConnections = options.maxConnections || 1000;

    this.deviceRepo = new DeviceRepository();
    this.telemetryRepo = new TelemetryRepository();
    this.sessionRepo = new SessionRepository();
    this.logRepo = new LogRepository();
  }

  async start(): Promise<void> {
    if (this.server) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => this.handleConnection(socket));

      this.server.maxConnections = this.maxConnections;

      this.server.on("error", (err) => {
        ingestionMetrics.setRunning(false, this.host, this.port);
        reject(err);
      });

      this.server.listen(this.port, this.host, () => {
        ingestionMetrics.setRunning(true, this.host, this.port);
        console.log(`[Teltonika FMC920 TCP Service] Listening on ${this.host}:${this.port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.server) return;

    return new Promise((resolve) => {
      // Close all active sockets
      for (const [socket, ctx] of this.activeSockets) {
        ctx.state = "CLOSED";
        socket.destroy();
      }
      this.activeSockets.clear();

      this.server?.close(() => {
        this.server = null;
        ingestionMetrics.setRunning(false, this.host, this.port);
        console.log(`[Teltonika FMC920 TCP Service] Stopped`);
        resolve();
      });
    });
  }

  private handleConnection(socket: net.Socket) {
    const remoteIp = socket.remoteAddress || "unknown";
    const remotePort = socket.remotePort || 0;
    const socketId = `sock-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const context: SocketContext = {
      id: socketId,
      state: "WAITING_HANDSHAKE",
      deviceId: null,
      imei: null,
      model: null,
      ignitionConfig: null,
      vehicleId: null,
      orgId: null,
      remoteIp,
      remotePort,
      buffer: Buffer.alloc(0),
      connectedAt: new Date(),
    };

    this.activeSockets.set(socket, context);
    socket.setTimeout(this.timeoutMs);

    socket.on("data", async (chunk) => {
      await this.handleSocketData(socket, context, chunk);
    });

    socket.on("timeout", () => {
      this.logRepo.addLog({
        deviceId: context.deviceId,
        imei: context.imei,
        vehicleId: context.vehicleId,
        orgId: context.orgId,
        eventType: "Device heartbeat missed",
        severity: "WARN",
        message: `Socket connection timed out after ${this.timeoutMs / 1000}s inactivity`,
      });
      socket.destroy(new Error("Connection timeout"));
    });

    socket.on("close", async () => {
      this.activeSockets.delete(socket);
      if (context.state === "AUTHENTICATED" && context.deviceId) {
        ingestionMetrics.recordDisconnection();
        await this.sessionRepo.closeSession(context.id, "Connection closed by remote or server");
        await this.logRepo.addLog({
          deviceId: context.deviceId,
          imei: context.imei,
          vehicleId: context.vehicleId,
          orgId: context.orgId,
          eventType: "Device disconnected",
          severity: "INFO",
          message: `Device ${context.imei} disconnected (${remoteIp}:${remotePort})`,
        });
      }
    });

    socket.on("error", (err) => {
      // Graceful error logging
      console.warn(`[FMC920 Socket Error] ${context.imei || remoteIp}: ${err.message}`);
    });
  }

  private async handleSocketData(socket: net.Socket, ctx: SocketContext, chunk: Buffer) {
    // Append to context buffer
    ctx.buffer = Buffer.concat([ctx.buffer, chunk]);

    // Bounded buffer protection against memory overflow
    if (ctx.buffer.length > this.maxBufferSize) {
      this.logRepo.addParsingError({
        deviceId: ctx.deviceId,
        imei: ctx.imei,
        remoteIp: ctx.remoteIp,
        errorType: "BUFFER_OVERFLOW",
        errorMessage: `Buffer exceeded maximum allowed size of ${this.maxBufferSize} bytes`,
      });
      socket.destroy();
      return;
    }

    if (ctx.state === "WAITING_HANDSHAKE") {
      await this.handleHandshake(socket, ctx);
    } else if (ctx.state === "AUTHENTICATED") {
      await this.handleTelemetryData(socket, ctx);
    }
  }

  private async handleHandshake(socket: net.Socket, ctx: SocketContext) {
    // Need at least 2 bytes for IMEI length
    if (ctx.buffer.length < 2) return;

    const imeiLength = ctx.buffer.readUInt16BE(0);

    // Standard IMEI is 15 ASCII characters
    if (imeiLength < 8 || imeiLength > 32) {
      ingestionMetrics.recordConnection(false);
      await this.logRepo.addLog({
        eventType: "Invalid packet detected",
        severity: "WARN",
        message: `Malformed IMEI handshake length from ${ctx.remoteIp}: ${imeiLength}`,
      });
      socket.write(Buffer.from([0x00])); // 0x00 = Rejection
      socket.destroy();
      return;
    }

    // Wait until full IMEI string is in buffer
    if (ctx.buffer.length < 2 + imeiLength) return;

    const imei = ctx.buffer.subarray(2, 2 + imeiLength).toString("ascii").trim();
    ctx.buffer = ctx.buffer.subarray(2 + imeiLength); // Advance buffer

    // Validate IMEI against database registry
    const device = await this.deviceRepo.findByImei(imei);

    if (!device) {
      ingestionMetrics.recordConnection(false);
      await this.logRepo.addLog({
        imei,
        eventType: "Invalid packet detected",
        severity: "WARN",
        message: `Connection attempt from unregistered IMEI ${imei} (${ctx.remoteIp})`,
      });
      socket.write(Buffer.from([0x00]));
      socket.destroy();
      return;
    }

    if (device.status !== "active") {
      ingestionMetrics.recordConnection(false);
      await this.logRepo.addLog({
        deviceId: device.id,
        imei,
        vehicleId: device.vehicle_id,
        orgId: device.org_id,
        eventType: "Device connected",
        severity: "WARN",
        message: `Connection rejected for disabled device ${imei} (status: ${device.status})`,
      });
      socket.write(Buffer.from([0x00]));
      socket.destroy();
      return;
    }

    // Device Accepted
    ctx.state = "AUTHENTICATED";
    ctx.deviceId = device.id;
    ctx.imei = device.imei;
    ctx.model = device.model || "Teltonika FMC920";
    ctx.vehicleId = device.vehicle_id;
    ctx.orgId = device.org_id;

    // Model-aware ignition configuration
    ctx.ignitionConfig = {
      source: (device.ignition_source as any) || "DIN1",
      highVoltageThreshold: device.ignition_high_threshold ?? 13.2,
      lowVoltageThreshold: device.ignition_low_threshold ?? 12.8,
      rpmThreshold: device.ignition_rpm_threshold ?? 400,
    };

    ingestionMetrics.recordConnection(true);

    await this.deviceRepo.updateLastConnection(device.id, new Date());
    await this.sessionRepo.createSession({
      id: ctx.id,
      deviceId: device.id,
      imei: device.imei,
      remoteIp: ctx.remoteIp,
      remotePort: ctx.remotePort,
    });

    await this.logRepo.addLog({
      deviceId: device.id,
      imei: device.imei,
      vehicleId: device.vehicle_id,
      orgId: device.org_id,
      eventType: "Device connected",
      severity: "INFO",
      message: `${device.model || "Teltonika GPS"} authenticated: IMEI ${device.imei} (${ctx.remoteIp}:${ctx.remotePort}) [Ignition: ${ctx.ignitionConfig.source}]`,
    });

    // Send single byte 0x01 (Connection accepted)
    socket.write(Buffer.from([0x01]));

    // If there is leftover data in the buffer after handshake, process it immediately
    if (ctx.buffer.length >= 15) {
      await this.handleTelemetryData(socket, ctx);
    }
  }

  private async handleTelemetryData(socket: net.Socket, ctx: SocketContext) {
    if (!ctx.deviceId || !ctx.imei || !ctx.orgId) return;

    const streamResult = extractPacketsFromStream(ctx.buffer, {
      model: ctx.model || undefined,
      ignitionConfig: ctx.ignitionConfig || undefined,
      previousIgnitionState: ctx.lastKnownIgnition,
    });
    ctx.buffer = streamResult.remainingBuffer;

    // Log any stream parsing errors
    for (const err of streamResult.errors) {
      ingestionMetrics.recordPacket(false);
      await this.logRepo.addParsingError({
        deviceId: ctx.deviceId,
        imei: ctx.imei,
        remoteIp: ctx.remoteIp,
        errorType: err.errorType,
        errorMessage: err.error,
        rawHex: err.rawHex,
      });
      await this.logRepo.addLog({
        deviceId: ctx.deviceId,
        imei: ctx.imei,
        vehicleId: ctx.vehicleId,
        orgId: ctx.orgId,
        eventType: "Invalid packet detected",
        severity: "ERROR",
        message: `Packet parse error: ${err.error}`,
        packetRef: err.rawHex?.slice(0, 32),
      });
    }

    // Process valid packets
    for (const packet of streamResult.packets) {
      const startMs = Date.now();
      try {
        const persistResult = await this.telemetryRepo.persistBatch(
          ctx.deviceId,
          ctx.imei,
          ctx.vehicleId,
          ctx.orgId,
          packet.records,
          packet.codecId,
          packet.rawHex
        );

        const latency = Date.now() - startMs;
        ingestionMetrics.recordPacket(true, persistResult.accepted, latency);

        if (packet.records.length > 0) {
          const lastRecord = packet.records[packet.records.length - 1];
          if (lastRecord.properties.ignition !== "Unknown") {
            ctx.lastKnownIgnition = lastRecord.properties.ignition;
          }
        }

        await this.deviceRepo.updateLastCommunication(ctx.deviceId, new Date());
        await this.sessionRepo.recordPacket(ctx.id, persistResult.accepted, packet.rawPayloadLength);

        await this.logRepo.addLog({
          deviceId: ctx.deviceId,
          imei: ctx.imei,
          vehicleId: ctx.vehicleId,
          orgId: ctx.orgId,
          eventType: "GPS packet received",
          severity: "INFO",
          message: `Processed ${packet.recordCount} AVL records (${persistResult.accepted} new, ${persistResult.duplicates} duplicates) via ${packet.codecName} for ${ctx.model || "device"}`,
          packetRef: packet.rawHex.slice(0, 32),
        });

        // Teltonika Protocol Requirement:
        // Respond with 4-byte big-endian integer count of successfully processed records!
        const ack = encodeTeltonikaAck(packet.recordCount);
        socket.write(ack);
      } catch (err: any) {
        ingestionMetrics.recordPersistenceError();
        await this.logRepo.addLog({
          deviceId: ctx.deviceId,
          imei: ctx.imei,
          vehicleId: ctx.vehicleId,
          orgId: ctx.orgId,
          eventType: "Invalid packet detected",
          severity: "ERROR",
          message: `Persistence error for packet: ${err.message}`,
        });
        // Important: DO NOT send success ACK on persistence failure!
      }
    }
  }

  getMetrics() {
    return ingestionMetrics.getSnapshot();
  }
}

// Singleton TCP Service Instance
let tcpServiceInstance: Fmc920TcpService | null = null;

export function getFmc920TcpService(): Fmc920TcpService {
  if (!tcpServiceInstance) {
    tcpServiceInstance = new Fmc920TcpService();
  }
  return tcpServiceInstance;
}

// Unified Teltonika TCP Service aliases for shared ingestion architecture
export const TeltonikaTcpService = Fmc920TcpService;
export const getTeltonikaTcpService = getFmc920TcpService;

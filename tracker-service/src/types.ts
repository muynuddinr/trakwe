export type TeltonikaCodec = 0x08 | 0x8E;

export interface TeltonikaGpsData {
  longitude: number; // degrees (-180 to 180)
  latitude: number;  // degrees (-90 to 90)
  altitude: number;  // meters
  angle: number;     // 0 - 360 degrees
  satellites: number;// satellite count
  speed: number;     // km/h
  isValid: boolean;  // whether coordinates are non-zero / plausible
}

export interface TeltonikaIoData {
  eventId: number;
  totalCount: number;
  elements: Record<number, number | bigint>;
}

export interface TeltonikaAvlRecord {
  timestampMs: number;
  timestamp: Date;
  priority: number;
  gps: TeltonikaGpsData;
  io: TeltonikaIoData;
}

export interface DecodedAvlPacket {
  codec: TeltonikaCodec;
  codecName: 'Codec 8' | 'Codec 8 Extended';
  recordCount: number;
  records: TeltonikaAvlRecord[];
  crc: number;
  calculatedCrc: number;
  rawPayloadLength: number;
}

export interface NormalizedTelemetry {
  imei: string;
  vehicleId: string;
  deviceTimestamp: string;
  serverTimestamp: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  altitude: number;
  satellites: number;
  ignition: boolean;        // IO 239
  movement: boolean;        // IO 240
  externalVoltage: number;  // IO 66 (converted to Volts)
  internalBattery: number;  // IO 67 (converted to Volts)
  gsmSignal: number;        // IO 21 (0-5 scale)
  rawIo: Record<number, number | string>;
  status: 'Moving' | 'Idle' | 'Offline';
  isLiveHardware: true;
  isUaeCorridor: boolean;
  hasGpsFix: boolean;
}

export type TcpConnectionState = 'Disconnected' | 'Connecting' | 'Connected' | 'Authenticated' | 'Rejected';

export type DeviceConnectionStatus =
  | 'Registered'
  | 'Connected'
  | 'Reporting'
  | 'Stale'
  | 'Offline'
  | 'No GPS fix';

export interface DeviceConnectionHealth {
  imei: string;
  vehicleId: string;
  vehicleName: string;
  registration?: string;
  tcpState: TcpConnectionState;
  connectionStatus: DeviceConnectionStatus;
  remoteAddress: string | null;
  remotePort: number | null;
  connectedAt: string | null;
  lastPacketReceived: string | null;
  lastValidGps: string | null;
  lastAckSent: string | null;
  lastAckHex: string | null;
  totalRecordsProcessed: number;
  totalPacketsReceived: number;
  parserErrorCount: number;
  lastError: string | null;
  isStale: boolean;
  hasGpsFix: boolean;
}

export interface TrackerRegistryEntry {
  imei: string;
  vehicleId: string;
  vehicleName: string;
  registration?: string;
  deviceModel: string;
  enabled: boolean;
  notes?: string;
}

export interface WebSocketClientAuth {
  role?: string;
  userId?: string;
  token?: string;
}

export type WebSocketMessageType =
  | 'TELEMETRY_UPDATE'
  | 'DEVICE_HEALTH_UPDATE'
  | 'DEVICE_REGISTRY'
  | 'CONNECTION_ACK'
  | 'ERROR'
  | 'REGISTER_DEVICE';

export interface WebSocketMessage<T = unknown> {
  type: WebSocketMessageType;
  timestamp: string;
  payload: T;
}

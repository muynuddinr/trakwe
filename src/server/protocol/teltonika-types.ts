export const TELTONIKA_CODECS = {
  CODEC_8: 0x08,
  CODEC_8_EXTENDED: 0x8e,
  CODEC_16: 0x10,
} as const;

export type TeltonikaCodecId = (typeof TELTONIKA_CODECS)[keyof typeof TELTONIKA_CODECS];

export interface GpsData {
  longitude: number; // degrees (-180 to 180)
  latitude: number;  // degrees (-90 to 90)
  altitude: number;   // meters
  angle: number;      // degrees 0-359
  satellites: number; // 0-32
  speed: number;      // km/h
}

export interface IOElement {
  id: number;
  length: number; // byte length: 1, 2, 4, 8, or variable
  value: bigint | number;
}

export interface Fmc920TelemetryProperties {
  ignition: "ON" | "OFF" | "Unknown"; // AVL ID 239 (0 or 1)
  movement: "Moving" | "Stationary" | "Unknown"; // AVL ID 240 (0 or 1)
  externalVoltage: number | null; // AVL ID 66 (mV converted to Volts)
  internalBatteryVoltage: number | null; // AVL ID 67 (mV converted to Volts)
  gsmSignal: number | null; // AVL ID 21 (0-5 bars)
}

export interface AvlRecord {
  timestamp: Date;
  timestampMs: number;
  priority: number; // 0 = Low, 1 = High, 2 = Panic
  gps: GpsData;
  eventIoId: number;
  totalIoCount: number;
  ioElements: Record<number, IOElement>;
  properties: Fmc920TelemetryProperties;
}

export interface ParsedAvlPacket {
  codecId: number;
  codecName: "Codec 8" | "Codec 8 Extended" | "Unknown";
  recordCount: number;
  records: AvlRecord[];
  crc: number;
  rawPayloadLength: number;
  rawHex: string;
}

export type ParsePacketResult =
  | { success: true; packet: ParsedAvlPacket; consumedBytes: number }
  | { success: false; error: string; errorType: string; consumedBytes: number; rawHex?: string };

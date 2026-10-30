export const TELTONIKA_CODECS = {
  CODEC_8: 0x08,
  CODEC_8_EXTENDED: 0x8e,
  CODEC_16: 0x10,
} as const;

export type TeltonikaCodecId = (typeof TELTONIKA_CODECS)[keyof typeof TELTONIKA_CODECS];

export const TELTONIKA_MODELS = {
  FMC920: "Teltonika FMC920",
  FMC130: "Teltonika FMC130",
} as const;

export type IgnitionSource =
  | "DIN1"
  | "VOLTAGE"
  | "ACCELEROMETER"
  | "RPM"
  | "AUTO_AVL239";

export interface DeviceIgnitionConfig {
  source: IgnitionSource;
  highVoltageThreshold?: number; // Volts (default 13.2)
  lowVoltageThreshold?: number;  // Volts (default 12.8)
  rpmThreshold?: number;         // RPM (default 400)
}

export const TELTONIKA_AVL_IDS = {
  DIN1: 1,
  DIN2: 2,
  DIN3: 3,
  AIN1: 9,
  AIN2: 10,
  ODOMETER_METERS: 16,
  GSM_SIGNAL: 21,
  SPEED: 24,
  EXTERNAL_VOLTAGE_MV: 66,
  BATTERY_VOLTAGE_MV: 67,
  BATTERY_CURRENT_MA: 68,
  GNSS_STATUS: 69,
  TEMP_1: 72,
  TEMP_2: 73,
  IBUTTON: 78,
  CAN_SPEED: 81,
  FUEL_LEVEL_PERCENT: 83,
  FUEL_CONSUMED_LITERS: 84,
  ENGINE_RPM: 85,
  TOTAL_MILEAGE: 87,
  FUEL_LEVEL_LITERS: 89,
  ENGINE_TEMP: 115,
  DOUT1: 179,
  DOUT2: 180,
  GNSS_PDOP: 181,
  GNSS_HDOP: 182,
  TRIP_DISTANCE_METERS: 199,
  IGNITION: 239,
  MOVEMENT: 240,
  GSM_OPERATOR: 241,
} as const;

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
  rawBuffer?: Buffer;
}

export interface Fmc920TelemetryProperties {
  ignition: "ON" | "OFF" | "Unknown"; // AVL ID 239 or configured source
  movement: "Moving" | "Stationary" | "Unknown"; // AVL ID 240 (0 or 1)
  externalVoltage: number | null; // AVL ID 66 (mV converted to Volts)
  internalBatteryVoltage: number | null; // AVL ID 67 (mV converted to Volts)
  gsmSignal: number | null; // AVL ID 21 (0-5 bars)
}

export interface Fmc130TelemetryProperties extends Fmc920TelemetryProperties {
  odometerKm: number | null; // AVL ID 16 or 87
  fuelLevel: number | null; // AVL ID 83 (% or 89 L)
  fuelUsedLiters: number | null; // AVL ID 84
  engineRpm: number | null; // AVL ID 85
  engineTemp: number | null; // AVL ID 115
  din1: number | null; // AVL ID 1
  din2: number | null; // AVL ID 2
  din3: number | null; // AVL ID 3
  ain1Mv: number | null; // AVL ID 9
  ain2Mv: number | null; // AVL ID 10
  dout1: number | null; // AVL ID 179
  dout2: number | null; // AVL ID 180
  tripDistanceMeters: number | null; // AVL ID 199
  gnssStatus: number | null; // AVL ID 69
  gnssPdop: number | null; // AVL ID 181
  gnssHdop: number | null; // AVL ID 182
  temperature1: number | null; // AVL ID 72
  temperature2: number | null; // AVL ID 73
  ibutton: string | null; // AVL ID 78
  ignitionSourceUsed?: string;
}

export type TelemetryProperties = Fmc130TelemetryProperties;

export interface AvlRecord {
  timestamp: Date;
  timestampMs: number;
  priority: number; // 0 = Low, 1 = High, 2 = Panic
  gps: GpsData;
  eventIoId: number;
  totalIoCount: number;
  ioElements: Record<number, IOElement>;
  properties: TelemetryProperties;
}

export interface ParsedAvlPacket {
  codecId: number;
  codecName: "Codec 8" | "Codec 8 Extended" | "Codec 16" | "Unknown";
  recordCount: number;
  records: AvlRecord[];
  crc: number;
  rawPayloadLength: number;
  rawHex: string;
}

export type ParsePacketResult =
  | { success: true; packet: ParsedAvlPacket; consumedBytes: number }
  | { success: false; error: string; errorType: string; consumedBytes: number; rawHex?: string };

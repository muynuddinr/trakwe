import { vehicles } from "@/data/vehicles";

export interface PipelineComponent {
  id: string;
  name: string;
  protocol: string;
  port: string;
  status: "Listening · Simulated" | "Active · Simulated" | "Ready · Simulated" | "Buffered · Simulated" | "Broadcasting · Simulated" | "Not Configured";
  messagesReceived: number;
  latency: string;
  lastActivity: string;
  throughput: string;
  description: string;
  badge: string;
}

export interface DeviceConnection {
  deviceId: string;
  manufacturer?: string;
  deviceModel: "Teltonika FMC920" | "Teltonika FMC130" | "Queclink GV300" | "Meitrack T333" | "Ruptela HCV5" | string;
  protocol: string;
  vehicleReg: string;
  vehicleName: string;
  vehicleType: string;
  driver: string;
  region: string;
  connectionStatus: "Connected" | "Disconnected" | "Reconnecting" | "Warning";
  lastCommunication: string;
  lastCommunicationISO: string;
  signalStrength: {
    dBm: number;
    bars: number;
    percentage: number;
    quality: "Excellent" | "Good" | "Fair" | "Poor";
  };
  dataFetchStatus: "Active" | "Idle" | "Reconnecting" | "Failed" | "Syncing";
  ipAddress: string;
  port: number;
  firmware: string;
  carrier: string;
  imei: string;
  serialNumber: string;
  satellites: number;
  hdop: number;
  odometer: number;
  ignition: "ON" | "OFF" | "Unknown" | "Stale";
  ignitionSource?: string;
  rpm: number;
  speed: number;
  voltageExt: number;
  voltageInt: number;
  lat?: number;
  lng?: number;
  fuel: number;
  temperature: number | null;
  din1?: number | null;
  din2?: number | null;
  din3?: number | null;
  ain1Mv?: number | null;
  ain2Mv?: number | null;
  packetCount?: number;
  parsingErrors?: number;
  ioElements?: any;
  rawPayloadHex: string;
  config: {
    reportingIntervalSec: number;
    heartbeatSec: number;
    apn: string;
    serverIp: string;
    serverPort: number;
    sleepMode: string;
    tlsEnabled: boolean;
  };
}

export interface IgnitionEvent {
  id: string;
  vehicleReg: string;
  deviceId: string;
  event: "Ignition ON" | "Ignition OFF";
  timestamp: string;
  duration: string;
  location: string;
  batteryVoltage: number;
  driver: string;
}

export interface TelemetryRecord {
  id: string;
  deviceId: string;
  vehicleReg: string;
  deviceTimestamp: string;
  serverTimestamp: string;
  latencyMs: number;
  packetType: "Periodic AVL Record" | "Heartbeat Ping" | "Ignition State Change" | "CAN Fuel Report" | "Cold Chain Temp" | "Harsh Braking Event";
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  altitude: number;
  ignition: "ON" | "OFF";
  odometer: number;
  fuel: number;
  batteryExt: number;
  batteryInt: number;
  satellites: number;
  gsmRssi: number;
  protocol: string;
  mockPayloadJson: Record<string, unknown>;
}

export interface DiagnosticLog {
  id: string;
  timestamp: string;
  deviceId: string;
  vehicleReg: string;
  severity: "INFO" | "WARN" | "ERROR";
  event: "Device connected" | "GPS packet received" | "Ignition state changed" | "Invalid packet detected" | "Device heartbeat missed" | "Device disconnected" | "Packet parsing completed";
  message: string;
  packetRef: string;
}

export const PIPELINE_COMPONENTS: PipelineComponent[] = [
  {
    id: "tcp-listener",
    name: "TCP Telematics Listener",
    protocol: "Teltonika Code8 / Code8e & Queclink @Track",
    port: "0.0.0.0:5027",
    status: "Listening · Simulated",
    messagesReceived: 348912,
    latency: "3.8 ms",
    lastActivity: "180ms ago",
    throughput: "492 pkts/sec",
    description: "Multi-threaded socket listener parsing binary frame preambles, CRC16 verification, and client ACK responses.",
    badge: "SIMULATED LISTENER",
  },
  {
    id: "udp-listener",
    name: "UDP Telemetry Endpoint",
    protocol: "Queclink Low-Power & Meitrack GPRS",
    port: "0.0.0.0:5028",
    status: "Listening · Simulated",
    messagesReceived: 114820,
    latency: "1.4 ms",
    lastActivity: "420ms ago",
    throughput: "162 pkts/sec",
    description: "Low-overhead datagram receiver for periodic heartbeat pings and battery-constrained trailer trackers.",
    badge: "SIMULATED ENDPOINT",
  },
  {
    id: "mqtt-broker",
    name: "MQTT Telematics Broker",
    protocol: "MQTT v5.0 over TLS 1.3",
    port: "telematics.trackwe.ae:8883",
    status: "Ready · Simulated",
    messagesReceived: 92450,
    latency: "8.6 ms",
    lastActivity: "950ms ago",
    throughput: "105 msgs/sec",
    description: "Enterprise message bus routing high-priority safety telemetry, ADAS events, and dashcam snapshot notifications.",
    badge: "SIMULATED BROKER",
  },
  {
    id: "message-parser",
    name: "Multi-Codec Decoder Engine",
    protocol: "Binary AVL / IO Elements Unpacker",
    port: "Internal Worker (16 Workers)",
    status: "Active · Simulated",
    messagesReceived: 556182,
    latency: "0.9 ms",
    lastActivity: "85ms ago",
    throughput: "759 records/sec",
    description: "Converts binary telemetry payloads into structured JSON records, validating sensor calibration and coordinate bounds.",
    badge: "SIMULATED WORKER",
  },
  {
    id: "telemetry-queue",
    name: "Telemetry Ingestion Queue",
    protocol: "Redis Stream (`stream:telemetry:ingress`)",
    port: "redis://10.24.120.4:6379",
    status: "Buffered · Simulated",
    messagesReceived: 556178,
    latency: "1.1 ms",
    lastActivity: "60ms ago",
    throughput: "Queue Depth: 9",
    description: "In-memory circular buffer isolating socket ingestion from database writes and spatial geofence evaluation.",
    badge: "SIMULATED BUFFER",
  },
  {
    id: "websocket-gateway",
    name: "Real-Time WebSocket Gateway",
    protocol: "WSS / Protobuf & JSON Events",
    port: "wss://telematics.trackwe.ae:8080/ws",
    status: "Broadcasting · Simulated",
    messagesReceived: 814920,
    latency: "12.4 ms",
    lastActivity: "140ms ago",
    throughput: "48 Active Clients",
    description: "Broadcasts live coordinates, speed changes, and instant ignition toggles to connected operations control rooms.",
    badge: "SIMULATED GATEWAY",
  },
];

const DEVICE_MODELS: ("Teltonika FMC130" | "Queclink GV300" | "Meitrack T333" | "Ruptela HCV5")[] = [
  "Teltonika FMC130",
  "Queclink GV300",
  "Meitrack T333",
  "Teltonika FMC130",
  "Ruptela HCV5",
];

const PROTOCOLS = [
  "Teltonika Code8e / TCP",
  "Queclink @Track / TCP",
  "Meitrack GPRS / UDP",
  "Teltonika Code8 / TCP",
  "Ruptela Protocol / TCP",
];

export function generateInitialDevices(): DeviceConnection[] {
  return vehicles.map((v, i) => {
    const model = DEVICE_MODELS[i % DEVICE_MODELS.length];
    const protocol = PROTOCOLS[i % PROTOCOLS.length];
    const isMoving = v.status === "Moving";
    const isIdle = v.status === "Idle";
    const isOffline = v.status === "Offline";

    let connectionStatus: "Connected" | "Disconnected" | "Reconnecting" | "Warning" = "Connected";
    let dataFetchStatus: "Active" | "Idle" | "Reconnecting" | "Failed" | "Syncing" = "Active";

    if (isOffline) {
      connectionStatus = i % 2 === 0 ? "Disconnected" : "Warning";
      dataFetchStatus = "Failed";
    } else if (isIdle) {
      if (i % 6 === 0) {
        connectionStatus = "Reconnecting";
        dataFetchStatus = "Reconnecting";
      } else {
        connectionStatus = "Connected";
        dataFetchStatus = "Idle";
      }
    } else {
      connectionStatus = "Connected";
      dataFetchStatus = i % 5 === 0 ? "Syncing" : "Active";
    }

    const dBm = isOffline
      ? -108 - (i % 8)
      : isIdle
        ? -82 - (i % 12)
        : -64 - (i % 16);

    const bars = dBm > -70 ? 5 : dBm > -85 ? 4 : dBm > -98 ? 3 : dBm > -105 ? 2 : 1;
    const percentage = Math.max(10, Math.min(100, Math.round(((dBm + 120) / 70) * 100)));
    const quality = bars >= 4 ? "Excellent" : bars === 3 ? "Good" : bars === 2 ? "Fair" : "Poor";

    const imei = `8629140${String(1000000 + i * 2917).slice(1)}`;
    const serial = `SN-UAE-${84000 + i * 37}`;
    const deviceId = `${model.slice(0, 3).toUpperCase()}-${imei.slice(-6)}`;

    const ignitionState: "ON" | "OFF" | "Unknown" = isMoving
      ? "ON"
      : isIdle
        ? "ON"
        : i % 3 === 0
          ? "Unknown"
          : "OFF";

    const rpm = isMoving ? 1650 + (i % 750) : isIdle ? 720 : 0;
    const voltageExt = isMoving ? 13.9 + (i % 4) * 0.1 : isIdle ? 12.6 : 11.9;
    const voltageInt = 3.7 + (i % 5) * 0.08;

    const lastComm = isOffline
      ? `${18 + (i % 12)}h ago`
      : isIdle
        ? `${2 + (i % 6)}m ago`
        : `${8 + (i % 42)}s ago`;

    const sampleHex = `000000000000004c8e0100000192a54f2800000000${(Math.round(v.lat * 10000000)).toString(16)}${(Math.round(v.lng * 10000000)).toString(16)}003c00420d${(v.speed).toString(16).padStart(2, "0")}010101010004000101010002000000000005`;

    return {
      deviceId,
      deviceModel: model,
      protocol,
      vehicleReg: v.registration,
      vehicleName: v.name,
      vehicleType: v.type,
      driver: v.driver,
      region: v.region,
      connectionStatus,
      lastCommunication: lastComm,
      lastCommunicationISO: isOffline ? "2026-10-21T18:20:00+04:00" : "2026-10-22T10:42:18+04:00",
      signalStrength: { dBm, bars, percentage, quality },
      dataFetchStatus,
      ipAddress: `10.142.${(i % 18) + 10}.${(i % 240) + 12}`,
      port: 41200 + (i * 17) % 8000,
      firmware: `v03.28.${String(i % 12).padStart(2, "0")}.Rev.00`,
      carrier: i % 2 === 0 ? "du UAE (LTE Cat-1)" : "e& Etisalat UAE (NB-IoT/4G)",
      imei,
      serialNumber: serial,
      satellites: isOffline ? 2 : 12 + (i % 6),
      hdop: isOffline ? 3.4 : 0.8 + (i % 4) * 0.1,
      odometer: 14200 + i * 840,
      ignition: ignitionState,
      rpm,
      speed: v.speed,
      voltageExt: Number(voltageExt.toFixed(1)),
      voltageInt: Number(voltageInt.toFixed(2)),
      fuel: v.fuel,
      temperature: v.temperature,
      rawPayloadHex: sampleHex,
      config: {
        reportingIntervalSec: isMoving ? 10 : 300,
        heartbeatSec: 60,
        apn: i % 2 === 0 ? "du.telematics" : "etisalat.m2m",
        serverIp: "10.24.120.4",
        serverPort: 5027,
        sleepMode: isOffline ? "Deep Sleep" : isIdle ? "GPS Sleep" : "Online High Performance",
        tlsEnabled: i % 2 === 0,
      },
    };
  });
}

export function generateIgnitionEvents(): IgnitionEvent[] {
  return [
    {
      id: "ign-01",
      vehicleReg: "Dubai A 24010",
      deviceId: "TEL-914001",
      event: "Ignition ON",
      timestamp: "2026-10-22 10:24:12 GST",
      duration: "Ongoing (18m)",
      location: "Dubai Investment Park (DIP 2) Central Depot",
      batteryVoltage: 13.9,
      driver: "Omar Hassan",
    },
    {
      id: "ign-02",
      vehicleReg: "Abu Dhabi 5 24027",
      deviceId: "QUE-916918",
      event: "Ignition OFF",
      timestamp: "2026-10-22 09:58:30 GST",
      duration: "Stationary (43m)",
      location: "Mussafah Industrial Hub Zone 4",
      batteryVoltage: 12.6,
      driver: "Ahmed Ali",
    },
    {
      id: "ign-03",
      vehicleReg: "Sharjah B 24044",
      deviceId: "MEI-919835",
      event: "Ignition ON",
      timestamp: "2026-10-22 09:41:05 GST",
      duration: "Ongoing (1h 01m)",
      location: "Al Sajaa Logistics Park",
      batteryVoltage: 14.1,
      driver: "Sara Khalid",
    },
    {
      id: "ign-04",
      vehicleReg: "Ajman B 24061",
      deviceId: "TEL-922752",
      event: "Ignition OFF",
      timestamp: "2026-10-22 09:12:44 GST",
      duration: "Stationary (1h 29m)",
      location: "Ajman Free Zone Gate 3",
      batteryVoltage: 12.5,
      driver: "Yusuf Ibrahim",
    },
    {
      id: "ign-05",
      vehicleReg: "Ras Al Khaimah B 24078",
      deviceId: "RUP-925669",
      event: "Ignition ON",
      timestamp: "2026-10-22 08:50:18 GST",
      duration: "Ongoing (1h 52m)",
      location: "Al Hamra Industrial Area",
      batteryVoltage: 13.8,
      driver: "Layla Saeed",
    },
    {
      id: "ign-06",
      vehicleReg: "Fujairah B 24095",
      deviceId: "TEL-928586",
      event: "Ignition OFF",
      timestamp: "2026-10-22 08:15:00 GST",
      duration: "Stationary (2h 27m)",
      location: "Port of Fujairah Tanker Berth 2",
      batteryVoltage: 12.4,
      driver: "Khalid Mansour",
    },
    {
      id: "ign-07",
      vehicleReg: "Al Ain B 24112",
      deviceId: "QUE-931503",
      event: "Ignition ON",
      timestamp: "2026-10-22 07:44:22 GST",
      duration: "Ongoing (2h 58m)",
      location: "Al Ain Sanaiya Warehouse Terminal",
      batteryVoltage: 14.0,
      driver: "Noor Abdullah",
    },
    {
      id: "ign-08",
      vehicleReg: "Dubai A 24129",
      deviceId: "MEI-934420",
      event: "Ignition OFF",
      timestamp: "2026-10-22 06:30:15 GST",
      duration: "Stationary (4h 12m)",
      location: "Jebel Ali Free Zone (JAFZA) South",
      batteryVoltage: 12.4,
      driver: "Faisal Ahmed",
    },
  ];
}

export function generateTelemetryRecords(): TelemetryRecord[] {
  const sampleVehicles = vehicles.slice(0, 16);
  return sampleVehicles.map((v, i) => {
    const isMoving = v.status === "Moving";
    const packetTypes: TelemetryRecord["packetType"][] = [
      "Periodic AVL Record",
      "CAN Fuel Report",
      "Periodic AVL Record",
      "Ignition State Change",
      "Cold Chain Temp",
      "Periodic AVL Record",
    ];

    const pType = packetTypes[i % packetTypes.length];
    const devSec = 10 + i * 4;
    const srvSec = devSec + 1;

    const payloadJson = {
      header: {
        codec: i % 2 === 0 ? "CODEC_8E_TELTONIKA" : "QUECLINK_TRACK_V3",
        imei: `8629140${String(1000000 + i * 2917).slice(1)}`,
        packet_seq: 14029 + i * 19,
        firmware: "v03.28.02",
      },
      gps_fix: {
        lat: v.lat,
        lng: v.lng,
        altitude_m: 24 + (i % 15),
        speed_kmh: v.speed,
        heading_deg: (45 + i * 28) % 360,
        satellites_in_view: 15,
        satellites_used: 12 + (i % 4),
        hdop: 0.8,
        valid: true,
      },
      io_elements: {
        din1_ignition: isMoving || v.status === "Idle",
        din2_panic_sos: false,
        ain1_fuel_analog_v: Number((2.1 + (v.fuel / 100) * 4.2).toFixed(2)),
        external_voltage_v: isMoving ? 13.9 : 12.6,
        internal_battery_v: 3.82,
        odometer_total_km: 14200 + i * 840,
        engine_rpm: isMoving ? 1820 : 0,
        coolant_temp_c: isMoving ? 88 : 42,
        temperature_sensor_c: v.temperature,
        gsm_rssi_csq: 27,
      },
      metadata: {
        simulated: true,
        region: v.region,
        ingested_via: "TCP_LISTENER_PORT_5027",
        processing_latency_ms: 18 + (i % 14),
      },
    };

    return {
      id: `tel-pkt-${1000 + i}`,
      deviceId: `TEL-FMC-${String(862000 + i * 43).slice(-6)}`,
      vehicleReg: v.registration,
      deviceTimestamp: `2026-10-22 10:42:${String(devSec).padStart(2, "0")} GST`,
      serverTimestamp: `2026-10-22 10:42:${String(srvSec).padStart(2, "0")} GST`,
      latencyMs: 180 + (i % 9) * 35,
      packetType: pType,
      lat: v.lat,
      lng: v.lng,
      speed: v.speed,
      heading: (45 + i * 28) % 360,
      altitude: 24 + (i % 15),
      ignition: isMoving || v.status === "Idle" ? "ON" : "OFF",
      odometer: 14200 + i * 840,
      fuel: v.fuel,
      batteryExt: isMoving ? 13.9 : 12.6,
      batteryInt: 3.82,
      satellites: 12 + (i % 4),
      gsmRssi: -66 - (i % 18),
      protocol: i % 2 === 0 ? "Teltonika Code8e / TCP" : "Queclink @Track / TCP",
      mockPayloadJson: payloadJson,
    };
  });
}

export function generateDiagnosticLogs(): DiagnosticLog[] {
  return [
    {
      id: "log-101",
      timestamp: "10:42:19.412",
      deviceId: "TEL-914001",
      vehicleReg: "Dubai A 24010",
      severity: "INFO",
      event: "GPS packet received",
      message: "Binary AVL frame parsed. 4 AVL records extracted, CRC16 verified (0x7F2B).",
      packetRef: "PKT-772914",
    },
    {
      id: "log-102",
      timestamp: "10:42:18.890",
      deviceId: "QUE-916918",
      vehicleReg: "Abu Dhabi 5 24027",
      severity: "INFO",
      event: "Packet parsing completed",
      message: "Periodic @Track report decoded: ACC=1, Speed=48km/h, Heading=112 deg.",
      packetRef: "PKT-772913",
    },
    {
      id: "log-103",
      timestamp: "10:42:15.120",
      deviceId: "MEI-919835",
      vehicleReg: "Sharjah B 24044",
      severity: "INFO",
      event: "Ignition state changed",
      message: "DIN1 transition 0 -> 1 detected. Vehicle engine started at Al Sajaa Logistics Hub.",
      packetRef: "PKT-772910",
    },
    {
      id: "log-104",
      timestamp: "10:41:58.334",
      deviceId: "TEL-922752",
      vehicleReg: "Ajman B 24061",
      severity: "WARN",
      event: "Device heartbeat missed",
      message: "Keep-alive window exceeded 60s. Socket transitioned to standby polling.",
      packetRef: "PKT-772898",
    },
    {
      id: "log-105",
      timestamp: "10:41:40.090",
      deviceId: "TEL-943171",
      vehicleReg: "Dubai A 24197",
      severity: "ERROR",
      event: "Invalid packet detected",
      message: "CRC16 checksum mismatch on port 5027 (expected 0x9A4F, received 0x0000). Frame dropped.",
      packetRef: "PKT-772881",
    },
    {
      id: "log-106",
      timestamp: "10:41:22.754",
      deviceId: "RUP-925669",
      vehicleReg: "Ras Al Khaimah B 24078",
      severity: "INFO",
      event: "Device connected",
      message: "TCP handshake established from 10.142.14.88:41890 (du UAE APN). IMEI authenticated.",
      packetRef: "PKT-772862",
    },
    {
      id: "log-107",
      timestamp: "10:40:55.201",
      deviceId: "TEL-957755",
      vehicleReg: "Abu Dhabi 5 24265",
      severity: "WARN",
      event: "Device disconnected",
      message: "Client TCP FIN received. Device entering timed GPS sleep mode.",
      packetRef: "PKT-772840",
    },
    {
      id: "log-108",
      timestamp: "10:40:12.678",
      deviceId: "QUE-931503",
      vehicleReg: "Al Ain B 24112",
      severity: "INFO",
      event: "GPS packet received",
      message: "12 satellites locked, HDOP 0.8. Telemetry queue depth within nominal limits.",
      packetRef: "PKT-772811",
    },
  ];
}

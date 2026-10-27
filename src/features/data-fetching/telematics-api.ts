import { SESSION_KEY } from "@/lib/auth";

export interface BackendHealthResponse {
  status: "healthy" | "degraded" | "error";
  timestamp: string;
  database: {
    connected: boolean;
    engine: string;
    latencyMs: number;
    error?: string;
  };
  tcpListener: {
    running: boolean;
    bind: string;
    uptimeSeconds: number;
    activeSessions: number;
    authorizedConnections: number;
    rejectedConnections: number;
  };
  packetPipeline: {
    packetsReceived: number;
    validPackets: number;
    invalidPackets: number;
    recordsProcessed: number;
    persistenceErrors: number;
    lastPacketReceiptTime: string | null;
    avgLatencyMs: number;
  };
}

export interface BackendDevice {
  id: string;
  imei: string;
  manufacturer: string;
  model: string;
  protocol: string;
  codec: string;
  org_id: string;
  vehicle_id: string | null;
  status: "active" | "disabled" | "revoked";
  firmware_version: string;
  sim_carrier: string;
  reporting_interval_sec: number;
  last_connection_at: string | null;
  last_communication_at: string | null;
  created_at: string;
  updated_at: string;
  vehicle_registration?: string;
  vehicle_name?: string;
  vehicle_type?: string;
  driver?: string;
  org_name?: string;
  latestTelemetry?: {
    device_id: string;
    vehicle_id: string | null;
    imei: string;
    device_timestamp: string;
    server_timestamp: string;
    lat: number;
    lng: number;
    altitude: number;
    angle: number;
    speed: number;
    satellites: number;
    ignition: "ON" | "OFF" | "Unknown";
    movement: "Moving" | "Stationary" | "Unknown";
    external_voltage: number | null;
    internal_battery_voltage: number | null;
    gsm_signal: number | null;
    raw_payload_hex: string | null;
    updated_at: string;
  } | null;
}

export interface BackendIgnitionResponse {
  summary: {
    verifiedOnCount: number;
    verifiedOffCount: number;
    staleOrUnknownCount: number;
    totalMonitored: number;
    staleThresholdMinutes: number;
    vehicles: Array<{
      vehicleId: string;
      vehicleReg: string;
      deviceId: string;
      driver: string;
      status: "ON" | "OFF" | "Stale" | "Unknown";
      lastEventTime: string | null;
      serverTime: string | null;
      batteryVoltage: number | null;
      isStale: boolean;
    }>;
  };
  events: Array<{
    id: string;
    device_id: string;
    vehicle_id: string | null;
    org_id: string;
    event_type: "IGNITION_ON" | "IGNITION_OFF";
    timestamp: string;
    server_timestamp: string;
    lat: number | null;
    lng: number | null;
    external_voltage: number | null;
    vehicle_registration?: string;
    driver?: string;
  }>;
}

export interface BackendTelemetryResponse {
  data: Array<{
    id: string;
    device_id: string;
    vehicle_id: string | null;
    org_id: string;
    device_timestamp: string;
    server_timestamp: string;
    priority: number;
    lat: number;
    lng: number;
    altitude: number;
    angle: number;
    speed: number;
    satellites: number;
    ignition: "ON" | "OFF" | "Unknown";
    movement: "Moving" | "Stationary" | "Unknown";
    external_voltage: number | null;
    internal_battery_voltage: number | null;
    gsm_signal: number | null;
    io_elements: string | null;
    codec_id: string;
    raw_payload_hex: string | null;
    vehicle_registration?: string;
    driver?: string;
  }>;
  pagination: {
    total: number;
    page: number;
    limit: number;
    pageCount: number;
  };
}

export interface BackendLogsResponse {
  data: Array<{
    id: string;
    device_id: string | null;
    imei: string | null;
    vehicle_id: string | null;
    org_id: string | null;
    event_type: string;
    severity: "INFO" | "WARN" | "ERROR";
    message: string;
    packet_ref: string | null;
    details: string | null;
    created_at: string;
    vehicle_registration?: string;
  }>;
  pagination: {
    total: number;
    page: number;
    limit: number;
    pageCount: number;
  };
}

function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (typeof window !== "undefined") {
    try {
      const session = JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null");
      if (session?.accountId) {
        headers["Authorization"] = `Bearer ${session.accountId}`;
        headers["x-trackwe-account-id"] = session.accountId;
      }
    } catch {
      // Ignore session read error
    }
  }

  return headers;
}

export const telematicsApi = {
  async fetchHealth(): Promise<BackendHealthResponse> {
    const res = await fetch("/api/telematics/health", {
      headers: getAuthHeaders(),
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Health check returned HTTP ${res.status}: ${res.statusText}`);
    }
    return res.json();
  },

  async fetchDevices(params: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: BackendDevice[]; pagination: { total: number; page: number; limit: number; pageCount: number } }> {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (params.status && params.status !== "All") query.set("status", params.status);
    if (params.page !== undefined) query.set("page", params.page.toString());
    if (params.limit !== undefined) query.set("limit", params.limit.toString());

    const res = await fetch(`/api/telematics/devices?${query.toString()}`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Devices fetch returned HTTP ${res.status}: ${res.statusText}`);
    }
    return res.json();
  },

  async registerDevice(data: {
    imei: string;
    model?: string;
    vehicleId?: string | null;
    reportingIntervalSec?: number;
    simCarrier?: string;
  }): Promise<{ data: BackendDevice }> {
    const res = await fetch("/api/telematics/devices", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Device registration failed with HTTP ${res.status}`);
    }
    return res.json();
  },

  async updateDevice(
    id: string,
    updates: Partial<{
      vehicleId: string | null;
      status: "active" | "disabled" | "revoked";
      model: string;
      reportingIntervalSec: number;
    }>
  ): Promise<{ data: BackendDevice }> {
    const res = await fetch(`/api/telematics/devices/${id}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Device update failed with HTTP ${res.status}`);
    }
    return res.json();
  },

  async deleteDevice(id: string): Promise<void> {
    const res = await fetch(`/api/telematics/devices/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Device deletion failed with HTTP ${res.status}`);
    }
  },

  async fetchTelemetry(params: {
    vehicleId?: string;
    deviceId?: string;
    page?: number;
    limit?: number;
  }): Promise<BackendTelemetryResponse> {
    const query = new URLSearchParams();
    if (params.vehicleId && params.vehicleId !== "All") query.set("vehicleId", params.vehicleId);
    if (params.deviceId && params.deviceId !== "All") query.set("deviceId", params.deviceId);
    if (params.page !== undefined) query.set("page", params.page.toString());
    if (params.limit !== undefined) query.set("limit", params.limit.toString());

    const res = await fetch(`/api/telematics/telemetry?${query.toString()}`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Telemetry fetch returned HTTP ${res.status}`);
    }
    return res.json();
  },

  async fetchIgnition(params?: {
    vehicleId?: string;
    limit?: number;
    staleThreshold?: number;
  }): Promise<BackendIgnitionResponse> {
    const query = new URLSearchParams();
    if (params?.vehicleId && params.vehicleId !== "All") query.set("vehicleId", params.vehicleId);
    if (params?.limit !== undefined) query.set("limit", params.limit.toString());
    if (params?.staleThreshold !== undefined) query.set("staleThreshold", params.staleThreshold.toString());

    const res = await fetch(`/api/telematics/ignition?${query.toString()}`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Ignition fetch returned HTTP ${res.status}`);
    }
    return res.json();
  },

  async fetchLogs(params: {
    severity?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<BackendLogsResponse> {
    const query = new URLSearchParams();
    if (params.severity && params.severity !== "All") query.set("severity", params.severity);
    if (params.search) query.set("search", params.search);
    if (params.page !== undefined) query.set("page", params.page.toString());
    if (params.limit !== undefined) query.set("limit", params.limit.toString());

    const res = await fetch(`/api/telematics/logs?${query.toString()}`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Logs fetch returned HTTP ${res.status}`);
    }
    return res.json();
  },
};

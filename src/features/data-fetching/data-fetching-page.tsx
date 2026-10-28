"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Battery,
  Cable,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Cpu,
  Database,
  Download,
  Eye,
  FileCode,
  Gauge,
  KeyRound,
  Layers,
  MapPin,
  Maximize2,
  Plus,
  Power,
  Radio,
  RefreshCw,
  RotateCcw,
  Search,
  Server,
  ShieldCheck,
  Signal,
  Sliders,
  Terminal,
  Trash2,
  Truck,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/table";
import { Dialog } from "@/components/ui/dialog";
import { KPI } from "@/components/ui/kpi";
import { Panel } from "@/components/ui/panel";
import { dubaiTime } from "@/lib/format";
import { useWorkspace } from "@/providers/workspace-provider";
import {
  DeviceConnection,
  DiagnosticLog,
  generateDiagnosticLogs,
  generateIgnitionEvents,
  generateInitialDevices,
  generateTelemetryRecords,
  IgnitionEvent,
  PIPELINE_COMPONENTS,
  PipelineComponent,
  TelemetryRecord,
} from "./mock-data";
import {
  BackendDevice,
  BackendHealthResponse,
  BackendIgnitionResponse,
  telematicsApi,
} from "./telematics-api";
import "./data-fetching.css";

export function DataFetchingPage() {
  const { setNotice, vehicles: workspaceVehicles, account } = useWorkspace();

  // Mode Selection: Real Backend (default) vs Demo Simulation
  const [dataSource, setDataSource] = useState<"real" | "demo">("real");

  // Active Tab
  const [activeTab, setActiveTab] = useState<"devices" | "pipeline" | "ignition" | "telemetry" | "logs">("devices");

  // Real Backend Data States
  const [backendHealth, setBackendHealth] = useState<BackendHealthResponse | null>(null);
  const [backendLoading, setBackendLoading] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [backendDevices, setBackendDevices] = useState<BackendDevice[]>([]);
  const [backendIgnition, setBackendIgnition] = useState<BackendIgnitionResponse | null>(null);
  const [backendTelemetryRecords, setBackendTelemetryRecords] = useState<any[]>([]);
  const [backendDiagnosticLogs, setBackendDiagnosticLogs] = useState<any[]>([]);

  // Demo Mock Data
  const [demoDevices] = useState<DeviceConnection[]>(() => generateInitialDevices());
  const [demoIgnitionEvents] = useState<IgnitionEvent[]>(() => generateIgnitionEvents());
  const [demoTelemetryRecords] = useState<TelemetryRecord[]>(() => generateTelemetryRecords());
  const [demoDiagnosticLogs] = useState<DiagnosticLog[]>(() => generateDiagnosticLogs());

  // Registration Modal State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regImei, setRegImei] = useState("");
  const [regModel, setRegModel] = useState("Teltonika FMC920");
  const [regVehicleId, setRegVehicleId] = useState("");
  const [regInterval, setRegInterval] = useState("60");
  const [regCarrier, setRegCarrier] = useState("e& (Etisalat) UAE");
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  // Interactive Modals & Drawers
  const [selectedDevice, setSelectedDevice] = useState<DeviceConnection | null>(null);
  const [selectedTelemetry, setSelectedTelemetry] = useState<TelemetryRecord | null>(null);
  const [showIgnitionHistory, setShowIgnitionHistory] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState("");

  // Filters for Device Monitor
  const [searchDevice, setSearchDevice] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [protocolFilter, setProtocolFilter] = useState("All");
  const [modelFilter, setModelFilter] = useState("All");
  const [devicePage, setDevicePage] = useState(0);

  // Filters for Ignition Monitor
  const [ignitionStateFilter, setIgnitionStateFilter] = useState("All");
  const [searchIgnitionVehicle, setSearchIgnitionVehicle] = useState("");
  const [ignitionPage, setIgnitionPage] = useState(0);

  // Filters for Telemetry Records
  const [telemetryVehicleFilter, setTelemetryVehicleFilter] = useState("All");
  const [telemetryTypeFilter, setTelemetryTypeFilter] = useState("All");
  const [telemetryPage, setTelemetryPage] = useState(0);

  // Filters for Diagnostic Logs
  const [logSeverity, setLogSeverity] = useState("All");
  const [searchLog, setSearchLog] = useState("");
  const [logPage, setLogPage] = useState(0);

  // Refresh State
  const [lastFetchTime, setLastFetchTime] = useState("Connecting...");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch real backend data
  const loadRealBackendData = useCallback(async () => {
    setBackendLoading(true);
    setBackendError(null);
    try {
      const [health, devicesRes, ignRes, telemRes, logsRes] = await Promise.all([
        telematicsApi.fetchHealth().catch((e) => {
          console.warn("Health check error:", e);
          return null;
        }),
        telematicsApi.fetchDevices({ limit: 100 }),
        telematicsApi.fetchIgnition(),
        telematicsApi.fetchTelemetry({ limit: 50 }),
        telematicsApi.fetchLogs({ limit: 50 }),
      ]);

      if (health) setBackendHealth(health);
      setBackendDevices(devicesRes.data || []);
      setBackendIgnition(ignRes);
      setBackendTelemetryRecords(telemRes.data || []);
      setBackendDiagnosticLogs(logsRes.data || []);
      setLastFetchTime(`${dubaiTime()} GST · Real Backend`);
    } catch (err: any) {
      setBackendError(err.message || "Failed to connect to backend telematics service.");
      setLastFetchTime("Backend Unavailable");
    } finally {
      setBackendLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (dataSource === "real") {
      loadRealBackendData();
    } else {
      setLastFetchTime(`${dubaiTime()} GST · Simulated`);
    }
  }, [dataSource, loadRealBackendData]);

  // Map Backend Devices to UI format
  const activeDevices: DeviceConnection[] = useMemo(() => {
    if (dataSource === "demo") {
      return demoDevices;
    }

    return backendDevices.map((d) => {
      const isConnected =
        d.last_communication_at && Date.now() - new Date(d.last_communication_at).getTime() < 300000;
      const gsmBars = d.latestTelemetry?.gsm_signal ?? 0;
      const connStatus =
        d.status === "disabled" ? "Disconnected" : isConnected ? "Connected" : "Disconnected";

      return {
        deviceId: d.id,
        deviceModel: (d.model as any) || "Teltonika FMC920",
        protocol: d.protocol || "Teltonika Codec 8 / 8E",
        vehicleReg: d.vehicle_registration || "Unassigned",
        vehicleName: d.vehicle_name || "Unassigned Vehicle",
        vehicleType: d.vehicle_type || "Fleet Tracker",
        driver: d.driver || "Unassigned Driver",
        region: "UAE Fleet",
        connectionStatus: connStatus,
        lastCommunication: d.last_communication_at
          ? new Date(d.last_communication_at).toLocaleString()
          : "Never connected",
        lastCommunicationISO: d.last_communication_at || "",
        signalStrength: {
          dBm: gsmBars > 0 ? -113 + gsmBars * 15 : -110,
          bars: gsmBars,
          percentage: gsmBars * 20,
          quality: gsmBars >= 4 ? "Excellent" : gsmBars === 3 ? "Good" : gsmBars > 0 ? "Fair" : "Poor",
        },
        dataFetchStatus: isConnected ? "Active" : "Idle",
        ipAddress: "127.0.0.1",
        port: 5027,
        firmware: d.firmware_version,
        carrier: d.sim_carrier,
        imei: d.imei,
        serialNumber: d.id,
        satellites: d.latestTelemetry?.satellites ?? 0,
        hdop: 1.1,
        odometer: 0,
        ignition: d.latestTelemetry?.ignition ?? "Unknown",
        rpm: 0,
        speed: d.latestTelemetry?.speed ?? 0,
        voltageExt: d.latestTelemetry?.external_voltage ?? 0,
        voltageInt: d.latestTelemetry?.internal_battery_voltage ?? 0,
        lat: d.latestTelemetry?.lat,
        lng: d.latestTelemetry?.lng,
        fuel: 0,
        temperature: null,
        rawPayloadHex: d.latestTelemetry?.raw_payload_hex || "",
        config: {
          reportingIntervalSec: d.reporting_interval_sec,
          heartbeatSec: 120,
          apn: "etisalat.ae",
          serverIp: "telematics.trackwe.ae",
          serverPort: 5027,
          sleepMode: "GPS Sleep",
          tlsEnabled: false,
        },
      };
    });
  }, [dataSource, backendDevices, demoDevices]);

  // Map Telemetry records
  const activeTelemetryRecords: TelemetryRecord[] = useMemo(() => {
    if (dataSource === "demo") return demoTelemetryRecords;

    return backendTelemetryRecords.map((r) => {
      const devTime = new Date(r.device_timestamp).getTime();
      const srvTime = new Date(r.server_timestamp).getTime();
      return {
        id: r.id,
        deviceId: r.device_id,
        vehicleReg: r.vehicle_registration || "Unassigned",
        deviceTimestamp: new Date(r.device_timestamp).toLocaleString(),
        serverTimestamp: new Date(r.server_timestamp).toLocaleString(),
        latencyMs: Math.max(0, srvTime - devTime),
        packetType: "Periodic AVL Record",
        lat: r.lat,
        lng: r.lng,
        speed: r.speed,
        heading: r.angle,
        altitude: r.altitude,
        ignition: r.ignition === "ON" ? "ON" : "OFF",
        odometer: 0,
        fuel: 0,
        batteryExt: r.external_voltage ?? 0,
        batteryInt: r.internal_battery_voltage ?? 0,
        satellites: r.satellites,
        gsmRssi: (r.gsm_signal ?? 0) * 6,
        protocol: `Teltonika ${r.codec_id}`,
        mockPayloadJson: r.io_elements ? JSON.parse(r.io_elements) : {},
      };
    });
  }, [dataSource, backendTelemetryRecords, demoTelemetryRecords]);

  // Map Diagnostic logs
  const activeDiagnosticLogs: DiagnosticLog[] = useMemo(() => {
    if (dataSource === "demo") return demoDiagnosticLogs;

    return backendDiagnosticLogs.map((l) => ({
      id: l.id,
      timestamp: new Date(l.created_at).toLocaleString(),
      deviceId: l.device_id || "Ingestion Service",
      vehicleReg: l.vehicle_registration || "Unassigned",
      severity: l.severity,
      event: l.event_type as any,
      message: l.message,
      packetRef: l.packet_ref || "N/A",
    }));
  }, [dataSource, backendDiagnosticLogs, demoDiagnosticLogs]);

  // Map Ignition events
  const activeIgnitionEvents: IgnitionEvent[] = useMemo(() => {
    if (dataSource === "demo") return demoIgnitionEvents;
    if (!backendIgnition) return [];

    return backendIgnition.events.map((e) => ({
      id: e.id,
      vehicleReg: e.vehicle_registration || "Unassigned",
      deviceId: e.device_id,
      event: e.event_type === "IGNITION_ON" ? "Ignition ON" : "Ignition OFF",
      timestamp: new Date(e.timestamp).toLocaleString(),
      duration: "Event Logged",
      location: e.lat && e.lng ? `${e.lat.toFixed(4)}, ${e.lng.toFixed(4)}` : "Coordinates recorded",
      batteryVoltage: e.external_voltage ?? 0,
      driver: e.driver || "Fleet Driver",
    }));
  }, [dataSource, backendIgnition, demoIgnitionEvents]);

  // Summary Metrics
  const connectedCount = activeDevices.filter((d) => d.connectionStatus === "Connected").length;
  const disconnectedCount = activeDevices.filter((d) => d.connectionStatus === "Disconnected").length;
  const warningCount = activeDevices.filter((d) => d.connectionStatus === "Warning" || d.connectionStatus === "Reconnecting").length;

  const ignitionOnCount =
    dataSource === "real" && backendIgnition
      ? backendIgnition.summary.verifiedOnCount
      : activeDevices.filter((d) => d.ignition === "ON").length;

  const ignitionOffCount =
    dataSource === "real" && backendIgnition
      ? backendIgnition.summary.verifiedOffCount
      : activeDevices.filter((d) => d.ignition === "OFF").length;

  const ignitionUnknownCount =
    dataSource === "real" && backendIgnition
      ? backendIgnition.summary.staleOrUnknownCount
      : activeDevices.filter((d) => d.ignition === "Unknown").length;

  function refreshData() {
    setIsRefreshing(true);
    if (dataSource === "real") {
      loadRealBackendData();
    } else {
      setTimeout(() => {
        setLastFetchTime(`${dubaiTime()} GST · Simulated`);
        setIsRefreshing(false);
        setNotice("Demo telemetry state refreshed. Live simulation timestamp updated.");
      }, 400);
    }
  }

  async function handleRegisterDevice(e: React.FormEvent) {
    e.preventDefault();
    setRegError(null);
    setRegSubmitting(true);
    try {
      await telematicsApi.registerDevice({
        imei: regImei.trim(),
        model: regModel,
        vehicleId: regVehicleId || null,
        reportingIntervalSec: parseInt(regInterval, 10) || 60,
        simCarrier: regCarrier,
      });

      setNotice(`Device with IMEI ${regImei.trim()} registered successfully!`);
      setShowRegisterModal(false);
      setRegImei("");
      setRegVehicleId("");
      await loadRealBackendData();
    } catch (err: any) {
      setRegError(err.message || "Failed to register device");
    } finally {
      setRegSubmitting(false);
    }
  }

  async function handleToggleDeviceStatus(device: DeviceConnection) {
    if (dataSource === "demo") {
      setNotice("Device status changes in demo mode are local simulations.");
      return;
    }
    const nextStatus = device.connectionStatus === "Connected" ? "disabled" : "active";
    try {
      await telematicsApi.updateDevice(device.deviceId, { status: nextStatus });
      setNotice(`Device ${device.deviceId} status updated to ${nextStatus}.`);
      await loadRealBackendData();
      if (selectedDevice?.deviceId === device.deviceId) {
        setSelectedDevice(null);
      }
    } catch (err: any) {
      setNotice(`Failed to update device status: ${err.message}`);
    }
  }

  async function handleDeleteDevice(deviceId: string) {
    if (dataSource === "demo") {
      setNotice("Device deletion in demo mode is restricted.");
      return;
    }
    if (!confirm(`Are you sure you want to revoke and delete device ${deviceId}?`)) return;
    try {
      await telematicsApi.deleteDevice(deviceId);
      setNotice(`Device ${deviceId} revoked.`);
      setSelectedDevice(null);
      await loadRealBackendData();
    } catch (err: any) {
      setNotice(`Failed to revoke device: ${err.message}`);
    }
  }

  function handleCopy(text: string, label: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedNotification(`Copied ${label} to clipboard!`);
      setTimeout(() => setCopiedNotification(""), 3000);
    }
  }

  // Filtered Devices
  const filteredDevices = useMemo(() => {
    return activeDevices.filter((d) => {
      const matchSearch =
        d.deviceId.toLowerCase().includes(searchDevice.toLowerCase()) ||
        d.vehicleReg.toLowerCase().includes(searchDevice.toLowerCase()) ||
        d.driver.toLowerCase().includes(searchDevice.toLowerCase()) ||
        d.imei.includes(searchDevice);
      const matchStatus = statusFilter === "All" || d.connectionStatus === statusFilter;
      const matchProtocol = protocolFilter === "All" || d.protocol.toLowerCase().includes(protocolFilter.toLowerCase());
      const matchModel = modelFilter === "All" || d.deviceModel === modelFilter;
      return matchSearch && matchStatus && matchProtocol && matchModel;
    });
  }, [activeDevices, searchDevice, statusFilter, protocolFilter, modelFilter]);

  const devicePageCount = Math.max(1, Math.ceil(filteredDevices.length / 8));
  const pagedDevices = filteredDevices.slice(devicePage * 8, (devicePage + 1) * 8);

  // Filtered Ignition Vehicles
  const filteredIgnitionDevices = useMemo(() => {
    return activeDevices.filter((d) => {
      const matchSearch =
        d.vehicleReg.toLowerCase().includes(searchIgnitionVehicle.toLowerCase()) ||
        d.deviceId.toLowerCase().includes(searchIgnitionVehicle.toLowerCase()) ||
        d.driver.toLowerCase().includes(searchIgnitionVehicle.toLowerCase());
      const matchIgnition = ignitionStateFilter === "All" || d.ignition === ignitionStateFilter;
      return matchSearch && matchIgnition;
    });
  }, [activeDevices, searchIgnitionVehicle, ignitionStateFilter]);

  const ignitionPageCount = Math.max(1, Math.ceil(filteredIgnitionDevices.length / 8));
  const pagedIgnitionDevices = filteredIgnitionDevices.slice(ignitionPage * 8, (ignitionPage + 1) * 8);

  // Filtered Telemetry Records
  const filteredTelemetry = useMemo(() => {
    return activeTelemetryRecords.filter((t) => {
      const matchVeh = telemetryVehicleFilter === "All" || t.vehicleReg === telemetryVehicleFilter;
      const matchType = telemetryTypeFilter === "All" || t.packetType === telemetryTypeFilter;
      return matchVeh && matchType;
    });
  }, [activeTelemetryRecords, telemetryVehicleFilter, telemetryTypeFilter]);

  const telemetryPageCount = Math.max(1, Math.ceil(filteredTelemetry.length / 8));
  const pagedTelemetry = filteredTelemetry.slice(telemetryPage * 8, (telemetryPage + 1) * 8);

  // Filtered Diagnostic Logs
  const filteredLogs = useMemo(() => {
    return activeDiagnosticLogs.filter((l) => {
      const matchSev = logSeverity === "All" || l.severity === logSeverity;
      const matchText =
        l.message.toLowerCase().includes(searchLog.toLowerCase()) ||
        l.deviceId.toLowerCase().includes(searchLog.toLowerCase()) ||
        l.event.toLowerCase().includes(searchLog.toLowerCase()) ||
        l.vehicleReg.toLowerCase().includes(searchLog.toLowerCase());
      return matchSev && matchText;
    });
  }, [activeDiagnosticLogs, logSeverity, searchLog]);

  const logPageCount = Math.max(1, Math.ceil(filteredLogs.length / 8));
  const pagedLogs = filteredLogs.slice(logPage * 8, (logPage + 1) * 8);

  return (
    <div className="data-fetching-container">
      {/* Mode Control & Top Action Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Telematics & Data Ingestion Pipeline</h2>
          <small style={{ color: "var(--muted)" }}>
            Teltonika FMC920 TCP binary protocol decoder (Codec 8 / 8E), device registry & ignition monitoring
          </small>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Real Backend vs Demo Mode Toggle */}
          <div className="df-mode-toggle-group" role="group" aria-label="Data source mode">
            <button
              className={`df-mode-toggle-btn ${dataSource === "real" ? "active live" : ""}`}
              onClick={() => setDataSource("real")}
            >
              <Radio size={13} />
              Real Backend APIs
            </button>
            <button
              className={`df-mode-toggle-btn ${dataSource === "demo" ? "active" : ""}`}
              onClick={() => setDataSource("demo")}
            >
              <Cpu size={13} />
              Demo Simulation
            </button>
          </div>

          {account?.role !== "Employee" && (
            <button className="button primary" onClick={() => setShowRegisterModal(true)}>
              <Plus size={14} />
              Register GPS Device
            </button>
          )}

          <button className="button" onClick={refreshData} disabled={isRefreshing || backendLoading}>
            <RefreshCw size={14} className={isRefreshing || backendLoading ? "spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Backend Status Alert Banners */}
      {dataSource === "real" && (
        <>
          {backendError && (
            <div className="df-alert-banner error">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <AlertTriangle size={18} style={{ color: "#e06c75" }} />
                <div>
                  <strong>Backend Service Unavailable:</strong> {backendError}
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                    Ensure the Next.js server or database is running. Displaying offline state without fabricating telemetry.
                  </div>
                </div>
              </div>
              <button className="button small" onClick={loadRealBackendData}>
                <RefreshCw size={13} /> Retry
              </button>
            </div>
          )}

          {!backendError && backendHealth && (
            <div className="df-alert-banner healthy">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <CheckCircle2 size={18} style={{ color: "var(--green)" }} />
                <div>
                  <strong>Real Backend Pipeline Connected:</strong> Database reachable ({backendHealth.database.engine}, {backendHealth.database.latencyMs}ms) ·
                  TCP Listener: <code>{backendHealth.tcpListener.bind}</code> ({backendHealth.tcpListener.running ? "Listening" : "Stopped"}) ·
                  Processed {backendHealth.packetPipeline.recordsProcessed.toLocaleString()} AVL records
                </div>
              </div>
              <span className="badge moving">PROD ARCHITECTURE</span>
            </div>
          )}
        </>
      )}

      {/* Overview Top Bar & KPIs */}
      <div className="df-overview-grid">
        <KPI
          label="Device Registry"
          value={`${connectedCount} / ${activeDevices.length}`}
          icon={Radio}
          note={
            dataSource === "real"
              ? activeDevices.length === 0
                ? "Empty device registry"
                : `${connectedCount} active TCP connections`
              : `${Math.round((connectedCount / activeDevices.length) * 100)}% active fleet reporting`
          }
          tone="green"
        />
        <KPI
          label="Disconnected / Alerts"
          value={disconnectedCount + warningCount}
          icon={AlertTriangle}
          note={`${disconnectedCount} offline · ${warningCount} warnings`}
          tone="gold"
        />
        <KPI
          label="Last Telemetry Receipt"
          value={lastFetchTime.split(" ")[1] || "Waiting"}
          icon={Clock}
          note={dataSource === "real" ? "Real FMC920 packet stream" : "GST · Simulated broker timestamp"}
          tone="navy"
        />
        <KPI
          label="Ingestion Rate"
          value={
            dataSource === "real" && backendHealth
              ? `${backendHealth.packetPipeline.recordsProcessed}`
              : "1,280"
          }
          icon={Zap}
          note={dataSource === "real" ? "Total verified AVL records" : "Incoming messages / minute"}
          tone="green"
        />
        <KPI
          label="Verified Ignition Active"
          value={ignitionOnCount}
          icon={Power}
          note={`${ignitionOnCount} running · ${ignitionOffCount} off · ${ignitionUnknownCount} unknown`}
          tone="green"
        />
        <KPI
          label="Pipeline Latency"
          value={
            dataSource === "real" && backendHealth
              ? `${backendHealth.packetPipeline.avgLatencyMs} ms`
              : "3.8 ms"
          }
          icon={Sliders}
          note={dataSource === "real" ? "Socket parse & commit latency" : "0.002% CRC / timeout errors"}
          tone="gray"
        />
      </div>

      {/* Navigation Tabs */}
      <div className="df-tabs-bar">
        {[
          { key: "devices", label: "Device Connections", icon: Radio, count: activeDevices.length },
          { key: "pipeline", label: "TCP & Protocol Pipeline", icon: Server, badge: dataSource === "real" ? "Live FMC920" : "6 Services" },
          { key: "ignition", label: "Ignition Monitoring", icon: Power, count: ignitionOnCount },
          { key: "telemetry", label: "Telemetry Ingestion", icon: Cpu, count: activeTelemetryRecords.length },
          { key: "logs", label: "Diagnostic Event Logs", icon: Terminal, count: activeDiagnosticLogs.length },
        ].map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              className={`df-tab-button ${isActive ? "active" : ""}`}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
            >
              <TabIcon size={16} />
              <span>{tab.label}</span>
              {tab.count !== undefined && <Badge>{tab.count}</Badge>}
              {tab.badge && <span className="df-simulated-badge">{tab.badge}</span>}
            </button>
          );
        })}
      </div>

      {/* TAB 1: DEVICE CONNECTIONS MONITOR */}
      {activeTab === "devices" && (
        <Panel
          title="Device Connection Monitor"
          sub={
            dataSource === "real"
              ? "Persisted GPS hardware registry and live TCP socket sessions"
              : "Real-time connectivity status across simulated UAE fleet"
          }
          action={
            <div className="filters">
              <span className="df-simulated-badge">
                {dataSource === "real" ? "REAL BACKEND MODE" : "DEMO SIMULATION"}
              </span>
              {account?.role !== "Employee" && (
                <button className="button small primary" onClick={() => setShowRegisterModal(true)}>
                  <Plus size={13} /> Add Device
                </button>
              )}
            </div>
          }
        >
          {/* Filters Bar */}
          <div className="df-filter-bar">
            <div className="df-filter-group">
              <label className="search">
                <Search size={15} />
                <input
                  placeholder="Search Device ID, IMEI, Vehicle..."
                  value={searchDevice}
                  onChange={(e) => {
                    setSearchDevice(e.target.value);
                    setDevicePage(0);
                  }}
                  aria-label="Search devices"
                />
              </label>

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setDevicePage(0);
                }}
                aria-label="Filter status"
              >
                <option value="All">All Statuses</option>
                <option value="Connected">Connected</option>
                <option value="Disconnected">Disconnected</option>
                <option value="Reconnecting">Reconnecting</option>
                <option value="Warning">Warning</option>
              </select>

              <select
                value={modelFilter}
                onChange={(e) => {
                  setModelFilter(e.target.value);
                  setDevicePage(0);
                }}
                aria-label="Filter model"
              >
                <option value="All">All Hardware Models</option>
                <option value="Teltonika FMC920">Teltonika FMC920</option>
                <option value="Teltonika FMC130">Teltonika FMC130</option>
                <option value="Queclink GV300">Queclink GV300</option>
                <option value="Meitrack T333">Meitrack T333</option>
              </select>

              <select
                value={protocolFilter}
                onChange={(e) => {
                  setProtocolFilter(e.target.value);
                  setDevicePage(0);
                }}
                aria-label="Filter protocol"
              >
                <option value="All">All Protocols</option>
                <option value="Teltonika">Teltonika Codec 8 / 8E</option>
                <option value="Queclink">Queclink @Track</option>
                <option value="Meitrack">Meitrack GPRS</option>
              </select>
            </div>

            {(searchDevice || statusFilter !== "All" || modelFilter !== "All" || protocolFilter !== "All") && (
              <button
                className="text-button"
                onClick={() => {
                  setSearchDevice("");
                  setStatusFilter("All");
                  setModelFilter("All");
                  setProtocolFilter("All");
                  setDevicePage(0);
                }}
              >
                <RotateCcw size={12} />
                Clear Filters
              </button>
            )}
          </div>

          {/* Empty Registry State in Real Backend Mode */}
          {dataSource === "real" && activeDevices.length === 0 && !backendLoading && (
            <div className="df-empty-state">
              <div className="df-empty-icon">
                <Radio size={28} />
              </div>
              <h3 className="df-empty-title">Device Registry is Empty</h3>
              <p className="df-empty-sub">
                No GPS trackers are registered in the backend database yet. Register a Teltonika FMC920 tracker with its 15-digit IMEI to authorize incoming TCP socket connections and start persisting real AVL telemetry.
              </p>
              {account?.role !== "Employee" && (
                <button className="button primary" onClick={() => setShowRegisterModal(true)}>
                  <Plus size={15} />
                  Register First Teltonika FMC920
                </button>
              )}
            </div>
          )}

          {/* Devices Table */}
          {(activeDevices.length > 0 || dataSource === "demo") && (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Device ID</th>
                    <th>IMEI</th>
                    <th>Hardware Model</th>
                    <th>Protocol</th>
                    <th>Assigned Vehicle</th>
                    <th>Live GPS / Fix Status</th>
                    <th>Status</th>
                    <th>Last Communication</th>
                    <th>GSM Signal</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedDevices.map((dev) => (
                    <tr key={dev.deviceId}>
                      <td>
                        <button
                          className="text-button"
                          style={{ fontWeight: 600, fontFamily: "monospace" }}
                          onClick={() => setSelectedDevice(dev)}
                        >
                          {dev.deviceId}
                        </button>
                      </td>
                      <td>
                        <code style={{ fontSize: 12, color: "var(--navy)" }}>{dev.imei}</code>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Cpu size={14} style={{ color: "var(--muted)" }} />
                          <span>{dev.deviceModel}</span>
                        </div>
                      </td>
                      <td>
                        <small style={{ color: "var(--text-secondary)", fontFamily: "monospace" }}>
                          {dev.protocol}
                        </small>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Truck size={14} style={{ color: "var(--gold)" }} />
                          <b>{dev.vehicleReg}</b>
                        </div>
                      </td>
                      <td>
                        {dev.lat && dev.lng && (Math.abs(dev.lat) > 0.0001 || Math.abs(dev.lng) > 0.0001) ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span className="badge moving" style={{ fontFamily: "monospace", fontSize: 11 }}>
                              {dev.lat.toFixed(5)}, {dev.lng.toFixed(5)}
                            </span>
                            <small style={{ color: "var(--green)", fontWeight: 600 }}>({dev.satellites} Sats)</small>
                          </div>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span className="badge idle" style={{ fontSize: 11 }}>
                              <Radio size={11} className="pulse-anim" /> Acquiring GNSS Fix
                            </span>
                            <small style={{ color: "var(--muted)" }}>0 Sats (Indoor)</small>
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${dev.connectionStatus.toLowerCase()}`}>
                          <i className={`df-status-dot ${dev.connectionStatus.toLowerCase()}`} />
                          {dev.connectionStatus}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                          {dev.lastCommunication}
                        </span>
                      </td>
                      <td>
                        <div className="df-signal-indicator">
                          <div className="df-signal-bars">
                            {[1, 2, 3, 4, 5].map((bar) => (
                              <span
                                key={bar}
                                className={`df-signal-bar ${
                                  bar <= dev.signalStrength.bars
                                    ? dev.signalStrength.bars <= 2
                                      ? "bad"
                                      : dev.signalStrength.bars === 3
                                        ? "warn"
                                        : "active"
                                    : ""
                                }`}
                                style={{ height: `${bar * 2.6 + 3}px` }}
                              />
                            ))}
                          </div>
                          <small style={{ fontFamily: "monospace" }}>
                            {dev.signalStrength.bars > 0 ? `${dev.signalStrength.bars}/5 bars` : "No Signal"}
                          </small>
                        </div>
                      </td>
                      <td>
                        <button
                          className="button small"
                          onClick={() => setSelectedDevice(dev)}
                          title="View device parameters and raw payload"
                        >
                          <Eye size={13} />
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {filteredDevices.length > 8 && (
            <div className="pagination">
              <span>
                Showing {devicePage * 8 + 1}–{Math.min((devicePage + 1) * 8, filteredDevices.length)} of {filteredDevices.length} devices
              </span>
              <div className="segmented">
                <button
                  className="icon-button"
                  onClick={() => setDevicePage((p) => Math.max(0, p - 1))}
                  disabled={devicePage === 0}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  className="icon-button"
                  onClick={() => setDevicePage((p) => Math.min(devicePageCount - 1, p + 1))}
                  disabled={devicePage >= devicePageCount - 1}
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </Panel>
      )}

      {/* TAB 2: TCP & PROTOCOL PIPELINE */}
      {activeTab === "pipeline" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {dataSource === "real" && (
            <Panel title="Teltonika FMC920 TCP Listener Health" sub="Real-time socket server monitoring">
              <div className="category-grid">
                <div>
                  <span>TCP Service State</span>
                  <strong style={{ color: backendHealth?.tcpListener.running ? "var(--green)" : "#e06c75" }}>
                    {backendHealth?.tcpListener.running ? "Active & Listening" : "Offline"}
                  </strong>
                </div>
                <div>
                  <span>Socket Endpoint</span>
                  <strong style={{ fontFamily: "monospace" }}>{backendHealth?.tcpListener.bind || "0.0.0.0:5027"}</strong>
                </div>
                <div>
                  <span>Active Device Sessions</span>
                  <strong>{backendHealth?.tcpListener.activeSessions || 0} active TCP sockets</strong>
                </div>
                <div>
                  <span>Accepted / Rejected</span>
                  <strong>
                    {backendHealth?.tcpListener.authorizedConnections || 0} accepted · {backendHealth?.tcpListener.rejectedConnections || 0} rejected
                  </strong>
                </div>
                <div>
                  <span>Valid / Invalid Packets</span>
                  <strong>
                    {backendHealth?.packetPipeline.validPackets || 0} valid · {backendHealth?.packetPipeline.invalidPackets || 0} invalid
                  </strong>
                </div>
                <div>
                  <span>Decoded AVL Records</span>
                  <strong style={{ color: "var(--green)" }}>
                    {backendHealth?.packetPipeline.recordsProcessed.toLocaleString() || 0} records committed
                  </strong>
                </div>
              </div>
            </Panel>
          )}

          <div className="df-pipeline-grid">
            {PIPELINE_COMPONENTS.map((srv) => (
              <div className="df-pipeline-card" key={srv.id}>
                <div className="df-pipeline-header">
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div className="df-pipeline-icon">
                      {srv.id.includes("tcp") ? (
                        <Radio size={20} />
                      ) : srv.id.includes("udp") ? (
                        <Wifi size={20} />
                      ) : srv.id.includes("mqtt") ? (
                        <Layers size={20} />
                      ) : srv.id.includes("parser") ? (
                        <Cpu size={20} />
                      ) : srv.id.includes("queue") ? (
                        <Database size={20} />
                      ) : (
                        <Activity size={20} />
                      )}
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 14 }}>{srv.name}</h4>
                      <small style={{ color: "var(--muted)", fontFamily: "monospace" }}>{srv.port}</small>
                    </div>
                  </div>
                  <span className="df-simulated-badge">{srv.badge}</span>
                </div>

                <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.45 }}>
                  {srv.description}
                </p>

                <div className="df-pipeline-metrics">
                  <div className="df-pipeline-metric-item">
                    <small>Packets</small>
                    <strong>
                      {srv.id === "tcp-listener" && dataSource === "real" && backendHealth
                        ? backendHealth.packetPipeline.packetsReceived.toLocaleString()
                        : srv.messagesReceived.toLocaleString()}
                    </strong>
                  </div>
                  <div className="df-pipeline-metric-item">
                    <small>Latency</small>
                    <strong style={{ color: "var(--green)" }}>
                      {srv.id === "tcp-listener" && dataSource === "real" && backendHealth
                        ? `${backendHealth.packetPipeline.avgLatencyMs} ms`
                        : srv.latency}
                    </strong>
                  </div>
                  <div className="df-pipeline-metric-item">
                    <small>Status</small>
                    <strong>
                      {srv.id === "tcp-listener" && dataSource === "real" && backendHealth?.tcpListener.running
                        ? "Active Socket"
                        : srv.throughput}
                    </strong>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "var(--muted)" }}>
                  <span>Protocol: <b>{srv.protocol}</b></span>
                  <span>Active: <b>{srv.lastActivity}</b></span>
                </div>
              </div>
            ))}
          </div>

          <Panel title="Protocol Ingestion Specifications" sub="Standardized payload structures supported by Trackwe decoder">
            <div className="category-grid">
              <div>
                <span>Supported Codecs</span>
                <strong>Teltonika Codec 8 (0x08) & Codec 8 Extended (0x8E)</strong>
              </div>
              <div>
                <span>Checksum Verification</span>
                <strong>CRC-16/IBM (Polynomial 0xA001, Initial 0x0000)</strong>
              </div>
              <div>
                <span>Handshake Protocol</span>
                <strong>2-byte length + ASCII IMEI; 0x01 accept / 0x00 reject</strong>
              </div>
              <div>
                <span>Acknowledgement Flow</span>
                <strong>4-byte big-endian processed record count returned after DB commit</strong>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* TAB 3: IGNITION MONITORING */}
      {activeTab === "ignition" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="df-overview-grid">
            <KPI
              label="Verified Ignition ON"
              value={ignitionOnCount}
              icon={Power}
              note="Engines running with active ACC"
              tone="green"
            />
            <KPI
              label="Verified Ignition OFF"
              value={ignitionOffCount}
              icon={Power}
              note="Engines parked & stationary"
              tone="gold"
            />
            <KPI
              label="Stale or Unknown Status"
              value={ignitionUnknownCount}
              icon={AlertTriangle}
              note="Older than 10-minute threshold"
              tone="gray"
            />
            <KPI
              label="State Transitions Logged"
              value={activeIgnitionEvents.length}
              icon={Clock}
              note="Verified ignition events"
              tone="navy"
            />
          </div>

          <Panel
            title="Vehicle Ignition & Engine Telemetry"
            sub="Verified ignition state derived from parsed FMC920 AVL ID 239"
            action={
              <button className="button primary" onClick={() => setShowIgnitionHistory(true)}>
                <Clock size={14} />
                View Ignition Event Log ({activeIgnitionEvents.length})
              </button>
            }
          >
            <div className="df-filter-bar">
              <div className="df-filter-group">
                <label className="search">
                  <Search size={15} />
                  <input
                    placeholder="Search vehicle or device..."
                    value={searchIgnitionVehicle}
                    onChange={(e) => {
                      setSearchIgnitionVehicle(e.target.value);
                      setIgnitionPage(0);
                    }}
                    aria-label="Search ignition vehicles"
                  />
                </label>

                <select
                  value={ignitionStateFilter}
                  onChange={(e) => {
                    setIgnitionStateFilter(e.target.value);
                    setIgnitionPage(0);
                  }}
                  aria-label="Filter ignition status"
                >
                  <option value="All">All Ignition States</option>
                  <option value="ON">Verified ON</option>
                  <option value="OFF">Verified OFF</option>
                  <option value="Unknown">Unknown / Stale</option>
                </select>
              </div>
            </div>

            {pagedIgnitionDevices.length === 0 ? (
              <div className="df-empty-state">
                <Power size={32} style={{ color: "var(--muted)" }} />
                <h4 className="df-empty-title">No ignition records found</h4>
                <p className="df-empty-sub">
                  No registered vehicles currently match your ignition filter criteria.
                </p>
              </div>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Vehicle Registration</th>
                      <th>Device ID</th>
                      <th>Assigned Driver</th>
                      <th>Ignition Status</th>
                      <th>Main Battery Voltage</th>
                      <th>Last Telemetry Event</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedIgnitionDevices.map((dev) => (
                      <tr key={dev.deviceId}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <Truck size={14} style={{ color: "var(--gold)" }} />
                            <b>{dev.vehicleReg}</b>
                          </div>
                        </td>
                        <td>
                          <code>{dev.deviceId}</code>
                        </td>
                        <td>{dev.driver}</td>
                        <td>
                          <span className={`badge ${dev.ignition === "ON" ? "moving" : dev.ignition === "OFF" ? "idle" : "offline"}`}>
                            <Power size={12} />
                            {dev.ignition === "ON" ? "IGNITION ON" : dev.ignition === "OFF" ? "IGNITION OFF" : "STALE / UNKNOWN"}
                          </span>
                        </td>
                        <td>
                          <b>{dev.voltageExt ? `${dev.voltageExt} V` : "N/A"}</b>
                        </td>
                        <td>
                          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                            {dev.lastCommunication}
                          </span>
                        </td>
                        <td>
                          <button className="button small" onClick={() => setSelectedDevice(dev)}>
                            <Eye size={12} /> Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* TAB 4: TELEMETRY INGESTION */}
      {activeTab === "telemetry" && (
        <Panel
          title="Telemetry Ingestion Stream"
          sub="Decoded binary records containing coordinates, speed, heading, and sensor I/O elements"
        >
          <div className="df-filter-bar">
            <div className="df-filter-group">
              <select
                value={telemetryVehicleFilter}
                onChange={(e) => {
                  setTelemetryVehicleFilter(e.target.value);
                  setTelemetryPage(0);
                }}
                aria-label="Filter vehicle"
              >
                <option value="All">All Vehicles</option>
                {Array.from(new Set(activeTelemetryRecords.map((t) => t.vehicleReg))).map((reg) => (
                  <option key={reg} value={reg}>
                    {reg}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {activeTelemetryRecords.length === 0 ? (
            <div className="df-empty-state">
              <Cpu size={32} style={{ color: "var(--muted)" }} />
              <h4 className="df-empty-title">No telemetry records ingested yet</h4>
              <p className="df-empty-sub">
                Telemetry records will appear here as soon as registered Teltonika FMC920 devices transmit Codec 8 packets over TCP.
              </p>
            </div>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Record ID</th>
                    <th>Device Timestamp</th>
                    <th>Vehicle</th>
                    <th>Coordinates (Lat, Lng)</th>
                    <th>Speed</th>
                    <th>Ignition</th>
                    <th>Ext Battery</th>
                    <th>Int Battery</th>
                    <th>GSM</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedTelemetry.map((rec) => (
                    <tr key={rec.id}>
                      <td>
                        <code>{rec.id.slice(0, 16)}...</code>
                      </td>
                      <td>{rec.deviceTimestamp}</td>
                      <td>
                        <b>{rec.vehicleReg}</b>
                      </td>
                      <td>
                        <code>{rec.lat.toFixed(5)}, {rec.lng.toFixed(5)}</code>
                      </td>
                      <td>{rec.speed} km/h</td>
                      <td>
                        <span className={`badge ${rec.ignition === "ON" ? "moving" : "idle"}`}>
                          {rec.ignition}
                        </span>
                      </td>
                      <td>{rec.batteryExt ? `${rec.batteryExt} V` : "N/A"}</td>
                      <td>{rec.batteryInt ? `${rec.batteryInt} V` : "N/A"}</td>
                      <td>{rec.satellites} sats</td>
                      <td>
                        <button className="button small" onClick={() => setSelectedTelemetry(rec)}>
                          <FileCode size={12} /> Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {/* TAB 5: DIAGNOSTIC EVENT LOGS */}
      {activeTab === "logs" && (
        <Panel
          title="Telematics Communication Logs"
          sub="Low-level TCP connection events, IMEI authorization results, and decoder error logs"
        >
          <div className="df-filter-bar">
            <div className="df-filter-group">
              <label className="search">
                <Search size={15} />
                <input
                  placeholder="Search message, device, vehicle..."
                  value={searchLog}
                  onChange={(e) => {
                    setSearchLog(e.target.value);
                    setLogPage(0);
                  }}
                  aria-label="Search logs"
                />
              </label>

              <select
                value={logSeverity}
                onChange={(e) => {
                  setLogSeverity(e.target.value);
                  setLogPage(0);
                }}
                aria-label="Filter severity"
              >
                <option value="All">All Severities</option>
                <option value="INFO">INFO</option>
                <option value="WARN">WARN</option>
                <option value="ERROR">ERROR</option>
              </select>
            </div>
          </div>

          {activeDiagnosticLogs.length === 0 ? (
            <div className="df-empty-state">
              <Terminal size={32} style={{ color: "var(--muted)" }} />
              <h4 className="df-empty-title">No communication logs recorded</h4>
              <p className="df-empty-sub">Connection events will appear here when devices initiate TCP socket handshakes.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Severity</th>
                    <th>Event Type</th>
                    <th>Device ID</th>
                    <th>Vehicle</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedLogs.map((log) => (
                    <tr key={log.id}>
                      <td>
                        <small style={{ color: "var(--muted)" }}>{log.timestamp}</small>
                      </td>
                      <td>
                        <span className={`badge ${log.severity === "ERROR" ? "danger" : log.severity === "WARN" ? "warning" : "active"}`}>
                          {log.severity}
                        </span>
                      </td>
                      <td>
                        <b>{log.event}</b>
                      </td>
                      <td>
                        <code>{log.deviceId}</code>
                      </td>
                      <td>{log.vehicleReg}</td>
                      <td>
                        <span style={{ fontSize: 13 }}>{log.message}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {/* MODAL 1: REGISTER GPS DEVICE MODAL */}
      <Dialog
        open={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        title="Register Teltonika GPS Hardware"
      >
        <form onSubmit={handleRegisterDevice} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {regError && (
            <div className="df-alert-banner error" style={{ margin: 0 }}>
              <AlertTriangle size={16} />
              <span>{regError}</span>
            </div>
          )}

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              Device IMEI Number (15 digits) *
            </label>
            <input
              className="input"
              style={{ width: "100%", fontFamily: "monospace" }}
              placeholder="e.g. 864275048912345"
              value={regImei}
              onChange={(e) => setRegImei(e.target.value)}
              required
              maxLength={20}
            />
            <small style={{ color: "var(--muted)", fontSize: 11 }}>
              The device will be accepted during Phase 1 TCP handshake only if this IMEI matches.
            </small>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              Hardware Model
            </label>
            <select
              className="select"
              style={{ width: "100%" }}
              value={regModel}
              onChange={(e) => setRegModel(e.target.value)}
            >
              <option value="Teltonika FMC920">Teltonika FMC920 (4G LTE Cat 1 / GNSS)</option>
              <option value="Teltonika FMC130">Teltonika FMC130</option>
              <option value="Queclink GV300">Queclink GV300</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              Assign to Fleet Vehicle
            </label>
            <select
              className="select"
              style={{ width: "100%" }}
              value={regVehicleId}
              onChange={(e) => setRegVehicleId(e.target.value)}
            >
              <option value="">-- Leave Unassigned --</option>
              {workspaceVehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registration} ({v.name})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Reporting Interval (sec)
              </label>
              <input
                type="number"
                className="input"
                style={{ width: "100%" }}
                value={regInterval}
                onChange={(e) => setRegInterval(e.target.value)}
                min="10"
                max="3600"
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                SIM Telecom Carrier
              </label>
              <input
                className="input"
                style={{ width: "100%" }}
                value={regCarrier}
                onChange={(e) => setRegCarrier(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
            <button type="button" className="button" onClick={() => setShowRegisterModal(false)}>
              Cancel
            </button>
            <button type="submit" className="button primary" disabled={regSubmitting}>
              {regSubmitting ? "Registering..." : "Authorize & Register Device"}
            </button>
          </div>
        </form>
      </Dialog>

      {/* MODAL 2: DEVICE DETAILS DRAWER */}
      {selectedDevice && (
        <Dialog
          open={!!selectedDevice}
          onClose={() => setSelectedDevice(null)}
          title={`Device Parameters: ${selectedDevice.deviceId}`}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Quick Metrics */}
            <div className="df-overview-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
              <div className="df-key-val-item">
                <span>Connection</span>
                <strong style={{ color: selectedDevice.connectionStatus === "Connected" ? "var(--green)" : "#e06c75" }}>
                  {selectedDevice.connectionStatus}
                </strong>
              </div>
              <div className="df-key-val-item">
                <span>Ignition Status</span>
                <strong style={{ color: selectedDevice.ignition === "ON" ? "var(--green)" : "var(--gold)" }}>
                  {selectedDevice.ignition}
                </strong>
              </div>
              <div className="df-key-val-item">
                <span>Vehicle Battery</span>
                <strong>{selectedDevice.voltageExt ? `${selectedDevice.voltageExt} V` : "N/A"}</strong>
              </div>
            </div>

            {/* Hardware Information */}
            <div className="category-grid">
              <div>
                <span>IMEI</span>
                <strong style={{ fontFamily: "monospace" }}>{selectedDevice.imei}</strong>
              </div>
              <div>
                <span>Assigned Vehicle</span>
                <strong>{selectedDevice.vehicleReg}</strong>
              </div>
              <div>
                <span>Protocol & Codec</span>
                <strong>{selectedDevice.protocol}</strong>
              </div>
              <div>
                <span>Firmware</span>
                <strong>{selectedDevice.firmware}</strong>
              </div>
              <div>
                <span>Backup Battery</span>
                <strong>{selectedDevice.voltageInt ? `${selectedDevice.voltageInt} V` : "N/A"}</strong>
              </div>
              <div>
                <span>Last Communication</span>
                <strong>{selectedDevice.lastCommunication}</strong>
              </div>
              <div>
                <span>Latitude & Longitude</span>
                <strong>
                  {selectedDevice.lat && selectedDevice.lng && (Math.abs(selectedDevice.lat) > 0.0001 || Math.abs(selectedDevice.lng) > 0.0001) ? (
                    <span style={{ color: "var(--green)", fontFamily: "monospace" }}>
                      {selectedDevice.lat.toFixed(5)}, {selectedDevice.lng.toFixed(5)}
                    </span>
                  ) : (
                    <span style={{ color: "var(--gold)" }}>Acquiring GNSS Satellite Fix</span>
                  )}
                </strong>
              </div>
              <div>
                <span>GNSS Satellites</span>
                <strong>{selectedDevice.satellites > 0 ? `${selectedDevice.satellites} Locked` : "0 Locked (Needs Outdoor / Window)"}</strong>
              </div>
            </div>

            {/* Raw AVL Payload */}
            {selectedDevice.rawPayloadHex && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                  Latest Raw Codec 8 Hex Payload:
                </label>
                <pre
                  style={{
                    background: "var(--surface-soft)",
                    padding: 10,
                    borderRadius: 6,
                    fontSize: 11,
                    overflowX: "auto",
                    border: "1px solid var(--border)",
                  }}
                >
                  {selectedDevice.rawPayloadHex}
                </pre>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: 12 }}>
              {account?.role !== "Employee" && (
                <button
                  className="button danger"
                  onClick={() => handleDeleteDevice(selectedDevice.deviceId)}
                >
                  <Trash2 size={13} />
                  Revoke Device
                </button>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                {account?.role !== "Employee" && (
                  <button
                    className="button"
                    onClick={() => handleToggleDeviceStatus(selectedDevice)}
                  >
                    {selectedDevice.connectionStatus === "Connected" ? "Disable Device" : "Enable Device"}
                  </button>
                )}
                <button className="button" onClick={() => setSelectedDevice(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </Dialog>
      )}

      {/* MODAL 3: IGNITION HISTORY LOG */}
      <Dialog
        open={showIgnitionHistory}
        onClose={() => setShowIgnitionHistory(false)}
        title="Historical Ignition State Transitions"
      >
        <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
          {activeIgnitionEvents.length === 0 ? (
            <p style={{ color: "var(--muted)", textAlign: "center", padding: 24 }}>
              No ignition state changes recorded yet.
            </p>
          ) : (
            <div className="df-timeline-list">
              {activeIgnitionEvents.map((evt) => (
                <div className="df-timeline-item" key={evt.id}>
                  <Power
                    size={16}
                    style={{ color: evt.event === "Ignition ON" ? "var(--green)" : "var(--gold)", marginTop: 2 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <b>{evt.vehicleReg} — {evt.event}</b>
                      <small style={{ color: "var(--muted)" }}>{evt.timestamp}</small>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                      Driver: {evt.driver} · Location: {evt.location} · Battery: {evt.batteryVoltage} V
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Dialog>

      {/* MODAL 4: TELEMETRY INSPECTOR */}
      {selectedTelemetry && (
        <Dialog
          open={!!selectedTelemetry}
          onClose={() => setSelectedTelemetry(null)}
          title={`Telemetry Record Inspector: ${selectedTelemetry.id}`}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="category-grid">
              <div>
                <span>Vehicle</span>
                <b>{selectedTelemetry.vehicleReg}</b>
              </div>
              <div>
                <span>Coordinates</span>
                <b>{selectedTelemetry.lat}, {selectedTelemetry.lng}</b>
              </div>
              <div>
                <span>Speed</span>
                <b>{selectedTelemetry.speed} km/h</b>
              </div>
              <div>
                <span>External Voltage</span>
                <b>{selectedTelemetry.batteryExt} V</b>
              </div>
              <div>
                <span>Internal Battery</span>
                <b>{selectedTelemetry.batteryInt} V</b>
              </div>
              <div>
                <span>Satellites</span>
                <b>{selectedTelemetry.satellites}</b>
              </div>
            </div>

            {selectedTelemetry.mockPayloadJson && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                  Decoded I/O Elements:
                </label>
                <pre
                  style={{
                    background: "var(--surface-soft)",
                    padding: 10,
                    borderRadius: 6,
                    fontSize: 11,
                    maxHeight: 200,
                    overflowY: "auto",
                    border: "1px solid var(--border)",
                  }}
                >
                  {JSON.stringify(selectedTelemetry.mockPayloadJson, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </Dialog>
      )}

      {/* Copy Notification Toast */}
      {copiedNotification && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "var(--navy)",
            color: "#fff",
            padding: "10px 16px",
            borderRadius: 8,
            fontSize: 13,
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            zIndex: 9999,
          }}
        >
          {copiedNotification}
        </div>
      )}
    </div>
  );
}

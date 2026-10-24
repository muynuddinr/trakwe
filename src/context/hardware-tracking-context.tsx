'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react';
import { useAuth } from '@/context/auth-context';
import { useFleet } from '@/context/fleet-context';
import { DeviceConnectionHealth, DeviceConnectionStatus } from '@/types';

export interface NormalizedHardwareTelemetry {
  imei: string;
  vehicleId: string;
  registration?: string;
  vehicleName?: string;
  deviceTimestamp: string;
  serverTimestamp: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  altitude: number;
  satellites: number;
  ignition: boolean;
  movement: boolean;
  externalVoltage: number;
  internalBattery: number;
  gsmSignal: number;
  rawIo?: Record<number, number | string>;
  status: 'Moving' | 'Idle' | 'Offline';
  isLiveHardware: true;
  isUaeCorridor: boolean;
  hasGpsFix: boolean;
  connectionStatus?: DeviceConnectionStatus;
  isStale?: boolean;
}

interface HardwareTrackingContextType {
  wsConnected: boolean;
  hasLiveHardwareStream: boolean;
  activeDeviceHealth: DeviceConnectionHealth | null;
  deviceHealthList: DeviceConnectionHealth[];
  latestTelemetryByVehicle: Record<string, NormalizedHardwareTelemetry>;
  lastPacketTime: string | null;
  reconnect: () => void;
  refreshTelemetry: () => Promise<void>;
  openHealthModal: boolean;
  setOpenHealthModal: (open: boolean) => void;
}

const HardwareTrackingContext = createContext<HardwareTrackingContextType | undefined>(undefined);

function getWsUrl(): string {
  if (typeof window === 'undefined') return '';

  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

  // If user opens direct static server on port 3000, connect to backend API on 8088
  if (window.location.port === '3000') {
    return `${proto}//${window.location.hostname}:8088/ws`;
  }

  // Deployed host: use current host (e.g. port 4173) with /ws reverse proxy
  return `${proto}//${window.location.host}/ws`;
}

function getApiBase(): string {
  if (typeof window === 'undefined') return '';

  // If running on port 3000, call backend directly on 8088
  if (window.location.port === '3000') {
    return `http://${window.location.hostname}:8088`;
  }

  // On port 4173 (Nginx proxy) or standard HTTP, use relative API path on same origin
  return '';
}

export function HardwareTrackingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { updateVehicle } = useFleet();

  const [wsConnected, setWsConnected] = useState(false);
  const [deviceHealthList, setDeviceHealthList] = useState<DeviceConnectionHealth[]>([]);
  const [latestTelemetryByVehicle, setLatestTelemetryByVehicle] = useState<Record<string, NormalizedHardwareTelemetry>>({});
  const [lastPacketTime, setLastPacketTime] = useState<string | null>(null);
  const [openHealthModal, setOpenHealthModal] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectingRef = useRef(false);

  const applyTelemetryToFleet = useCallback((telemetry: NormalizedHardwareTelemetry) => {
    setLatestTelemetryByVehicle((prev) => ({
      ...prev,
      [telemetry.vehicleId]: telemetry
    }));

    setLastPacketTime(new Date().toLocaleTimeString('en-GB', { hour12: false }));

    // When indoor (lat: 0, lng: 0), preserve Dubai fleet depot coordinates on the map so it doesn't jump to Null Island
    const hasCoordinates = (telemetry.lat !== 0 || telemetry.lng !== 0) && telemetry.hasGpsFix;
    const effectiveLat = hasCoordinates ? telemetry.lat : 25.2048;
    const effectiveLng = hasCoordinates ? telemetry.lng : 55.2708;

    updateVehicle(telemetry.vehicleId, {
      lat: effectiveLat,
      lng: effectiveLng,
      speed: telemetry.speed,
      status: telemetry.status,
      battery: telemetry.externalVoltage,
      isLiveHardware: true,
      liveImei: telemetry.imei,
      ignitionState: telemetry.ignition,
      movementState: telemetry.movement,
      externalVoltage: telemetry.externalVoltage,
      internalBattery: telemetry.internalBattery,
      gsmSignal: telemetry.gsmSignal,
      heading: telemetry.heading,
      altitude: telemetry.altitude,
      satellites: telemetry.satellites,
      hasGpsFix: telemetry.hasGpsFix,
      connectionStatus: telemetry.connectionStatus || (telemetry.hasGpsFix ? 'Reporting' : 'Connected'),
      isOutOfCorridor: !telemetry.isUaeCorridor,
      lastDeviceTimestamp: telemetry.deviceTimestamp,
      lastServerTimestamp: telemetry.serverTimestamp,
      device: 'Teltonika FMC920 4G LTE Cat 1 (Live Hardware)',
      updated: telemetry.deviceTimestamp
        ? `Live GPS · ${new Date(telemetry.deviceTimestamp).toLocaleTimeString('en-GB', { hour12: false })} GST`
        : 'Live Standby · Online',
      locationName: hasCoordinates
        ? (telemetry.isUaeCorridor
            ? `UAE Fleet Corridor (${telemetry.lat.toFixed(4)}, ${telemetry.lng.toFixed(4)})`
            : `Reported GPS (${telemetry.lat.toFixed(4)}, ${telemetry.lng.toFixed(4)})`)
        : 'Indoor Telematics / GPS Acquiring Satellites (Standby)'
    });
  }, [updateVehicle]);

  // Initial HTTP fetch and offline polling recovery
  const fetchLiveTelemetry = useCallback(async () => {
    if (typeof window === 'undefined') return;

    try {
      const apiBase = getApiBase();
      const headers: Record<string, string> = {
        'Accept': 'application/json'
      };
      if (user?.role) headers['x-user-role'] = user.role;
      if (user?.assignedVehicleId) headers['x-vehicle-id'] = user.assignedVehicleId;

      const [vehiclesRes, healthRes] = await Promise.all([
        fetch(`${apiBase}/api/live/vehicles`, { headers }).catch(() => null),
        fetch(`${apiBase}/api/live/health`).catch(() => null)
      ]);

      if (vehiclesRes && vehiclesRes.ok) {
        const data = await vehiclesRes.json();
        if (data.success && Array.isArray(data.vehicles)) {
          for (const v of data.vehicles) {
            applyTelemetryToFleet(v);
          }
        }
      }

      if (healthRes && healthRes.ok) {
        const healthData = await healthRes.json();
        if (Array.isArray(healthData.devices)) {
          setDeviceHealthList(healthData.devices);
          for (const h of healthData.devices) {
            updateVehicle(h.vehicleId, {
              connectionStatus: h.connectionStatus,
              isLiveHardware: true,
              liveImei: h.imei
            });
          }
        }
      }
    } catch (err) {
      // Non-blocking catch
    }
  }, [user, applyTelemetryToFleet, updateVehicle]);

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (isConnectingRef.current) return;

    const wsUrl = getWsUrl();
    if (!wsUrl) return;

    try {
      isConnectingRef.current = true;
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }

      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        isConnectingRef.current = false;
        setWsConnected(true);

        // 1. Authenticate with current user role and vehicle assignment
        ws.send(JSON.stringify({
          type: 'AUTH',
          role: user?.role || 'Admin',
          assignedVehicleId: user?.assignedVehicleId || 'v-dxb-01',
          userId: user?.id
        }));

        // 2. Refresh initial state from HTTP API to recover any updates
        fetchLiveTelemetry();
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'TELEMETRY_UPDATE') {
            const telemetry: NormalizedHardwareTelemetry = msg.payload;
            applyTelemetryToFleet(telemetry);
          } else if (msg.type === 'DEVICE_HEALTH_UPDATE') {
            const healthList: DeviceConnectionHealth[] = Array.isArray(msg.payload) ? msg.payload : [];
            setDeviceHealthList(healthList);
            for (const h of healthList) {
              updateVehicle(h.vehicleId, {
                connectionStatus: h.connectionStatus
              });
            }
          }
        } catch (e) {
          // ignore parsing error
        }
      };

      ws.onclose = () => {
        isConnectingRef.current = false;
        setWsConnected(false);
        // Automatic exponential reconnection
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        isConnectingRef.current = false;
        ws.close();
      };
    } catch (err) {
      isConnectingRef.current = false;
      setWsConnected(false);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = setTimeout(connect, 5000);
    }
  }, [user, fetchLiveTelemetry, applyTelemetryToFleet, updateVehicle]);

  // Initial connection and cleanup
  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [connect]);

  // HTTP polling fallback when WebSocket is temporarily disconnected
  useEffect(() => {
    let pollingInterval: NodeJS.Timeout | null = null;
    if (!wsConnected) {
      // Immediate poll
      fetchLiveTelemetry();
      // Regular poll every 6s while WebSocket is disconnected
      pollingInterval = setInterval(fetchLiveTelemetry, 6000);
    }
    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [wsConnected, fetchLiveTelemetry]);

  // Check if any device has active packet reception or active TCP gateway connection
  const hasLiveHardwareStream = deviceHealthList.some(
    (d) => !d.isStale && (d.totalPacketsReceived > 0 || d.tcpState === 'Authenticated' || d.connectionStatus === 'Reporting' || d.connectionStatus === 'Connected')
  ) || (wsConnected && deviceHealthList.length > 0 && !deviceHealthList[0].isStale);

  const activeDeviceHealth = deviceHealthList.find((d) => !d.isStale) || deviceHealthList[0] || null;

  return (
    <HardwareTrackingContext.Provider
      value={{
        wsConnected,
        hasLiveHardwareStream,
        activeDeviceHealth,
        deviceHealthList,
        latestTelemetryByVehicle,
        lastPacketTime,
        reconnect: connect,
        refreshTelemetry: fetchLiveTelemetry,
        openHealthModal,
        setOpenHealthModal
      }}
    >
      {children}
    </HardwareTrackingContext.Provider>
  );
}

export function useHardwareTracking() {
  const context = useContext(HardwareTrackingContext);
  if (!context) {
    throw new Error('useHardwareTracking must be used within a HardwareTrackingProvider');
  }
  return context;
}

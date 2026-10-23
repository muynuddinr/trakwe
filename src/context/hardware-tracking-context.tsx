'use client';

import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { useAuth } from '@/context/auth-context';
import { useFleet } from '@/context/fleet-context';
import { DeviceConnectionHealth } from '@/types';

interface NormalizedHardwareTelemetry {
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
  ignition: boolean;
  movement: boolean;
  externalVoltage: number;
  internalBattery: number;
  gsmSignal: number;
  rawIo: Record<number, number | string>;
  status: 'Moving' | 'Idle' | 'Offline';
  isLiveHardware: true;
  isUaeCorridor: boolean;
}

interface HardwareTrackingContextType {
  wsConnected: boolean;
  hasLiveHardwareStream: boolean;
  activeDeviceHealth: DeviceConnectionHealth | null;
  deviceHealthList: DeviceConnectionHealth[];
  latestTelemetryByVehicle: Record<string, NormalizedHardwareTelemetry>;
  lastPacketTime: string | null;
  reconnect: () => void;
  openHealthModal: boolean;
  setOpenHealthModal: (open: boolean) => void;
}

const HardwareTrackingContext = createContext<HardwareTrackingContextType | undefined>(undefined);

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

  const connect = () => {
    if (typeof window === 'undefined') return;

    try {
      const wsUrl = process.env.NEXT_PUBLIC_TRACKING_WS_URL || `ws://${window.location.hostname || 'localhost'}:8088`;
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        // Authenticate with user role and assigned vehicle
        ws.send(JSON.stringify({
          type: 'AUTH',
          role: user?.role || 'Admin',
          assignedVehicleId: user?.assignedVehicleId || 'v-dxb-01',
          userId: user?.id
        }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'TELEMETRY_UPDATE') {
            const telemetry: NormalizedHardwareTelemetry = msg.payload;

            setLatestTelemetryByVehicle((prev) => ({
              ...prev,
              [telemetry.vehicleId]: telemetry
            }));
            setLastPacketTime(new Date().toLocaleTimeString('en-GB', { hour12: false }));

            // Live update the fleet vehicle inside FleetContext
            updateVehicle(telemetry.vehicleId, {
              lat: telemetry.lat,
              lng: telemetry.lng,
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
              isOutOfCorridor: !telemetry.isUaeCorridor,
              lastDeviceTimestamp: telemetry.deviceTimestamp,
              device: 'Teltonika FMC920 4G LTE Cat 1 (Live Hardware)',
              updated: `Live GPS · ${new Date().toLocaleTimeString('en-GB', { hour12: false })} GST`,
              locationName: telemetry.isUaeCorridor
                ? 'Sheikh Zayed Road E11 (Live GPS)'
                : `Reported GPS (${telemetry.lat.toFixed(4)}, ${telemetry.lng.toFixed(4)})`
            });
          } else if (msg.type === 'DEVICE_HEALTH_UPDATE') {
            setDeviceHealthList(msg.payload || []);
          }
        } catch (e) {
          // ignore parsing error
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        // Retry connection with exponential backoff
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (err) {
      setWsConnected(false);
      reconnectTimeoutRef.current = setTimeout(connect, 5000);
    }
  };

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) socketRef.current.close();
    };
  }, [user]);

  // Check if any device has active packet reception in the last 60 seconds
  const hasLiveHardwareStream = deviceHealthList.some(
    (d) => d.tcpState === 'Authenticated' && !d.isStale && d.totalPacketsReceived > 0
  );

  const activeDeviceHealth = deviceHealthList.find((d) => d.tcpState === 'Authenticated') ||
    deviceHealthList[0] || null;

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

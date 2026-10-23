export type UserRole = 'Super Admin' | 'Admin' | 'Manager' | 'Employee';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  team: string;
  avatar?: string;
  avatarUrl?: string;
  assignedVehicleId?: string;
}

export type VehicleStatus = 'Moving' | 'Idle' | 'Offline';

export interface VehicleSpecs {
  engine: string;
  transmission: string;
  payload: string;
  tankCapacity: string;
  dimensions: string;
  vin: string;
  year: number;
  odometer: number;
  oilLife: number; // percentage
  brakeLife: number; // percentage
  tireHealth: string;
  nextService: string;
}

export interface Vehicle {
  id: string;
  registration: string;
  name: string;
  type: string;
  driver: string;
  driverId?: string;
  status: VehicleStatus;
  speed: number;
  lat: number;
  lng: number;
  fuel: number;
  temperature: number | null;
  battery: number;
  distance: number;
  device: string;
  updated: string;
  can: boolean;
  immobilizer: boolean;
  camera: boolean;
  emirate: string;
  locationName: string;
  image?: string;
  gallery?: string[];
  specs?: VehicleSpecs;
  // Teltonika FMC920 Hardware Integration Fields
  isLiveHardware?: boolean;
  liveImei?: string;
  ignitionState?: boolean;
  movementState?: boolean;
  externalVoltage?: number;
  internalBattery?: number;
  gsmSignal?: number;
  isOutOfCorridor?: boolean;
  lastDeviceTimestamp?: string;
}

export type TcpConnectionState = 'Disconnected' | 'Connecting' | 'Connected' | 'Authenticated' | 'Rejected';

export interface DeviceConnectionHealth {
  imei: string;
  vehicleId: string;
  vehicleName: string;
  tcpState: TcpConnectionState;
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
}

export type RecordItem = {
  id: string;
  [key: string]: any;
};

export interface Driver {
  id: string;
  name: string;
  contact: string;
  vehicle: string;
  score: number;
  status: 'On duty' | 'Off duty';
  events: number;
  licenseNo: string;
  emirate: string;
  avatar?: string;
  experience?: string;
  bloodGroup?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  employee: string;
  vehicle: string;
  priority: 'High' | 'Medium' | 'Low';
  due: string;
  status: 'To do' | 'In progress' | 'Completed';
  createdBy?: string;
}

export interface Expense {
  id: string;
  title: string;
  category: 'Fuel' | 'Maintenance' | 'Tolls' | 'Insurance' | 'Other';
  vehicle: string;
  amount: number; // in AED
  date: string;
  submitted: string;
  receipt: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  reviewedBy?: string;
}

export interface Alert {
  id: string;
  type: 'Overspeed' | 'Fuel drop' | 'Temperature' | 'Device offline' | 'Harsh braking' | 'Geofence breach';
  severity: 'Critical' | 'Warning' | 'Info';
  vehicle: string;
  time: string;
  location: string;
  status: 'Unacknowledged' | 'Acknowledged';
}

export interface Trip {
  id: string;
  vehicle: string;
  driver: string;
  route: string;
  date: string;
  distance: number; // in km
  duration: string;
  average: number; // km/h
  max: number; // km/h
  stop: number; // min
  status: 'In progress' | 'Completed';
}

export interface Geofence {
  id: string;
  name: string;
  type: 'circle' | 'polygon';
  center: [number, number];
  points: [number, number][];
  radius: number;
  enabled: boolean;
  vehicles: string[];
}

export interface CommandLog {
  id: string;
  vehicle: string;
  action: string;
  reason: string;
  time: string;
  status: string;
  initiatedBy: string;
}

export interface DeviceIntegration {
  id: string;
  manufacturer: string;
  model: string;
  protocol: string;
  capabilities: string;
  connection: string;
  status: string;
}

export interface FleetService {
  listVehicles(): Promise<Vehicle[]>;
  saveVehicle(vehicle: Vehicle): Promise<Vehicle>;
}

export type Status = "Moving" | "Idle" | "Offline";
export type Role = "Super Admin" | "Admin" | "Manager" | "Employee";
export interface DemoAccount {
  id: string;
  name: string;
  email: string;
  role: Role;
  orgId: string;
  vehicleIds: string[];
}
export interface Vehicle {
  id: string;
  orgId: string;
  registration: string;
  name: string;
  type: string;
  driver: string;
  status: Status;
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
  region: string;
}
export type RecordItem = { id: string; [key: string]: string | number };
export interface Geofence {
  id: string;
  orgId: string;
  name: string;
  type: "circle" | "polygon";
  center: [number, number];
  points: [number, number][];
  radius: number;
  enabled: boolean;
  vehicles: string[];
}
export interface DemoStore {
  version: 2;
  vehicles: Vehicle[];
  records: Record<string, RecordItem[]>;
  geofences: Geofence[];
  preferences: Record<string, { name: string; emailAlerts: boolean }>;
}
export interface FleetService {
  listVehicles(): Promise<Vehicle[]>;
  saveVehicle(vehicle: Vehicle): Promise<Vehicle>;
}

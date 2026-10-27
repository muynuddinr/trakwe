import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bell,
  Building2,
  Camera,
  ChartNoAxesCombined,
  Fuel,
  LayoutDashboard,
  ListTodo,
  MapPin,
  MapPinned,
  Plug,
  Power,
  Radio,
  Route,
  Settings,
  ShieldCheck,
  Thermometer,
  Truck,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";
export const groups: [string, [string, string, LucideIcon][]][] = [
  [
    "OVERVIEW",
    [
      ["dashboard", "Dashboard", LayoutDashboard],
      ["tracking", "Live Tracking", MapPinned],
      ["data-fetching", "Data Fetching", Radio],
    ],
  ],
  [
    "FLEET",
    [
      ["vehicles", "Vehicles", Truck],
      ["drivers", "Drivers", Users],
      ["trips", "Trips & Route History", Route],
      ["geofences", "Geofences", MapPin],
    ],
  ],
  [
    "INTELLIGENCE",
    [
      ["fuel", "Fuel Monitoring", Fuel],
      ["temperature", "Temperature", Thermometer],
      ["diagnostics", "CAN Bus & Diagnostics", Activity],
      ["behavior", "Driver Behavior", ShieldCheck],
      ["cameras", "Dash Cameras", Camera],
      ["immobilizer", "Immobilizer", Power],
    ],
  ],
  [
    "OPERATIONS",
    [
      ["tasks", "Tasks", ListTodo],
      ["expenses", "Expenses", Wallet],
      ["alerts", "Alerts & Notifications", Bell],
      ["reports", "Reports & Analytics", ChartNoAxesCombined],
    ],
  ],
  [
    "ADMINISTRATION",
    [
      ["users", "Users & Roles", UserCog],
      ["integrations", "Device Integrations", Plug],
      ["settings", "Settings", Settings],
    ],
  ],
];
groups[4][1].push(
  ["organizations", "Organizations", Building2],
  ["profile", "My profile", UserCog],
);
export const nav = groups.flatMap((g) => g[1]);

import { DemoStore, Geofence, RecordItem } from "@/types";
import { organizations, routeFor } from "./geography";
import { vehicles } from "./vehicles";
export const demoDate = "2026-10-22";
export const seed: Record<string, RecordItem[]> = {
  drivers: [],
  tasks: [],
  expenses: [],
  alerts: [],
  trips: [],
  fuel: [],
  temperature: [],
  diagnostics: [],
  behavior: [],
  users: [],
  integrations: [],
  commands: [],
  telemetry: [],
  zoneEvents: [],
};
for (const [i, v] of vehicles.entries()) {
  const base = { orgId: v.orgId, vehicle: v.registration };
  seed.drivers.push({
    id: `d${i + 1}`,
    ...base,
    name: v.driver,
    contact: `driver${i + 1}@trackwe.demo`,
    score: 100,
    status: i % 8 === 7 ? "Off duty" : "On duty",
    events: 0,
  });
  if (i % 4 === 0 || i === 1)
    seed.tasks.push({
      id: `t${i + 1}`,
      ...base,
      title: [
        "Vehicle inspection",
        "Sensor calibration",
        "Insurance renewal",
        "Delivery handover",
      ][i % 4],
      description: `Review ${v.name} at the ${v.region} depot.`,
      employee: i < 2 ? "Omar Hassan" : i < 12 ? "Sara Khalid" : v.driver,
      priority: i % 3 === 0 ? "High" : "Medium",
      due: i % 3 === 0 ? "2026-10-21" : "2026-10-24",
      date: demoDate,
      status: i % 3 === 0 ? "To do" : i % 3 === 1 ? "In progress" : "Completed",
    });
  if (i < 18 || (i >= 30 && i < 36))
    seed.expenses.push({
      id: `e${i + 1}`,
      ...base,
      title: ["Fuel refill", "Tyre service", "Road toll"][i % 3],
      category: ["Fuel", "Maintenance", "Tolls"][i % 3],
      amount: 120 + i * 35,
      date: `2026-10-${String(9 + (i % 14)).padStart(2, "0")}`,
      submitted: i < 2 ? "Omar Hassan" : v.driver,
      receipt: "Not attached",
      status: i % 3 === 0 ? "Pending" : "Approved",
    });
  if (i % 5 === 0 || i === 1)
    seed.alerts.push({
      id: `a${i + 1}`,
      ...base,
      type: ["Overspeed", "Fuel drop", "Temperature", "Device offline"][i % 4],
      severity: i % 3 === 0 ? "Critical" : "Warning",
      time: `2026-10-22T10:${String(42 - (i % 40)).padStart(2, "0")}:00+04:00`,
      date: demoDate,
      location: v.region,
      status: i % 3 === 0 ? "Acknowledged" : "Unacknowledged",
    });
  for (let day = 9; day <= 22; day++) {
    const date = `2026-10-${String(day).padStart(2, "0")}`,
      distance = day === 22 ? v.distance : 30 + ((i * 7 + day * 11) % 160);
    seed.trips.push({
      id: `tr-${i}-${day}`,
      ...base,
      driver: v.driver,
      route: `${v.region} depot → ${v.region} delivery zone`,
      region: v.region,
      date,
      distance,
      duration: `${Math.round((distance / 45) * 60)} min`,
      average: 45,
      max: 65 + (i % 20),
      stop: 5 + (i % 12),
      status: "Completed",
    });
    seed.telemetry.push({
      id: `tm-${i}-${day}`,
      ...base,
      date,
      distance,
      fuel: Number((distance / 7).toFixed(1)),
      temperature:
        v.temperature === null
          ? "Unsupported"
          : Number((v.temperature + Math.sin(day) * 0.3).toFixed(1)),
      downtime: v.status === "Offline" ? 8 : i % 3,
    });
  }
  if (i % 3 === 0)
    seed.fuel.push({
      id: `f${i}`,
      ...base,
      type: i % 9 === 0 ? "Possible fuel drop" : "Refuelling",
      volume: i % 9 === 0 ? -8 : 35 + (i % 30),
      date: demoDate,
      time: "2026-10-22T09:30:00+04:00",
      location: v.region,
    });
  if (v.temperature !== null)
    seed.temperature.push({
      id: `temp${i}`,
      ...base,
      reading: v.temperature,
      range: "2–8 °C",
      date: demoDate,
      time: v.updated,
      status: v.temperature > 8 ? "Out of range" : "Within range",
    });
  if (v.can)
    seed.diagnostics.push({
      id: `dg${i}`,
      ...base,
      rpm: 700 + i * 15,
      coolant: 83 + (i % 8),
      battery: v.battery,
      fuel: v.fuel,
      odometer: 44200 + i * 3200,
      code: i === 6 ? "P0117" : "No active DTC",
      status: i === 6 ? "Attention" : "Healthy",
    });
  if (i % 2 === 0)
    seed.behavior.push({
      id: `b${i}`,
      ...base,
      driver: v.driver,
      event: [
        "Harsh braking",
        "Overspeed",
        "Harsh acceleration",
        "Excessive idling",
      ][Math.floor(i / 2) % 4],
      date: demoDate,
      time: "2026-10-22T10:30:00+04:00",
      penalty: [3, 5, 3, 1][Math.floor(i / 2) % 4],
    });
}
seed.drivers = seed.drivers.map((d) => ({
  ...d,
  score: Math.max(
    0,
    100 -
      seed.behavior
        .filter((b) => b.vehicle === d.vehicle)
        .reduce((s, b) => s + Number(b.penalty), 0),
  ),
  events: seed.behavior.filter((b) => b.vehicle === d.vehicle).length,
}));
seed.users = [
  {
    id: "account-super",
    name: "Moin",
    email: "superadmin@trackwe.demo",
    role: "Super Admin",
    orgId: "platform",
    team: "Platform",
    status: "Active",
  },
  {
    id: "account-admin",
    name: "Ahmed Ali",
    email: "admin@trackwe.demo",
    role: "Admin",
    orgId: "org-dubai",
    team: "Dubai operations",
    status: "Active",
  },
  {
    id: "account-manager",
    name: "Sara Khalid",
    email: "manager@trackwe.demo",
    role: "Manager",
    orgId: "org-dubai",
    team: "Dispatch",
    status: "Active",
  },
  {
    id: "account-employee",
    name: "Omar Hassan",
    email: "employee@trackwe.demo",
    role: "Employee",
    orgId: "org-dubai",
    team: "Delivery",
    status: "Active",
  },
  {
    id: "u-emirates",
    name: "Noor Abdullah",
    email: "noor@trackwe.demo",
    role: "Manager",
    orgId: "org-emirates",
    team: "Emirates operations",
    status: "Active",
  },
];
seed.integrations = [
  {
    id: "i1",
    orgId: "platform",
    manufacturer: "Teltonika",
    model: "FMC130",
    protocol: "Codec 8 / TCP",
    capabilities: "GPS, CAN, immobilizer",
    connection: "Not Connected",
    status: "Demo",
  },
  {
    id: "i2",
    orgId: "platform",
    manufacturer: "Queclink",
    model: "GV300",
    protocol: "@Track / TCP",
    capabilities: "GPS, fuel, temperature",
    connection: "Not Connected",
    status: "Demo",
  },
  {
    id: "i3",
    orgId: "platform",
    manufacturer: "Demo camera",
    model: "Camera adapter",
    protocol: "Provider API",
    capabilities: "Dash camera",
    connection: "Not Connected",
    status: "Demo",
  },
];
export const geofences: Geofence[] = [
  {
    id: "g1",
    orgId: "org-dubai",
    name: "Dubai operations depot",
    type: "circle",
    center: [25.2035, 55.2683],
    points: [],
    radius: 1200,
    enabled: true,
    vehicles: ["v1", "v8"],
  },
  {
    id: "g2",
    orgId: "org-emirates",
    name: "Abu Dhabi delivery zone",
    type: "polygon",
    center: [24.477, 54.3861],
    points: [
      [24.473, 54.38],
      [24.483, 54.38],
      [24.483, 54.397],
      [24.473, 54.397],
    ],
    radius: 1000,
    enabled: true,
    vehicles: ["v37"],
  },
];
seed.zoneEvents = geofences.map((g, i) => ({
  id: `ze${i}`,
  orgId: g.orgId,
  zone: g.name,
  vehicle: vehicles.find((v) => v.id === g.vehicles[0])!.registration,
  event: "Entry · simulated",
  time: "2026-10-22T09:14:00+04:00",
  date: demoDate,
}));
export const routePoints = routeFor("Dubai");
export function createSeedStore(): DemoStore {
  return structuredClone({
    version: 2,
    vehicles,
    records: seed,
    geofences,
    preferences: Object.fromEntries(
      organizations.map((o) => [o.id, { name: o.name, emailAlerts: true }]),
    ),
  });
}

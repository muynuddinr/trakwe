import { inDemoArea } from "@/data/geography";
import { createSeedStore, demoDate } from "@/data/records";
import { DemoAccount, DemoStore, Geofence, RecordItem, Vehicle } from "@/types";
import {
  allowedRoles,
  canApprove,
  canCreate,
  canEdit,
  canPage,
  canReset,
} from "./auth";
export const DATA_KEY = "trackwe.demo.uae.v2";
export function scopeStore(
  s: DemoStore,
  a: DemoAccount,
  organization = "All",
): DemoStore {
  const vehicles = s.vehicles.filter(
    (v) =>
      (a.role === "Super Admin"
        ? organization === "All" || v.orgId === organization
        : v.orgId === a.orgId) &&
      (["Employee", "Manager"].includes(a.role)
        ? a.vehicleIds.includes(v.id)
        : true),
  );
  const registrations = new Set(vehicles.map((v) => v.registration));
  const ids = new Set(vehicles.map((v) => v.id));
  const records = Object.fromEntries(
    Object.entries(s.records).map(([module, rows]) => [
      module,
      rows.filter((r) => {
        if (module === "users")
          return (
            canPage(a, "users") &&
            (a.role === "Super Admin"
              ? organization === "All" || r.orgId === organization
              : r.orgId === a.orgId &&
                ["Manager", "Employee"].includes(String(r.role)))
          );
        if (module === "integrations") return canPage(a, "integrations");
        if (!registrations.has(String(r.vehicle))) return false;
        if (a.role === "Employee" && module === "tasks")
          return r.employee === a.name;
        if (a.role === "Employee" && module === "expenses")
          return r.submitted === a.name;
        return true;
      }),
    ]),
  );
  return {
    ...s,
    vehicles,
    records,
    geofences: s.geofences.filter((g) =>
      a.role === "Super Admin"
        ? organization === "All" || g.orgId === organization
        : g.orgId === a.orgId && g.vehicles.some((id) => ids.has(id)),
    ),
  };
}
function deny(
  message = "This action is not permitted for your demo role.",
): never {
  throw new Error(message);
}
function same(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}
function changedKeys(before: RecordItem, after: RecordItem) {
  return Object.keys(after).filter((k) => !same(before[k], after[k]));
}
export function mutateRecord(
  s: DemoStore,
  a: DemoAccount,
  module: string,
  row: RecordItem,
): DemoStore {
  const prior = s.records[module]?.find((x) => x.id === row.id);
  const scoped = scopeStore(s, a);
  if (prior && !scoped.records[module]?.some((x) => x.id === prior.id)) deny();
  const v = s.vehicles.find((v) => v.registration === row.vehicle);
  if (row.vehicle && !scoped.vehicles.some((x) => x.id === v?.id))
    deny("Choose a vehicle in your authorized fleet.");
  const orgId =
    v?.orgId ??
    (a.role === "Super Admin" ? String(row.orgId || "org-dubai") : a.orgId);
  if (module === "alerts") {
    if (
      !prior ||
      !canPage(a, "alerts") ||
      changedKeys(prior, row).some((k) => k !== "status") ||
      row.status !== "Acknowledged"
    )
      deny();
  } else if (module === "commands") {
    if (!canPage(a, "immobilizer") || prior || !v?.immobilizer) deny();
  } else if (module === "integrations") {
    if (
      a.role !== "Super Admin" ||
      !prior ||
      row.connection !== "Not Connected"
    )
      deny();
  } else if (!(prior ? canEdit(a, module) : canCreate(a, module))) deny();
  if (module === "users") {
    if (prior?.id.startsWith("account-"))
      deny(
        "The four demo login identities are fixed. Manage additional directory users below.",
      );
    if (!allowedRoles(a).includes(String(row.role)))
      deny("You cannot assign this role.");
    if (a.role !== "Super Admin" && orgId !== a.orgId) deny();
  }
  if (a.role === "Employee" && module === "tasks") {
    if (
      !prior ||
      prior.employee !== a.name ||
      changedKeys(prior, row).some(
        (k) => !["status", "completedDate"].includes(k),
      ) ||
      (row.completedDate !== prior.completedDate &&
        row.completedDate !== demoDate) ||
      !["To do", "In progress", "Completed"].includes(String(row.status))
    )
      deny();
  }
  if (module === "expenses") {
    if (Number(row.amount) <= 0 || !Number.isFinite(Number(row.amount)))
      deny("Enter an amount greater than zero.");
    if (!canApprove(a)) {
      if (prior && (prior.submitted !== a.name || prior.status !== "Pending"))
        deny();
      if (row.status !== "Pending" || row.submitted !== a.name)
        deny("Employees can submit their own pending expenses only.");
    }
  }
  if (
    module === "tasks" &&
    a.role !== "Employee" &&
    !(
      row.employee === a.name ||
      scoped.records.drivers.some((d) => d.name === row.employee) ||
      scoped.records.users.some((u) => u.name === row.employee)
    )
  )
    deny("Assign a person in your permitted team.");
  if (
    module === "tasks" &&
    !["To do", "In progress", "Completed"].includes(String(row.status))
  )
    deny("Choose a valid task status.");
  const next: RecordItem = { ...row, orgId };
  const updatedRecords: DemoStore["records"] = {
    ...s.records,
    [module]: prior
      ? s.records[module].map((x) => (x.id === row.id ? next : x))
      : [next, ...(s.records[module] ?? [])],
  };
  if (module === "drivers" && v) {
    return {
      ...s,
      vehicles: s.vehicles.map((vehicle) =>
        vehicle.id === v.id
          ? { ...vehicle, driver: String(row.name) }
          : vehicle,
      ),
      records: {
        ...updatedRecords,
        trips: updatedRecords.trips.map((t) =>
          t.vehicle === v.registration ? { ...t, driver: String(row.name) } : t,
        ),
        behavior: updatedRecords.behavior.map((t) =>
          t.vehicle === v.registration ? { ...t, driver: String(row.name) } : t,
        ),
      },
    };
  }
  return { ...s, records: updatedRecords };
}
export function mutateVehicle(
  s: DemoStore,
  a: DemoAccount,
  v: Vehicle,
): DemoStore {
  const prior = s.vehicles.find((x) => x.id === v.id);
  if (!(prior ? canEdit(a, "vehicles") : canCreate(a, "vehicles"))) deny();
  if (prior && !scopeStore(s, a).vehicles.some((x) => x.id === v.id)) deny();
  if (!v.name.trim() || !v.registration.trim() || !v.driver.trim())
    deny("Complete the required vehicle fields.");
  if (
    s.vehicles.some(
      (x) =>
        x.id !== v.id &&
        x.registration.toLowerCase() === v.registration.toLowerCase(),
    )
  )
    deny("This registration already exists.");
  if (!inDemoArea([v.lat, v.lng]))
    deny("Vehicle coordinates must stay within the UAE demo areas.");
  const vehicle = {
    ...v,
    orgId: prior?.orgId ?? (a.role === "Super Admin" ? v.orgId : a.orgId),
  };
  const records = Object.fromEntries(
    Object.entries(s.records).map(([k, rows]) => [
      k,
      rows.map((r) =>
        prior && r.vehicle === prior.registration
          ? {
              ...r,
              vehicle: vehicle.registration,
              ...(k === "drivers" ? { name: vehicle.driver } : {}),
              ...("driver" in r ? { driver: vehicle.driver } : {}),
            }
          : r,
      ),
    ]),
  );
  return {
    ...s,
    vehicles: prior
      ? s.vehicles.map((x) => (x.id === v.id ? vehicle : x))
      : [...s.vehicles, vehicle],
    records,
  };
}
export function mutateGeofence(
  s: DemoStore,
  a: DemoAccount,
  g: Geofence,
): DemoStore {
  const prior = s.geofences.find((x) => x.id === g.id);
  if (!(prior ? canEdit(a, "geofences") : canCreate(a, "geofences"))) deny();
  if (prior && !scopeStore(s, a).geofences.some((x) => x.id === g.id)) deny();
  const scope = scopeStore(s, a);
  if (
    !g.vehicles.length ||
    g.vehicles.some((id) => !scope.vehicles.some((v) => v.id === id))
  )
    deny("Assign at least one authorized vehicle.");
  const orgId = s.vehicles.find((v) => v.id === g.vehicles[0])!.orgId;
  if (
    g.vehicles.some(
      (id) => s.vehicles.find((v) => v.id === id)?.orgId !== orgId,
    )
  )
    deny("A geofence must belong to one organization.");
  if (
    !g.name.trim() ||
    g.radius < 100 ||
    g.radius > 5000 ||
    !inDemoArea(g.center) ||
    g.points.some((p) => !inDemoArea(p)) ||
    (g.type === "polygon" && g.points.length < 3)
  )
    deny(
      "Use a named UAE city zone, a 100–5,000 m radius, and valid map points.",
    );
  const row = { ...g, orgId };
  return {
    ...s,
    geofences: prior
      ? s.geofences.map((x) => (x.id === g.id ? row : x))
      : [...s.geofences, row],
  };
}
export function resetData(s: DemoStore, a: DemoAccount): DemoStore {
  if (!canReset(a)) deny();
  const fresh = createSeedStore();
  if (a.role === "Super Admin") return fresh;
  return {
    ...s,
    vehicles: [
      ...s.vehicles.filter((v) => v.orgId !== a.orgId),
      ...fresh.vehicles.filter((v) => v.orgId === a.orgId),
    ],
    records: Object.fromEntries(
      Object.entries(s.records).map(([k, rows]) => [
        k,
        [
          ...rows.filter((r) => r.orgId !== a.orgId),
          ...(fresh.records[k] ?? []).filter((r) => r.orgId === a.orgId),
        ],
      ]),
    ),
    geofences: [
      ...s.geofences.filter((g) => g.orgId !== a.orgId),
      ...fresh.geofences.filter((g) => g.orgId === a.orgId),
    ],
    preferences: { ...s.preferences, [a.orgId]: fresh.preferences[a.orgId] },
  };
}
export const demoDataService = {
  load(storage: Storage = localStorage): DemoStore {
    try {
      const parsed = JSON.parse(storage.getItem(DATA_KEY) ?? "null");
      if (
        parsed?.version === 2 &&
        Array.isArray(parsed.vehicles) &&
        parsed.records &&
        Array.isArray(parsed.geofences) &&
        Object.keys(createSeedStore().records).every((k) =>
          Array.isArray(parsed.records[k]),
        )
      )
        return parsed;
    } catch {
      /* recover seed on corrupted or unavailable storage */
    }
    return createSeedStore();
  },
  save(s: DemoStore, storage: Storage = localStorage) {
    storage.setItem(DATA_KEY, JSON.stringify(s));
  },
};
export function inPeriod(r: RecordItem, days: number, end = demoDate) {
  const date = String(r.date ?? r.time ?? "").slice(0, 10);
  if (!date) return true;
  const start = new Date(`${end}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return date >= start.toISOString().slice(0, 10) && date <= end;
}
export function chartSeries(s: DemoStore, days: number, vehicle = "All") {
  const include = (r: RecordItem) => vehicle === "All" || r.vehicle === vehicle;
  const telemetry = s.records.telemetry.filter(include);
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(`${demoDate}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - days + 1 + i);
    const date = d.toISOString().slice(0, 10),
      rows = telemetry.filter((r) => r.date === date),
      behavior = s.records.behavior.filter(
        (r) => include(r) && r.date === date,
      ),
      temps = rows.filter((r) => typeof r.temperature === "number");
    return {
      day: `${date.slice(8)} Oct`,
      date,
      distance: rows.reduce((n, r) => n + Number(r.distance), 0),
      fuel: Number(rows.reduce((n, r) => n + Number(r.fuel), 0).toFixed(1)),
      temperature: temps.length
        ? Number(
            (
              temps.reduce((n, r) => n + Number(r.temperature), 0) /
              temps.length
            ).toFixed(1),
          )
        : null,
      score: Math.max(
        0,
        100 -
          behavior.reduce((n, r) => n + Number(r.penalty), 0) /
            Math.max(rows.length, 1),
      ),
      expenses: s.records.expenses
        .filter((r) => include(r) && r.date === date)
        .reduce((n, r) => n + Number(r.amount), 0),
      tasks: s.records.tasks.filter(
        (r) =>
          include(r) &&
          r.status === "Completed" &&
          String(r.completedDate ?? r.date) === date,
      ).length,
      downtime: rows.reduce((n, r) => n + Number(r.downtime), 0),
    };
  });
}

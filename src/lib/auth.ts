import { DemoAccount, Role } from "@/types";
export const DEMO_PASSWORD = "Trackwe@123";
export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: "account-super",
    name: "Moin",
    email: "superadmin@trackwe.demo",
    role: "Super Admin",
    orgId: "platform",
    vehicleIds: [],
  },
  {
    id: "account-admin",
    name: "Ahmed Ali",
    email: "admin@trackwe.demo",
    role: "Admin",
    orgId: "org-dubai",
    vehicleIds: [],
  },
  {
    id: "account-manager",
    name: "Sara Khalid",
    email: "manager@trackwe.demo",
    role: "Manager",
    orgId: "org-dubai",
    vehicleIds: Array.from({ length: 12 }, (_, i) => `v${i + 1}`),
  },
  {
    id: "account-employee",
    name: "Omar Hassan",
    email: "employee@trackwe.demo",
    role: "Employee",
    orgId: "org-dubai",
    vehicleIds: ["v1", "v2"],
  },
];
export const SESSION_KEY = "trackwe.demo.session.v2";
// Frontend-only simulation, deliberately contains no production credentials or token secrets.
export const demoAuth = {
  login(
    email: string,
    password: string,
    storage: Storage = localStorage,
  ): DemoAccount {
    const account = DEMO_ACCOUNTS.find(
      (a) => a.email === email.trim().toLowerCase(),
    );
    if (!account || password !== DEMO_PASSWORD)
      throw new Error(
        "Email or password is incorrect. Use one of the demo accounts below.",
      );
    storage.setItem(
      SESSION_KEY,
      JSON.stringify({
        accountId: account.id,
        expiresAt: Date.now() + 8 * 60 * 60 * 1000,
      }),
    );
    return account;
  },
  restore(storage: Storage = localStorage): DemoAccount | null {
    try {
      const session = JSON.parse(storage.getItem(SESSION_KEY) ?? "null");
      if (
        !session ||
        typeof session.expiresAt !== "number" ||
        session.expiresAt <= Date.now()
      ) {
        storage.removeItem(SESSION_KEY);
        return null;
      }
      return DEMO_ACCOUNTS.find((a) => a.id === session.accountId) ?? null;
    } catch {
      return null;
    }
  },
  logout(storage: Storage = localStorage) {
    storage.removeItem(SESSION_KEY);
  },
};
const operational = [
  "dashboard",
  "data-fetching",
  "vehicles",
  "drivers",
  "tracking",
  "trips",
  "geofences",
  "fuel",
  "temperature",
  "diagnostics",
  "behavior",
  "alerts",
  "tasks",
  "expenses",
  "reports",
  "profile",
];
const pages: Record<Role, string[]> = {
  "Super Admin": [
    ...operational,
    "cameras",
    "immobilizer",
    "users",
    "integrations",
    "settings",
    "organizations",
  ],
  Admin: [...operational, "cameras", "immobilizer", "users", "settings"],
  Manager: operational.filter((p) => p !== "geofences"),
  Employee: ["dashboard", "vehicles", "tasks", "expenses", "alerts", "profile"],
};
export function canPage(a: DemoAccount, page: string) {
  return pages[a.role].includes(page);
}
export function canCreate(a: DemoAccount, module: string) {
  if (a.role === "Super Admin")
    return [
      "vehicles",
      "drivers",
      "tasks",
      "expenses",
      "users",
      "geofences",
    ].includes(module);
  if (a.role === "Admin")
    return [
      "vehicles",
      "drivers",
      "tasks",
      "expenses",
      "users",
      "geofences",
    ].includes(module);
  if (a.role === "Manager") return ["tasks", "expenses"].includes(module);
  return module === "expenses";
}
export function canEdit(a: DemoAccount, module: string) {
  if (["Super Admin", "Admin"].includes(a.role))
    return [
      "vehicles",
      "drivers",
      "tasks",
      "expenses",
      "users",
      "geofences",
    ].includes(module);
  return ["tasks", "expenses"].includes(module);
}
export function canApprove(a: DemoAccount) {
  return a.role !== "Employee";
}
export function canReset(a: DemoAccount) {
  return a.role === "Super Admin" || a.role === "Admin";
}
export function allowedRoles(a: DemoAccount) {
  return a.role === "Super Admin"
    ? ["Employee", "Manager", "Admin", "Super Admin"]
    : ["Employee", "Manager"];
}

import { seed } from "@/data/records";
import { vehicles as initialVehicles } from "@/data/vehicles";
export type Field = {
  key: string;
  label: string;
  type?: string;
  options?: string[];
  optional?: boolean;
};
export const fields: Record<string, Field[]> = {
  vehicles: [
    { key: "registration", label: "Registration" },
    { key: "name", label: "Vehicle name" },
    {
      key: "type",
      label: "Vehicle type",
      options: ["Light truck", "Heavy truck", "Van", "Refrigerated"],
    },
    { key: "driver", label: "Assigned driver" },
    {
      key: "device",
      label: "Device",
      options: ["Teltonika FMC130", "Queclink GV300"],
    },
  ],
  drivers: [
    { key: "name", label: "Full name" },
    { key: "contact", label: "Demo email", type: "email" },
    {
      key: "vehicle",
      label: "Assigned vehicle",
      options: initialVehicles.map((v) => v.registration),
    },
    { key: "status", label: "Status", options: ["On duty", "Off duty"] },
  ],
  tasks: [
    { key: "title", label: "Task title" },
    { key: "description", label: "Description" },
    {
      key: "employee",
      label: "Assigned employee",
      options: seed.users
        .map((u) => String(u.name))
        .concat(seed.drivers.map((d) => String(d.name))),
    },
    {
      key: "vehicle",
      label: "Related vehicle",
      options: initialVehicles.map((v) => v.registration),
    },
    { key: "priority", label: "Priority", options: ["Medium", "High", "Low"] },
    { key: "due", label: "Due date", type: "date" },
    {
      key: "status",
      label: "Status",
      options: ["To do", "In progress", "Completed"],
    },
  ],
  expenses: [
    { key: "title", label: "Expense title" },
    {
      key: "category",
      label: "Category",
      options: ["Fuel", "Maintenance", "Tolls", "Insurance", "Other"],
    },
    {
      key: "vehicle",
      label: "Vehicle",
      options: initialVehicles.map((v) => v.registration),
    },
    { key: "amount", label: "Amount (AED)", type: "number" },
    { key: "date", label: "Date", type: "date" },
    { key: "submitted", label: "Submitted by" },
    {
      key: "status",
      label: "Approval status",
      options: ["Pending", "Approved", "Rejected"],
    },
  ],
  users: [
    { key: "name", label: "Full name" },
    { key: "email", label: "Email", type: "email" },
    {
      key: "role",
      label: "Role",
      options: ["Employee", "Manager", "Admin", "Super Admin"],
    },
    { key: "team", label: "Team / organization" },
    { key: "status", label: "Status", options: ["Active", "Inactive"] },
  ],
};

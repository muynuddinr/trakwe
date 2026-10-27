"use client";
import { demoDate } from "@/data/records";
import { vehicles as initialVehicles } from "@/data/vehicles";
import { useWorkspace } from "@/providers/workspace-provider";
import { RecordItem, Vehicle } from "@/types";

import { fields, type Field } from "@/config/form-fields";
import { organizations, routeFor } from "@/data/geography";
import { allowedRoles } from "@/lib/auth";

export function useRecordForm() {
  const {
    modal,
    vehicles,
    records,
    account,
    employee,
    setVehicles,
    setRecords,
    setModal,
    setNotice,
  } = useWorkspace();
  function saveForm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!modal) return;
    const values = Object.fromEntries(
      new FormData(e.currentTarget).entries(),
    ) as Record<string, string>;
    let ok = false;
    if (modal.module === "vehicles") {
      const prior = vehicles.find((v) => v.id === modal.row?.id);
      const region = values.region ?? prior?.region ?? "Dubai";
      const point = routeFor(region)[0];
      const vehicle: Vehicle = {
        ...(prior ?? initialVehicles[0]),
        ...values,
        id: prior?.id ?? `v-${Date.now()}`,
        orgId:
          prior?.orgId ??
          (account.role === "Super Admin"
            ? (values.orgId ?? "org-dubai")
            : account.orgId),
        region,
        lat: prior?.lat ?? point[0],
        lng: prior?.lng ?? point[1],
        ...(prior
          ? {}
          : {
              status: "Offline",
              speed: 0,
              fuel: 0,
              distance: 0,
              temperature: null,
              battery: 0,
              can: false,
              camera: false,
              immobilizer: false,
              updated: "No GPS data",
            }),
      };
      ok = setVehicles((vs) =>
        prior
          ? vs.map((v) => (v.id === prior.id ? vehicle : v))
          : [...vs, vehicle],
      );
    } else {
      const row: RecordItem = {
        ...(modal.row ?? {}),
        ...values,
        id: modal.row?.id ?? `${modal.module}-${Date.now()}`,
        orgId:
          modal.row?.orgId ??
          (account.role === "Super Admin"
            ? (values.orgId ?? "org-dubai")
            : account.orgId),
      };
      if (modal.module === "drivers") {
        row.score = modal.row?.score ?? 100;
        row.events = modal.row?.events ?? 0;
      }
      if (modal.module === "expenses") {
        row.amount = Number(values.amount);
        row.receipt = "Not attached";
        if (employee) {
          row.submitted = account.name;
          row.status = "Pending";
        }
      }
      if (modal.module === "tasks") {
        row.date = modal.row?.date ?? demoDate;
        if (row.status === "Completed") row.completedDate = demoDate;
      }
      ok = setRecords((r) => ({
        ...r,
        [modal.module]: modal.row
          ? r[modal.module].map((x) => (x.id === modal.row!.id ? row : x))
          : [row, ...r[modal.module]],
      }));
    }
    if (ok) {
      setModal(null);
      setNotice("Saved. Your demo changes persist after refresh.");
    }
  }
  function formFields(module: string): Field[] {
    let fs = [...(fields[module] ?? [])];
    if (module === "vehicles" && !modal?.row)
      fs.push({
        key: "region",
        label: "UAE city",
        options: [
          "Dubai",
          "Abu Dhabi",
          "Sharjah",
          "Ajman",
          "Ras Al Khaimah",
          "Fujairah",
          "Al Ain",
        ],
      });
    if (
      account.role === "Super Admin" &&
      ["vehicles", "users"].includes(module)
    )
      fs.push({
        key: "orgId",
        label: "Organization",
        options: organizations.map((o) => o.id),
      });
    if (employee && module === "tasks")
      return fs.filter((f) => f.key === "status");
    if (employee && module === "expenses")
      fs = fs.filter((f) => !["submitted", "status"].includes(f.key));
    return fs.map((f) => ({
      ...f,
      ...(f.key === "vehicle"
        ? { options: vehicles.map((v) => v.registration) }
        : f.key === "employee"
          ? {
              options: Array.from(
                new Set([
                  account.name,
                  ...records.drivers.map((d) => String(d.name)),
                ]),
              ),
            }
          : f.key === "role"
            ? { options: allowedRoles(account) }
            : {}),
    }));
  }
  return { saveForm, formFields };
}

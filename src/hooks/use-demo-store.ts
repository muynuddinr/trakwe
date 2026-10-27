"use client";
import { createSeedStore } from "@/data/records";
import {
  demoDataService,
  mutateGeofence,
  mutateRecord,
  mutateVehicle,
  resetData,
  scopeStore,
} from "@/lib/demo-data";
import { DemoAccount, DemoStore, Geofence, RecordItem, Vehicle } from "@/types";
import { useEffect, useState } from "react";
export function useDemoStore(
  account: DemoAccount,
  organization: string,
  onError: (message: string) => void,
) {
  const [raw, setRaw] = useState<DemoStore>(createSeedStore),
    [ready, setReady] = useState(false);
  useEffect(() => {
    setRaw(demoDataService.load());
    setReady(true);
  }, []);
  const data = scopeStore(raw, account, organization);
  function commit(fn: (s: DemoStore) => DemoStore) {
    try {
      const next = fn(raw);
      demoDataService.save(next);
      setRaw(next);
      return true;
    } catch (e) {
      onError(e instanceof Error ? e.message : "Unable to save demo records.");
      return false;
    }
  }
  const setVehicles = (fn: (v: Vehicle[]) => Vehicle[]) =>
    commit((s) => {
      let next = s;
      for (const v of fn(scopeStore(s, account, organization).vehicles)) {
        const old = s.vehicles.find((x) => x.id === v.id);
        if (JSON.stringify(old) !== JSON.stringify(v))
          next = mutateVehicle(next, account, v);
      }
      return next;
    });
  const setRecords = (
    fn: (r: Record<string, RecordItem[]>) => Record<string, RecordItem[]>,
  ) =>
    commit((s) => {
      let next = s;
      const proposal = fn(scopeStore(s, account, organization).records);
      for (const [module, rows] of Object.entries(proposal))
        for (const row of rows) {
          const old = s.records[module]?.find((x) => x.id === row.id);
          if (JSON.stringify(old) !== JSON.stringify(row))
            next = mutateRecord(next, account, module, row);
        }
      return next;
    });
  const setGeofences = (fn: (g: Geofence[]) => Geofence[]) =>
    commit((s) => {
      let next = s;
      for (const g of fn(scopeStore(s, account, organization).geofences)) {
        const old = s.geofences.find((x) => x.id === g.id);
        if (JSON.stringify(old) !== JSON.stringify(g))
          next = mutateGeofence(next, account, g);
      }
      return next;
    });
  return {
    data,
    ready,
    setVehicles,
    setRecords,
    setGeofences,
    reset: () => commit((s) => resetData(s, account)),
    savePreferences: (name: string, emailAlerts: boolean) =>
      commit((s) => {
        if (!["Super Admin", "Admin"].includes(account.role))
          throw new Error("Settings are restricted to administrators.");
        const orgId =
          account.role === "Super Admin"
            ? organization === "All"
              ? "org-dubai"
              : organization
            : account.orgId;
        return {
          ...s,
          preferences: { ...s.preferences, [orgId]: { name, emailAlerts } },
        };
      }),
  };
}

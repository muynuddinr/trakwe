"use client";
import { demoDate } from "@/data/records";
import { DemoAccount, RecordItem, Vehicle } from "@/types";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { groups, nav } from "@/config/navigation";
import { organizations } from "@/data/geography";
import { useDemoStore } from "@/hooks/use-demo-store";
import { canCreate, canPage } from "@/lib/auth";
import { chartSeries } from "@/lib/demo-data";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
export function useWorkspaceController(
  account: DemoAccount,
  onLogout: () => void,
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedVehicle = searchParams.get(
    pathname.startsWith("/tracking") ? "vehicle" : "id",
  );
  const page = usePathname().split("/").filter(Boolean)[0] || "dashboard";
  const [organization, setOrganization] = useState("All");
  const [collapsed, setCollapsed] = useState(false),
    [mobile, setMobile] = useState(false),
    [selectedId, setSelectedId] = useState<string | null>(null),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState("All"),
    [vehicleQuery, setVehicleQuery] = useState(""),
    [global, setGlobal] = useState(""),
    [days, setDays] = useState(7),
    [refresh, setRefresh] = useState("10:42 AM"),
    [notice, setNotice] = useState(""),
    [notifications, setNotifications] = useState(false),
    [profile, setProfile] = useState(false),
    [modal, setModal] = useState<{
      module: string;
      row?: RecordItem;
    } | null>(null),
    [priority, setPriority] = useState("All"),
    [filterVehicle, setFilterVehicle] = useState("All"),
    [severity, setSeverity] = useState("All"),
    [category, setCategory] = useState("All"),
    [commandTarget, setCommandTarget] = useState<Vehicle | null>(null);
  const {
    data: store,
    ready,
    setVehicles,
    setRecords,
    setGeofences,
    reset,
    savePreferences,
  } = useDemoStore(account, organization, setNotice);
  const { vehicles, records, geofences } = store;
  const access = (p: string) => canPage(account, p);
  const series = chartSeries(store, days, filterVehicle);

  const employee = account.role === "Employee";
  const visibleGroups = groups
    .map(
      ([label, items]) =>
        [label, items.filter(([p]) => access(p))] as [
          string,
          [string, string, LucideIcon][],
        ],
    )
    .filter(([, items]) => items.length);
  const dashboardTitle =
    account.role === "Super Admin"
      ? "Platform dashboard"
      : account.role === "Admin"
        ? "Organization dashboard"
        : account.role === "Manager"
          ? "Manager dashboard"
          : "My dashboard";
  const scopeName =
    account.role === "Super Admin"
      ? organization === "All"
        ? "All organizations"
        : organizations.find((o) => o.id === organization)?.name
      : organizations.find((o) => o.id === account.orgId)?.name;
  const selected = vehicles.find((v) => v.id === selectedId);
  const activeAlerts = records.alerts.filter(
    (a) => a.status === "Unacknowledged",
  ).length;
  const title = pathname.startsWith("/vehicles/detail")
    ? "Vehicle details"
    : page === "dashboard"
      ? dashboardTitle
      : (nav.find((n) => n[0] === page)?.[1] ?? "Dashboard");
  useEffect(() => {
    if (requestedVehicle) setSelectedId(requestedVehicle);
  }, [requestedVehicle]);
  function openVehicle(id: string, target: "detail" | "tracking" = "detail") {
    if (!vehicles.some((v) => v.id === id)) return;
    if (target === "tracking" && !access("tracking")) return;
    setSelectedId(id);
    setStatus("All");
    setVehicleQuery("");
    setGlobal("");
    setMobile(false);
    router.push(
      target === "tracking"
        ? "/tracking/?vehicle=" + encodeURIComponent(id)
        : "/vehicles/detail/?id=" + encodeURIComponent(id),
    );
  }
  function go(p: string) {
    const target = access(p) ? p : "dashboard";
    if (target !== p) setNotice("This page is not available for your role.");
    setStatus("All");
    setQuery("");
    setVehicleQuery("");
    setPriority("All");
    setCategory("All");
    setSeverity("All");
    setFilterVehicle("All");
    setMobile(false);
    setGlobal("");
    router.push("/" + target);
  }
  useEffect(() => {
    if (!access(page)) {
      setNotice("This page is not available for your role.");
      router.replace("/dashboard");
    }
  }, [page, account.role, router]);

  useEffect(() => {
    if (notice) {
      const t = setTimeout(() => setNotice(""), 4000);
      return () => clearTimeout(t);
    }
  }, [notice]);

  function update(module: string, id: string, changes: Partial<RecordItem>) {
    if (
      setRecords((r) => ({
        ...r,
        [module]: r[module].map((x) =>
          x.id === id
            ? ({
                ...x,
                ...changes,
                ...(module === "tasks" && changes.status === "Completed"
                  ? { completedDate: demoDate }
                  : {}),
              } as RecordItem)
            : x,
        ),
      }))
    )
      setNotice("Saved to this browser.");
  }

  const filteredVehicles = vehicles.filter(
    (v) =>
      (status === "All" || v.status === status) &&
      `${v.name} ${v.registration} ${v.driver}`
        .toLowerCase()
        .includes(vehicleQuery.toLowerCase()),
  );
  const filterRows = (rs: RecordItem[]) =>
    rs.filter(
      (r) =>
        Object.values(r)
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase()) &&
        (status === "All" || r.status === status) &&
        (filterVehicle === "All" || r.vehicle === filterVehicle) &&
        (severity === "All" || r.severity === severity) &&
        (category === "All" || r.type === category) &&
        (priority === "All" || r.priority === priority),
    );
  const vehicleSelect = (
    <select
      aria-label="Filter vehicle"
      value={filterVehicle}
      onChange={(e) => setFilterVehicle(e.target.value)}
    >
      <option>All</option>
      {vehicles.map((v) => (
        <option key={v.id}>{v.registration}</option>
      ))}
    </select>
  );
  const periodSelect = (
    <select
      aria-label="Date range"
      value={days}
      onChange={(e) => setDays(Number(e.target.value))}
    >
      <option value={7}>Last 7 days</option>
      <option value={14}>Last 14 days</option>
    </select>
  );
  function selectStatus(options: string[]) {
    return (
      <select
        aria-label="Filter status"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        <option>All</option>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    );
  }
  const newButton = (m: string, label: string) =>
    canCreate(account, m) && (
      <button
        className="button primary"
        onClick={() => setModal({ module: m })}
      >
        <Plus size={15} />
        {label}
      </button>
    );
  const cardLink = (p: string, text = "View all") =>
    access(p) && (
      <button className="text-button" onClick={() => go(p)}>
        {text}
        <ArrowUpRight size={13} />
      </button>
    );
  return {
    account,
    openVehicle,
    requestedVehicle,
    onLogout,
    organization,
    setOrganization,
    page,
    collapsed,
    setCollapsed,
    mobile,
    setMobile,
    selectedId,
    setSelectedId,
    query,
    setQuery,
    status,
    setStatus,
    vehicleQuery,
    setVehicleQuery,
    global,
    setGlobal,
    days,
    setDays,
    refresh,
    setRefresh,
    notice,
    setNotice,
    notifications,
    setNotifications,
    profile,
    setProfile,
    modal,
    setModal,
    priority,
    setPriority,
    filterVehicle,
    setFilterVehicle,
    severity,
    setSeverity,
    category,
    setCategory,
    commandTarget,
    setCommandTarget,
    store,
    ready,
    setVehicles,
    setRecords,
    setGeofences,
    reset,
    savePreferences,
    vehicles,
    records,
    geofences,
    access,
    series,
    employee,
    visibleGroups,
    dashboardTitle,
    scopeName,
    selected,
    activeAlerts,
    title,
    filteredVehicles,
    filterRows,
    vehicleSelect,
    periodSelect,
    newButton,
    cardLink,
    go,
    update,
    selectStatus,
  };
}

"use client";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { PersonAvatar } from "@/components/ui/person-avatar";
import { Badge } from "@/components/table";
import {
  ArrowRight,
  Bell,
  ChevronDown,
  ListTodo,
  LogOut,
  Menu,
  Search,
  Settings,
  Truck,
} from "lucide-react";

import { nav } from "@/config/navigation";

import { useWorkspace } from "@/providers/workspace-provider";
export function Topbar() {
  const {
    account,
    onLogout,
    mobile,
    setMobile,
    setSelectedId,
    global,
    setGlobal,
    notifications,
    setNotifications,
    profile,
    setProfile,
    setModal,
    vehicles,
    records,
    access,
    employee,
    activeAlerts,
    title,
    go,
  } = useWorkspace();
  return (
    <header className="topbar">
      <div className="breadcrumb">
        <button
          className="icon-button mobile-menu"
          onClick={() => setMobile(!mobile)}
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <span>Workspace</span>
        <span>/</span>
        <b>{title}</b>
      </div>
      <div className="topbar-right">
        <div className="global-search">
          <Search size={15} />
          <input
            placeholder="Search fleet…"
            value={global}
            onChange={(e) => setGlobal(e.target.value)}
            aria-label="Global search"
          />
          {global && (
            <div className="search-results">
              {vehicles
                .filter((v) =>
                  `${v.registration} ${v.name} ${v.driver}`
                    .toLowerCase()
                    .includes(global.toLowerCase()),
                )
                .slice(0, 5)
                .map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      setSelectedId(v.id);
                      go(employee ? "vehicles" : "tracking");
                    }}
                  >
                    <Truck size={16} />
                    <span>
                      {v.registration}
                      <small>{v.name}</small>
                    </span>
                  </button>
                ))}
              {records.tasks
                .filter((t) =>
                  String(t.title).toLowerCase().includes(global.toLowerCase()),
                )
                .slice(0, 3)
                .map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      go("tasks");
                      setModal({ module: "tasks", row: t });
                    }}
                  >
                    <ListTodo size={16} />
                    {t.title}
                  </button>
                ))}
              {nav
                .filter((n) => access(n[0]))
                .filter((n) =>
                  n[1].toLowerCase().includes(global.toLowerCase()),
                )
                .slice(0, 3)
                .map((n) => (
                  <button key={n[0]} onClick={() => go(n[0])}>
                    {n[1]}
                    <ArrowRight size={14} />
                  </button>
                ))}
            </div>
          )}
        </div>
        <ThemeToggle />
        <span className="top-divider" />
        <button
          className="icon-button notification-button"
          aria-label="Notifications"
          onClick={() => {
            setNotifications(!notifications);
            setProfile(false);
          }}
        >
          <Bell size={19} />
          {activeAlerts > 0 && <i />}
        </button>
        <button
          className="profile-button"
          onClick={() => {
            setProfile(!profile);
            setNotifications(false);
          }}
        >
          <PersonAvatar name={account.name} />
          <span>
            <b>{account.name}</b>
            <small>{account.role}</small>
          </span>
          <ChevronDown size={13} />
        </button>
      </div>
      {notifications && (
        <div className="header-popover">
          <h3>
            Notifications <Badge>Demo</Badge>
          </h3>
          {records.alerts
            .filter((a) => a.status === "Unacknowledged")
            .slice(0, 4)
            .map((a) => (
              <button
                key={a.id}
                onClick={() => {
                  go("alerts");
                  setNotifications(false);
                }}
              >
                <Bell size={15} />
                <span>
                  {a.type}
                  <small>{a.vehicle}</small>
                </span>
              </button>
            ))}
          {!activeAlerts && <p>All caught up.</p>}
        </div>
      )}
      {profile && (
        <div className="header-popover profile-popover">
          <b>
            {account.name} · {account.role}
          </b>
          <p>Frontend preview account</p>
          <button
            onClick={() => {
              go("profile");
              setProfile(false);
            }}
          >
            <Settings size={15} />
            My profile
          </button>
          <button onClick={onLogout}>
            <LogOut size={15} />
            Log out / switch account
          </button>
        </div>
      )}
    </header>
  );
}

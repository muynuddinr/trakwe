"use client";
import { Building2, ChevronDown, ChevronsLeft, Navigation } from "lucide-react";

import { useWorkspace } from "@/providers/workspace-provider";
export function Sidebar() {
  const {
    page,
    collapsed,
    setCollapsed,
    mobile,
    visibleGroups,
    scopeName,
    activeAlerts,
    go,
  } = useWorkspace();
  return (
    <aside className={"sidebar " + (mobile ? "mobile-open" : "")}>
      <button
        className="brand"
        onClick={() => go("dashboard")}
        aria-label="Trackwe dashboard"
      >
        <span className="brand-mark">
          <Navigation size={24} fill="currentColor" />
        </span>
        <span>
          trackwe<span className="brand-dot">.</span>
        </span>
      </button>
      <div className="workspace-label">
        <Building2 size={14} />
        <span>{scopeName}</span>
        <ChevronDown size={12} />
      </div>
      <nav>
        {visibleGroups.map(([label, items]) => (
          <div className="nav-group" key={label}>
            <p>{label}</p>
            {items.map(([key, label, Icon]) => (
              <button
                key={key}
                title={label}
                className={"nav-item " + (page === key ? "active" : "")}
                onClick={() => go(key)}
              >
                <Icon size={18} />
                <span>{label}</span>
                {key === "alerts" && <b>{activeAlerts}</b>}
                {key === "tracking" && <i className="nav-live" />}
              </button>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="demo-mode">
          <i />
          Demo workspace
        </div>
        <button onClick={() => setCollapsed(!collapsed)}>
          <ChevronsLeft size={17} />
          <span>Collapse sidebar</span>
        </button>
      </div>
    </aside>
  );
}

"use client";
import dynamic from "next/dynamic";
export const FleetMap = dynamic(() => import("./fleet-map"), {
  ssr: false,
  loading: () => <div className="map-loading">Loading interactive map…</div>,
});

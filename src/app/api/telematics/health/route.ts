import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth";
import { getDatabase } from "@/server/db/db";
import { ingestionMetrics } from "@/server/tcp/metrics";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ("errorResponse" in auth) {
    return auth.errorResponse;
  }

  const db = getDatabase();
  const dbHealth = await db.checkHealth();
  const tcpMetrics = ingestionMetrics.getSnapshot();

  return NextResponse.json({
    status: dbHealth.ok ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    service: "Trackwe Telematics Ingestion & Management Backend",
    version: "1.0.0",
    database: {
      connected: dbHealth.ok,
      engine: dbHealth.type,
      latencyMs: dbHealth.latencyMs,
      error: dbHealth.error,
    },
    tcpListener: {
      running: tcpMetrics.isRunning,
      bind: `${tcpMetrics.bindHost}:${tcpMetrics.bindPort}`,
      uptimeSeconds: tcpMetrics.uptimeSeconds,
      activeSessions: tcpMetrics.activeSessions,
      authorizedConnections: tcpMetrics.authorizedConnections,
      rejectedConnections: tcpMetrics.rejectedConnections,
    },
    packetPipeline: {
      packetsReceived: tcpMetrics.packetsReceived,
      validPackets: tcpMetrics.validPackets,
      invalidPackets: tcpMetrics.invalidPackets,
      recordsProcessed: tcpMetrics.recordsProcessed,
      persistenceErrors: tcpMetrics.persistenceErrors,
      lastPacketReceiptTime: tcpMetrics.lastPacketReceiptTime,
      avgLatencyMs: tcpMetrics.avgLatencyMs,
    },
  });
}

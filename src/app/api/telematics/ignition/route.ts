import { NextRequest, NextResponse } from "next/server";
import { permissions, requireAuth } from "@/server/auth";
import { TelemetryRepository } from "@/server/db/repositories/telemetry-repository";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req, permissions.canViewTelematics);
  if ("errorResponse" in auth) {
    return auth.errorResponse;
  }
  const { user } = auth;

  const { searchParams } = new URL(req.url);
  const vehicleId = searchParams.get("vehicleId") || "All";
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20", 10)));
  const staleThreshold = Math.max(1, parseInt(searchParams.get("staleThreshold") || "10", 10));

  const telemetryRepo = new TelemetryRepository();

  let filterOrgId: string | undefined = undefined;
  if (user.role !== "Super Admin") {
    filterOrgId = user.orgId;
  }

  const [summary, events] = await Promise.all([
    telemetryRepo.getIgnitionSummary(filterOrgId, staleThreshold),
    telemetryRepo.listIgnitionEvents({
      orgId: filterOrgId,
      vehicleId,
      limit,
    }),
  ]);

  return NextResponse.json({
    summary,
    events,
  });
}

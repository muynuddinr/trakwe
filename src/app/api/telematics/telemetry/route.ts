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
  const deviceId = searchParams.get("deviceId") || "All";
  const page = Math.max(0, parseInt(searchParams.get("page") || "0", 10));
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "10", 10)));

  const telemetryRepo = new TelemetryRepository();

  let filterOrgId: string | undefined = undefined;
  if (user.role !== "Super Admin") {
    filterOrgId = user.orgId;
  }

  const [records, total] = await Promise.all([
    telemetryRepo.listHistorical({
      orgId: filterOrgId,
      vehicleId,
      deviceId,
      limit,
      offset: page * limit,
    }),
    telemetryRepo.countHistorical({
      orgId: filterOrgId,
      vehicleId,
      deviceId,
    }),
  ]);

  return NextResponse.json({
    data: records,
    pagination: {
      total,
      page,
      limit,
      pageCount: Math.max(1, Math.ceil(total / limit)),
    },
  });
}

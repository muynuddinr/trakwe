import { NextRequest, NextResponse } from "next/server";
import { permissions, requireAuth } from "@/server/auth";
import { DeviceRepository } from "@/server/db/repositories/device-repository";
import { TelemetryRepository } from "@/server/db/repositories/telemetry-repository";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req, permissions.canViewTelematics);
  if ("errorResponse" in auth) {
    return auth.errorResponse;
  }
  const { user } = auth;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "All";
  const model = searchParams.get("model") || "All";
  const page = Math.max(0, parseInt(searchParams.get("page") || "0", 10));
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "10", 10)));

  const deviceRepo = new DeviceRepository();
  const telemetryRepo = new TelemetryRepository();

  // Enforce tenant isolation based on role
  let filterOrgId: string | undefined = undefined;
  let filterVehicleIds: string[] | undefined = undefined;

  if (user.role === "Super Admin") {
    const requestedOrg = searchParams.get("orgId");
    if (requestedOrg && requestedOrg !== "platform") filterOrgId = requestedOrg;
  } else if (user.role === "Admin") {
    filterOrgId = user.orgId;
  } else if (user.role === "Manager") {
    filterOrgId = user.orgId;
    filterVehicleIds = user.vehicleIds;
  } else if (user.role === "Employee") {
    filterVehicleIds = user.vehicleIds;
  }

  const [devices, total] = await Promise.all([
    deviceRepo.list({
      orgId: filterOrgId,
      vehicleIds: filterVehicleIds,
      status,
      model,
      search,
      limit,
      offset: page * limit,
    }),
    deviceRepo.count({
      orgId: filterOrgId,
      vehicleIds: filterVehicleIds,
      status,
      model,
      search,
    }),
  ]);

  // Enrich with latest telemetry snapshots
  const enriched = await Promise.all(
    devices.map(async (dev) => {
      const snapshot = await telemetryRepo.getLatestSnapshot(dev.id);
      return {
        ...dev,
        latestTelemetry: snapshot,
      };
    })
  );

  return NextResponse.json({
    data: enriched,
    pagination: {
      total,
      page,
      limit,
      pageCount: Math.max(1, Math.ceil(total / limit)),
    },
  });
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req, permissions.canManageDevices);
  if ("errorResponse" in auth) {
    return auth.errorResponse;
  }
  const { user } = auth;

  try {
    const body = await req.json();
    const {
      imei,
      manufacturer,
      model,
      protocol,
      codec,
      status,
      vehicleId,
      reportingIntervalSec,
      simCarrier,
      ignitionSource,
      ignitionHighThreshold,
      ignitionLowThreshold,
      ignitionRpmThreshold,
      telemetryProfile,
    } = body;

    if (!imei || typeof imei !== "string" || !/^\d{8,20}$/.test(imei.trim())) {
      return NextResponse.json(
        { error: "Invalid IMEI", message: "IMEI must be 8-20 numeric characters." },
        { status: 400 }
      );
    }

    const deviceRepo = new DeviceRepository();
    const existing = await deviceRepo.findByImei(imei.trim());
    if (existing) {
      return NextResponse.json(
        { error: "Conflict", message: `A device with IMEI ${imei} is already registered.` },
        { status: 409 }
      );
    }

    // Tenant isolation: Admin can only register devices in their own organization
    const orgId = user.role === "Super Admin" ? body.orgId || user.orgId || "org-dubai" : user.orgId;

    const isFmc130 = (model || "").includes("130");

    const created = await deviceRepo.create({
      imei: imei.trim(),
      manufacturer: manufacturer || "Teltonika",
      model: model || (isFmc130 ? "Teltonika FMC130" : "Teltonika FMC920"),
      protocol: protocol || (isFmc130 ? "Teltonika Codec 8 / 8E / 16" : "Teltonika Codec 8 / 8E"),
      codec: codec || (isFmc130 ? "Codec 8 / Codec 8 Extended" : "Codec 8"),
      status: status || "active",
      orgId,
      vehicleId: vehicleId || null,
      reportingIntervalSec: reportingIntervalSec ? Number(reportingIntervalSec) : 60,
      simCarrier: simCarrier || "e& (Etisalat) UAE",
      ignitionSource: ignitionSource || "DIN1",
      ignitionHighThreshold: ignitionHighThreshold ? Number(ignitionHighThreshold) : 13.2,
      ignitionLowThreshold: ignitionLowThreshold ? Number(ignitionLowThreshold) : 12.8,
      ignitionRpmThreshold: ignitionRpmThreshold ? Number(ignitionRpmThreshold) : 400,
      telemetryProfile: telemetryProfile || {},
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal Server Error", message: err.message },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { permissions, requireAuth } from "@/server/auth";
import { DeviceRepository } from "@/server/db/repositories/device-repository";
import { TelemetryRepository } from "@/server/db/repositories/telemetry-repository";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req, permissions.canViewTelematics);
  if ("errorResponse" in auth) {
    return auth.errorResponse;
  }
  const { user } = auth;
  const { id } = await params;

  const deviceRepo = new DeviceRepository();
  const telemetryRepo = new TelemetryRepository();

  const device = await deviceRepo.findById(id);
  if (!device) {
    return NextResponse.json({ error: "Not Found", message: `Device ${id} not found.` }, { status: 404 });
  }

  // Tenant check
  if (user.role !== "Super Admin" && device.org_id !== user.orgId) {
    return NextResponse.json({ error: "Forbidden", message: "Device belongs to a different organization." }, { status: 403 });
  }

  if (user.role === "Employee" && (!device.vehicle_id || !user.vehicleIds.includes(device.vehicle_id))) {
    return NextResponse.json({ error: "Forbidden", message: "Vehicle not assigned to your account." }, { status: 403 });
  }

  const snapshot = await telemetryRepo.getLatestSnapshot(id);

  return NextResponse.json({
    data: {
      ...device,
      latestTelemetry: snapshot,
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req, permissions.canManageDevices);
  if ("errorResponse" in auth) {
    return auth.errorResponse;
  }
  const { user } = auth;
  const { id } = await params;

  const deviceRepo = new DeviceRepository();
  const device = await deviceRepo.findById(id);
  if (!device) {
    return NextResponse.json({ error: "Not Found", message: `Device ${id} not found.` }, { status: 404 });
  }

  // Tenant boundary
  if (user.role !== "Super Admin" && device.org_id !== user.orgId) {
    return NextResponse.json({ error: "Forbidden", message: "Cannot modify devices belonging to another organization." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const updated = await deviceRepo.update(id, {
      vehicleId: body.vehicleId !== undefined ? body.vehicleId : undefined,
      status: body.status,
      model: body.model,
      firmwareVersion: body.firmwareVersion,
      reportingIntervalSec: body.reportingIntervalSec,
      simCarrier: body.simCarrier,
    });

    return NextResponse.json({ data: updated });
  } catch (err: any) {
    return NextResponse.json({ error: "Internal Server Error", message: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req, permissions.canManageDevices);
  if ("errorResponse" in auth) {
    return auth.errorResponse;
  }
  const { user } = auth;
  const { id } = await params;

  const deviceRepo = new DeviceRepository();
  const device = await deviceRepo.findById(id);
  if (!device) {
    return NextResponse.json({ error: "Not Found", message: `Device ${id} not found.` }, { status: 404 });
  }

  if (user.role !== "Super Admin" && device.org_id !== user.orgId) {
    return NextResponse.json({ error: "Forbidden", message: "Cannot delete devices belonging to another organization." }, { status: 403 });
  }

  await deviceRepo.delete(id);
  return NextResponse.json({ success: true, message: `Device ${id} revoked successfully.` });
}

import { NextRequest, NextResponse } from "next/server";
import { permissions, requireAuth } from "@/server/auth";
import { LogRepository } from "@/server/db/repositories/log-repository";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req, permissions.canViewTelematics);
  if ("errorResponse" in auth) {
    return auth.errorResponse;
  }
  const { user } = auth;

  const { searchParams } = new URL(req.url);
  const severity = searchParams.get("severity") || "All";
  const search = searchParams.get("search") || "";
  const page = Math.max(0, parseInt(searchParams.get("page") || "0", 10));
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20", 10)));

  const logRepo = new LogRepository();

  let filterOrgId: string | undefined = undefined;
  if (user.role !== "Super Admin") {
    filterOrgId = user.orgId;
  }

  const [logs, total] = await Promise.all([
    logRepo.listLogs({
      orgId: filterOrgId,
      severity,
      search,
      limit,
      offset: page * limit,
    }),
    logRepo.countLogs({
      orgId: filterOrgId,
      severity,
      search,
    }),
  ]);

  return NextResponse.json({
    data: logs,
    pagination: {
      total,
      page,
      limit,
      pageCount: Math.max(1, Math.ceil(total / limit)),
    },
  });
}

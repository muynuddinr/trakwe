import { NextRequest } from "next/server";
import { DEMO_ACCOUNTS } from "@/lib/auth";
import { DemoAccount, Role } from "@/types";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  orgId: string;
  vehicleIds: string[];
}

export type PermissionCheck = (user: AuthenticatedUser) => boolean;

/**
 * Extracts and verifies the user identity from request headers:
 * - Authorization: Bearer <accountId>
 * - x-trackwe-account-id: <accountId>
 */
export function authenticateRequest(req: NextRequest): AuthenticatedUser | null {
  const authHeader = req.headers.get("authorization");
  const accountIdHeader = req.headers.get("x-trackwe-account-id");

  let accountId: string | null = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    accountId = authHeader.slice(7).trim();
  } else if (accountIdHeader) {
    accountId = accountIdHeader.trim();
  }

  if (!accountId) {
    return null;
  }

  const account = DEMO_ACCOUNTS.find((a) => a.id === accountId);
  if (!account) {
    return null;
  }

  return {
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role,
    orgId: account.orgId,
    vehicleIds: account.vehicleIds || [],
  };
}

/**
 * Enforces authentication and optional permission check.
 * Returns either { user } or { errorResponse }
 */
export function requireAuth(
  req: NextRequest,
  permissionCheck?: PermissionCheck
): { user: AuthenticatedUser } | { errorResponse: Response } {
  const user = authenticateRequest(req);

  if (!user) {
    return {
      errorResponse: new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "A valid authentication session is required to access telematics management APIs.",
          code: "AUTH_REQUIRED",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      ),
    };
  }

  if (permissionCheck && !permissionCheck(user)) {
    return {
      errorResponse: new Response(
        JSON.stringify({
          error: "Forbidden",
          message: `User role '${user.role}' lacks sufficient permissions for this operation.`,
          code: "FORBIDDEN",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      ),
    };
  }

  return { user };
}

/**
 * Standard permission rules
 */
export const permissions = {
  canManageDevices: (user: AuthenticatedUser) => user.role === "Super Admin" || user.role === "Admin",
  canViewTelematics: (user: AuthenticatedUser) =>
    user.role === "Super Admin" || user.role === "Admin" || user.role === "Manager" || user.role === "Employee",
};

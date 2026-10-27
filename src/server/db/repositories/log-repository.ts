import { getDatabase, IDatabaseClient } from "../db";

export interface CommunicationLogEntry {
  id: string;
  device_id: string | null;
  imei: string | null;
  vehicle_id: string | null;
  org_id: string | null;
  event_type: string;
  severity: "INFO" | "WARN" | "ERROR";
  message: string;
  packet_ref: string | null;
  details: string | null;
  created_at: string;
  vehicle_registration?: string;
}

export class LogRepository {
  constructor(private db: IDatabaseClient = getDatabase()) {}

  async addLog(entry: {
    deviceId?: string | null;
    imei?: string | null;
    vehicleId?: string | null;
    orgId?: string | null;
    eventType: string;
    severity?: "INFO" | "WARN" | "ERROR";
    message: string;
    packetRef?: string | null;
    details?: Record<string, unknown>;
  }): Promise<void> {
    const id = `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();
    await this.db.execute(
      `INSERT INTO device_communication_logs
       (id, device_id, imei, vehicle_id, org_id, event_type, severity, message, packet_ref, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        id,
        entry.deviceId || null,
        entry.imei || null,
        entry.vehicleId || null,
        entry.orgId || null,
        entry.eventType,
        entry.severity || "INFO",
        entry.message,
        entry.packetRef || null,
        entry.details ? JSON.stringify(entry.details) : null,
        now,
      ]
    );
  }

  async addParsingError(entry: {
    deviceId?: string | null;
    imei?: string | null;
    remoteIp?: string | null;
    errorType: string;
    errorMessage: string;
    rawHex?: string | null;
  }): Promise<void> {
    const id = `err-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();
    await this.db.execute(
      `INSERT INTO packet_parsing_errors
       (id, device_id, imei, remote_ip, error_type, error_message, raw_hex, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        entry.deviceId || null,
        entry.imei || null,
        entry.remoteIp || null,
        entry.errorType,
        entry.errorMessage,
        entry.rawHex || null,
        now,
      ]
    );
  }

  async listLogs(filter: {
    orgId?: string;
    severity?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<CommunicationLogEntry[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let pIdx = 1;

    if (filter.orgId && filter.orgId !== "platform") {
      conditions.push(`l.org_id = $${pIdx++}`);
      params.push(filter.orgId);
    }
    if (filter.severity && filter.severity !== "All") {
      conditions.push(`l.severity = $${pIdx++}`);
      params.push(filter.severity);
    }
    if (filter.search && filter.search.trim()) {
      const q = `%${filter.search.trim().toLowerCase()}%`;
      conditions.push(
        `(LOWER(l.message) LIKE $${pIdx} OR LOWER(COALESCE(l.device_id, '')) LIKE $${pIdx} OR LOWER(COALESCE(l.event_type, '')) LIKE $${pIdx} OR LOWER(COALESCE(v.registration, '')) LIKE $${pIdx})`
      );
      params.push(q);
      pIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const limit = Math.max(1, Math.min(100, filter.limit ?? 25));
    const offset = Math.max(0, filter.offset ?? 0);

    const query = `
      SELECT l.*, v.registration as vehicle_registration
      FROM device_communication_logs l
      LEFT JOIN vehicles v ON l.vehicle_id = v.id
      ${whereClause}
      ORDER BY l.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return this.db.query<CommunicationLogEntry>(query, params);
  }

  async countLogs(filter: {
    orgId?: string;
    severity?: string;
    search?: string;
  }): Promise<number> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let pIdx = 1;

    if (filter.orgId && filter.orgId !== "platform") {
      conditions.push(`l.org_id = $${pIdx++}`);
      params.push(filter.orgId);
    }
    if (filter.severity && filter.severity !== "All") {
      conditions.push(`l.severity = $${pIdx++}`);
      params.push(filter.severity);
    }
    if (filter.search && filter.search.trim()) {
      const q = `%${filter.search.trim().toLowerCase()}%`;
      conditions.push(
        `(LOWER(l.message) LIKE $${pIdx} OR LOWER(COALESCE(l.device_id, '')) LIKE $${pIdx} OR LOWER(COALESCE(l.event_type, '')) LIKE $${pIdx} OR LOWER(COALESCE(v.registration, '')) LIKE $${pIdx})`
      );
      params.push(q);
      pIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const query = `
      SELECT COUNT(*) as count
      FROM device_communication_logs l
      LEFT JOIN vehicles v ON l.vehicle_id = v.id
      ${whereClause}
    `;

    const rows = await this.db.query<{ count: number | string }>(query, params);
    return Number(rows[0]?.count ?? 0);
  }
}

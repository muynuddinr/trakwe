import { getDatabase, IDatabaseClient } from "../db";

export interface RegisteredDevice {
  id: string;
  imei: string;
  manufacturer: string;
  model: string;
  protocol: string;
  codec: string;
  org_id: string;
  vehicle_id: string | null;
  status: "active" | "disabled" | "revoked";
  firmware_version: string;
  sim_carrier: string;
  reporting_interval_sec: number;
  ignition_source?: string;
  ignition_high_threshold?: number;
  ignition_low_threshold?: number;
  ignition_rpm_threshold?: number;
  telemetry_profile?: any;
  last_connection_at: string | null;
  last_communication_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  vehicle_registration?: string;
  vehicle_name?: string;
  vehicle_type?: string;
  driver?: string;
  org_name?: string;
}

export class DeviceRepository {
  constructor(private db: IDatabaseClient = getDatabase()) {}

  async findByImei(imei: string): Promise<RegisteredDevice | null> {
    const rows = await this.db.query<RegisteredDevice>(
      `SELECT d.*, v.registration as vehicle_registration, v.name as vehicle_name, v.vehicle_type, v.driver, o.name as org_name
       FROM registered_devices d
       LEFT JOIN vehicles v ON d.vehicle_id = v.id
       LEFT JOIN organizations o ON d.org_id = o.id
       WHERE d.imei = $1 LIMIT 1`,
      [imei.trim()]
    );
    return rows[0] ?? null;
  }

  async findById(id: string): Promise<RegisteredDevice | null> {
    const rows = await this.db.query<RegisteredDevice>(
      `SELECT d.*, v.registration as vehicle_registration, v.name as vehicle_name, v.vehicle_type, v.driver, o.name as org_name
       FROM registered_devices d
       LEFT JOIN vehicles v ON d.vehicle_id = v.id
       LEFT JOIN organizations o ON d.org_id = o.id
       WHERE d.id = $1 LIMIT 1`,
      [id]
    );
    return rows[0] ?? null;
  }

  async list(filter: {
    orgId?: string;
    vehicleIds?: string[];
    status?: string;
    model?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<RegisteredDevice[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let pIdx = 1;

    if (filter.orgId && filter.orgId !== "platform") {
      conditions.push(`d.org_id = $${pIdx++}`);
      params.push(filter.orgId);
    }

    if (filter.vehicleIds && filter.vehicleIds.length > 0) {
      const placeholders = filter.vehicleIds.map(() => `$${pIdx++}`).join(", ");
      conditions.push(`d.vehicle_id IN (${placeholders})`);
      params.push(...filter.vehicleIds);
    }

    if (filter.status && filter.status !== "All") {
      conditions.push(`d.status = $${pIdx++}`);
      params.push(filter.status.toLowerCase());
    }

    if (filter.model && filter.model !== "All") {
      conditions.push(`(d.model = $${pIdx} OR d.model LIKE $${pIdx + 1})`);
      params.push(filter.model);
      params.push(`%${filter.model.replace("Teltonika", "").trim()}%`);
      pIdx += 2;
    }

    if (filter.search && filter.search.trim()) {
      const q = `%${filter.search.trim().toLowerCase()}%`;
      conditions.push(
        `(LOWER(d.id) LIKE $${pIdx} OR LOWER(d.imei) LIKE $${pIdx} OR LOWER(COALESCE(v.registration, '')) LIKE $${pIdx} OR LOWER(COALESCE(v.driver, '')) LIKE $${pIdx} OR LOWER(d.model) LIKE $${pIdx})`
      );
      params.push(q);
      pIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const limit = Math.max(1, Math.min(100, filter.limit ?? 25));
    const offset = Math.max(0, filter.offset ?? 0);

    const query = `
      SELECT d.*, v.registration as vehicle_registration, v.name as vehicle_name, v.vehicle_type, v.driver, o.name as org_name
      FROM registered_devices d
      LEFT JOIN vehicles v ON d.vehicle_id = v.id
      LEFT JOIN organizations o ON d.org_id = o.id
      ${whereClause}
      ORDER BY d.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return this.db.query<RegisteredDevice>(query, params);
  }

  async count(filter: {
    orgId?: string;
    vehicleIds?: string[];
    status?: string;
    model?: string;
    search?: string;
  }): Promise<number> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let pIdx = 1;

    if (filter.orgId && filter.orgId !== "platform") {
      conditions.push(`d.org_id = $${pIdx++}`);
      params.push(filter.orgId);
    }

    if (filter.vehicleIds && filter.vehicleIds.length > 0) {
      const placeholders = filter.vehicleIds.map(() => `$${pIdx++}`).join(", ");
      conditions.push(`d.vehicle_id IN (${placeholders})`);
      params.push(...filter.vehicleIds);
    }

    if (filter.status && filter.status !== "All") {
      conditions.push(`d.status = $${pIdx++}`);
      params.push(filter.status.toLowerCase());
    }

    if (filter.model && filter.model !== "All") {
      conditions.push(`(d.model = $${pIdx} OR d.model LIKE $${pIdx + 1})`);
      params.push(filter.model);
      params.push(`%${filter.model.replace("Teltonika", "").trim()}%`);
      pIdx += 2;
    }

    if (filter.search && filter.search.trim()) {
      const q = `%${filter.search.trim().toLowerCase()}%`;
      conditions.push(
        `(LOWER(d.id) LIKE $${pIdx} OR LOWER(d.imei) LIKE $${pIdx} OR LOWER(COALESCE(v.registration, '')) LIKE $${pIdx} OR LOWER(COALESCE(v.driver, '')) LIKE $${pIdx} OR LOWER(d.model) LIKE $${pIdx})`
      );
      params.push(q);
      pIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const query = `
      SELECT COUNT(*) as count
      FROM registered_devices d
      LEFT JOIN vehicles v ON d.vehicle_id = v.id
      ${whereClause}
    `;

    const rows = await this.db.query<{ count: number | string }>(query, params);
    return Number(rows[0]?.count ?? 0);
  }

  async create(device: {
    id?: string;
    imei: string;
    manufacturer?: string;
    model?: string;
    protocol?: string;
    codec?: string;
    orgId: string;
    vehicleId?: string | null;
    status?: "active" | "disabled" | "revoked";
    firmwareVersion?: string;
    simCarrier?: string;
    reportingIntervalSec?: number;
    ignitionSource?: string;
    ignitionHighThreshold?: number;
    ignitionLowThreshold?: number;
    ignitionRpmThreshold?: number;
    telemetryProfile?: any;
  }): Promise<RegisteredDevice> {
    const rawImei = device.imei.trim();
    const id = device.id || `dev-${rawImei.slice(-6)}`;
    const now = new Date().toISOString();

    const isFmc130 = (device.model || "").includes("130");
    const model = device.model || (isFmc130 ? "Teltonika FMC130" : "Teltonika FMC920");
    const protocol = device.protocol || (isFmc130 ? "Teltonika Codec 8 / 8E / 16" : "Teltonika Codec 8 / 8E");
    const codec = device.codec || (isFmc130 ? "Codec 8 / Codec 8 Extended" : "Codec 8");
    const firmwareVersion = device.firmwareVersion || (isFmc130 ? "03.28.03.Rev.02" : "03.28.02.Rev.00");
    const ignitionSource = device.ignitionSource || "DIN1";
    const ignitionHighThreshold = device.ignitionHighThreshold ?? 13.2;
    const ignitionLowThreshold = device.ignitionLowThreshold ?? 12.8;
    const ignitionRpmThreshold = device.ignitionRpmThreshold ?? 400;
    const telemetryProfileStr = typeof device.telemetryProfile === "object"
      ? JSON.stringify(device.telemetryProfile)
      : (device.telemetryProfile || "{}");

    await this.db.execute(
      `INSERT INTO registered_devices
       (id, imei, manufacturer, model, protocol, codec, org_id, vehicle_id, status, firmware_version, sim_carrier, reporting_interval_sec,
        ignition_source, ignition_high_threshold, ignition_low_threshold, ignition_rpm_threshold, telemetry_profile, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
      [
        id,
        rawImei,
        device.manufacturer || "Teltonika",
        model,
        protocol,
        codec,
        device.orgId,
        device.vehicleId || null,
        device.status || "active",
        firmwareVersion,
        device.simCarrier || "e& (Etisalat) UAE",
        device.reportingIntervalSec || 60,
        ignitionSource,
        ignitionHighThreshold,
        ignitionLowThreshold,
        ignitionRpmThreshold,
        telemetryProfileStr,
        now,
        now,
      ]
    );

    const created = await this.findById(id);
    if (!created) throw new Error("Failed to create device");
    return created;
  }

  async update(id: string, updates: Partial<{
    vehicleId: string | null;
    status: "active" | "disabled" | "revoked";
    model: string;
    protocol: string;
    codec: string;
    firmwareVersion: string;
    reportingIntervalSec: number;
    simCarrier: string;
    ignitionSource: string;
    ignitionHighThreshold: number;
    ignitionLowThreshold: number;
    ignitionRpmThreshold: number;
    telemetryProfile: any;
  }>): Promise<RegisteredDevice | null> {
    const fields: string[] = [];
    const params: unknown[] = [];
    let pIdx = 1;

    if (updates.vehicleId !== undefined) {
      fields.push(`vehicle_id = $${pIdx++}`);
      params.push(updates.vehicleId);
    }

    if (updates.status !== undefined) {
      fields.push(`status = $${pIdx++}`);
      params.push(updates.status);
    }

    if (updates.model !== undefined) {
      fields.push(`model = $${pIdx++}`);
      params.push(updates.model);
    }

    if (updates.protocol !== undefined) {
      fields.push(`protocol = $${pIdx++}`);
      params.push(updates.protocol);
    }

    if (updates.codec !== undefined) {
      fields.push(`codec = $${pIdx++}`);
      params.push(updates.codec);
    }

    if (updates.firmwareVersion !== undefined) {
      fields.push(`firmware_version = $${pIdx++}`);
      params.push(updates.firmwareVersion);
    }

    if (updates.reportingIntervalSec !== undefined) {
      fields.push(`reporting_interval_sec = $${pIdx++}`);
      params.push(updates.reportingIntervalSec);
    }

    if (updates.simCarrier !== undefined) {
      fields.push(`sim_carrier = $${pIdx++}`);
      params.push(updates.simCarrier);
    }

    if (updates.ignitionSource !== undefined) {
      fields.push(`ignition_source = $${pIdx++}`);
      params.push(updates.ignitionSource);
    }

    if (updates.ignitionHighThreshold !== undefined) {
      fields.push(`ignition_high_threshold = $${pIdx++}`);
      params.push(updates.ignitionHighThreshold);
    }

    if (updates.ignitionLowThreshold !== undefined) {
      fields.push(`ignition_low_threshold = $${pIdx++}`);
      params.push(updates.ignitionLowThreshold);
    }

    if (updates.ignitionRpmThreshold !== undefined) {
      fields.push(`ignition_rpm_threshold = $${pIdx++}`);
      params.push(updates.ignitionRpmThreshold);
    }

    if (updates.telemetryProfile !== undefined) {
      fields.push(`telemetry_profile = $${pIdx++}`);
      params.push(
        typeof updates.telemetryProfile === "object"
          ? JSON.stringify(updates.telemetryProfile)
          : updates.telemetryProfile
      );
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`updated_at = $${pIdx++}`);
    params.push(new Date().toISOString());

    params.push(id);
    await this.db.execute(
      `UPDATE registered_devices SET ${fields.join(", ")} WHERE id = $${pIdx}`,
      params
    );

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const res = await this.db.execute(`DELETE FROM registered_devices WHERE id = $1`, [id]);
    return res.affectedRows > 0;
  }

  async updateLastConnection(deviceId: string, timestamp: Date): Promise<void> {
    await this.db.execute(
      `UPDATE registered_devices SET last_connection_at = $1 WHERE id = $2`,
      [timestamp.toISOString(), deviceId]
    );
  }

  async updateLastCommunication(deviceId: string, timestamp: Date): Promise<void> {
    await this.db.execute(
      `UPDATE registered_devices SET last_communication_at = $1 WHERE id = $2`,
      [timestamp.toISOString(), deviceId]
    );
  }
}

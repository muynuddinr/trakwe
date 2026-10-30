import { AvlRecord, TelemetryProperties } from "../../protocol/teltonika-types";
import { getDatabase, IDatabaseClient } from "../db";

export interface LatestTelemetrySnapshot {
  device_id: string;
  vehicle_id: string | null;
  imei: string;
  device_timestamp: string;
  server_timestamp: string;
  lat: number;
  lng: number;
  altitude: number;
  angle: number;
  speed: number;
  satellites: number;
  ignition: "ON" | "OFF" | "Unknown";
  movement: "Moving" | "Stationary" | "Unknown";
  external_voltage: number | null;
  internal_battery_voltage: number | null;
  gsm_signal: number | null;
  odometer_km?: number | null;
  fuel_level?: number | null;
  fuel_used_liters?: number | null;
  engine_rpm?: number | null;
  engine_temp?: number | null;
  din1?: number | null;
  din2?: number | null;
  din3?: number | null;
  ain1_mv?: number | null;
  ain2_mv?: number | null;
  io_elements?: any;
  raw_payload_hex: string | null;
  updated_at: string;
  // Joined fields
  vehicle_registration?: string;
  driver?: string;
}

export interface HistoricalTelemetryRecord {
  id: string;
  device_id: string;
  vehicle_id: string | null;
  org_id: string;
  device_timestamp: string;
  server_timestamp: string;
  priority: number;
  lat: number;
  lng: number;
  altitude: number;
  angle: number;
  speed: number;
  satellites: number;
  ignition: "ON" | "OFF" | "Unknown";
  movement: "Moving" | "Stationary" | "Unknown";
  external_voltage: number | null;
  internal_battery_voltage: number | null;
  gsm_signal: number | null;
  odometer_km?: number | null;
  fuel_level?: number | null;
  fuel_used_liters?: number | null;
  engine_rpm?: number | null;
  engine_temp?: number | null;
  din1?: number | null;
  din2?: number | null;
  din3?: number | null;
  ain1_mv?: number | null;
  ain2_mv?: number | null;
  io_elements: string | null;
  codec_id: string;
  raw_payload_hex: string | null;
  // Joined fields
  vehicle_registration?: string;
  driver?: string;
}

export interface IgnitionEventRecord {
  id: string;
  device_id: string;
  vehicle_id: string | null;
  org_id: string;
  event_type: "IGNITION_ON" | "IGNITION_OFF";
  timestamp: string;
  server_timestamp: string;
  lat: number | null;
  lng: number | null;
  external_voltage: number | null;
  vehicle_registration?: string;
  driver?: string;
}

export interface IgnitionSummary {
  verifiedOnCount: number;
  verifiedOffCount: number;
  staleOrUnknownCount: number;
  totalMonitored: number;
  staleThresholdMinutes: number;
  vehicles: Array<{
    vehicleId: string;
    vehicleReg: string;
    deviceId: string;
    driver: string;
    status: "ON" | "OFF" | "Stale" | "Unknown";
    lastEventTime: string | null;
    serverTime: string | null;
    batteryVoltage: number | null;
    isStale: boolean;
  }>;
}

export class TelemetryRepository {
  constructor(private db: IDatabaseClient = getDatabase()) {}

  /**
   * Persists a batch of parsed AVL records in a transaction:
   * 1. Inserts into historical_telemetry (deduplicating by device_id + device_timestamp)
   * 2. Detects ignition state changes and inserts into ignition_events
   * 3. Updates device_latest_telemetry snapshot if newer than existing snapshot
   */
  async persistBatch(
    deviceId: string,
    imei: string,
    vehicleId: string | null,
    orgId: string,
    records: AvlRecord[],
    codecId: number,
    rawHex: string
  ): Promise<{ accepted: number; duplicates: number }> {
    if (records.length === 0) return { accepted: 0, duplicates: 0 };

    return this.db.transaction(async (tx) => {
      let accepted = 0;
      let duplicates = 0;

      // Fetch latest snapshot to check for ignition transitions and timestamp ordering
      const currentSnapshotRows = await tx.query<LatestTelemetrySnapshot>(
        `SELECT * FROM device_latest_telemetry WHERE device_id = $1 LIMIT 1`,
        [deviceId]
      );
      let lastSnapshot = currentSnapshotRows[0] ?? null;

      // Sort records chronologically
      const sorted = [...records].sort((a, b) => a.timestampMs - b.timestampMs);

      for (const rec of sorted) {
        const deviceTimeIso = rec.timestamp.toISOString();
        const serverTimeIso = new Date().toISOString();
        const recordId = `rec-${deviceId}-${rec.timestampMs}`;

        const props = rec.properties as TelemetryProperties;
        const ioElementsJson = JSON.stringify(rec.ioElements, (_, v) =>
          typeof v === "bigint" ? v.toString() : v
        );

        // Attempt idempotent insert into historical_telemetry
        try {
          const insertResult = await tx.execute(
            `INSERT INTO historical_telemetry
             (id, device_id, vehicle_id, org_id, device_timestamp, server_timestamp, priority,
              lat, lng, altitude, angle, speed, satellites, ignition, movement,
              external_voltage, internal_battery_voltage, gsm_signal, io_elements, codec_id, raw_payload_hex,
              odometer_km, fuel_level, fuel_used_liters, engine_rpm, engine_temp, din1, din2, din3, ain1_mv, ain2_mv)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31)`,
            [
              recordId,
              deviceId,
              vehicleId,
              orgId,
              deviceTimeIso,
              serverTimeIso,
              rec.priority,
              rec.gps.latitude,
              rec.gps.longitude,
              rec.gps.altitude,
              rec.gps.angle,
              rec.gps.speed,
              rec.gps.satellites,
              props.ignition,
              props.movement,
              props.externalVoltage,
              props.internalBatteryVoltage,
              props.gsmSignal,
              ioElementsJson,
              `0x${codecId.toString(16).padStart(2, "0")}`,
              rawHex,
              props.odometerKm ?? null,
              props.fuelLevel ?? null,
              props.fuelUsedLiters ?? null,
              props.engineRpm ?? null,
              props.engineTemp ?? null,
              props.din1 ?? null,
              props.din2 ?? null,
              props.din3 ?? null,
              props.ain1Mv ?? null,
              props.ain2Mv ?? null,
            ]
          );

          if (insertResult.affectedRows > 0) {
            accepted++;

            // Detect Ignition Transition
            if (
              props.ignition !== "Unknown" &&
              (!lastSnapshot || lastSnapshot.ignition !== props.ignition)
            ) {
              const eventType = props.ignition === "ON" ? "IGNITION_ON" : "IGNITION_OFF";
              const ignEventId = `ign-${deviceId}-${rec.timestampMs}`;
              await tx.execute(
                `INSERT INTO ignition_events
                 (id, device_id, vehicle_id, org_id, event_type, timestamp, server_timestamp, lat, lng, external_voltage)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [
                  ignEventId,
                  deviceId,
                  vehicleId,
                  orgId,
                  eventType,
                  deviceTimeIso,
                  serverTimeIso,
                  rec.gps.latitude,
                  rec.gps.longitude,
                  props.externalVoltage,
                ]
              );
            }

            // Update snapshot if newer
            if (!lastSnapshot || new Date(deviceTimeIso).getTime() >= new Date(lastSnapshot.device_timestamp).getTime()) {
              await tx.execute(
                `INSERT INTO device_latest_telemetry
                 (device_id, vehicle_id, imei, device_timestamp, server_timestamp, lat, lng, altitude, angle, speed, satellites,
                  ignition, movement, external_voltage, internal_battery_voltage, gsm_signal, raw_payload_hex, updated_at,
                  odometer_km, fuel_level, fuel_used_liters, engine_rpm, engine_temp, din1, din2, din3, ain1_mv, ain2_mv, io_elements)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)
                 ON CONFLICT(device_id) DO UPDATE SET
                   vehicle_id = excluded.vehicle_id,
                   imei = excluded.imei,
                   device_timestamp = excluded.device_timestamp,
                   server_timestamp = excluded.server_timestamp,
                   lat = excluded.lat,
                   lng = excluded.lng,
                   altitude = excluded.altitude,
                   angle = excluded.angle,
                   speed = excluded.speed,
                   satellites = excluded.satellites,
                   ignition = excluded.ignition,
                   movement = excluded.movement,
                   external_voltage = excluded.external_voltage,
                   internal_battery_voltage = excluded.internal_battery_voltage,
                   gsm_signal = excluded.gsm_signal,
                   raw_payload_hex = excluded.raw_payload_hex,
                   updated_at = excluded.updated_at,
                   odometer_km = excluded.odometer_km,
                   fuel_level = excluded.fuel_level,
                   fuel_used_liters = excluded.fuel_used_liters,
                   engine_rpm = excluded.engine_rpm,
                   engine_temp = excluded.engine_temp,
                   din1 = excluded.din1,
                   din2 = excluded.din2,
                   din3 = excluded.din3,
                   ain1_mv = excluded.ain1_mv,
                   ain2_mv = excluded.ain2_mv,
                   io_elements = excluded.io_elements`,
                [
                  deviceId,
                  vehicleId,
                  imei,
                  deviceTimeIso,
                  serverTimeIso,
                  rec.gps.latitude,
                  rec.gps.longitude,
                  rec.gps.altitude,
                  rec.gps.angle,
                  rec.gps.speed,
                  rec.gps.satellites,
                  props.ignition,
                  props.movement,
                  props.externalVoltage,
                  props.internalBatteryVoltage,
                  props.gsmSignal,
                  rawHex,
                  serverTimeIso,
                  props.odometerKm ?? null,
                  props.fuelLevel ?? null,
                  props.fuelUsedLiters ?? null,
                  props.engineRpm ?? null,
                  props.engineTemp ?? null,
                  props.din1 ?? null,
                  props.din2 ?? null,
                  props.din3 ?? null,
                  props.ain1Mv ?? null,
                  props.ain2Mv ?? null,
                  ioElementsJson,
                ]
              );

              lastSnapshot = {
                device_id: deviceId,
                vehicle_id: vehicleId,
                imei,
                device_timestamp: deviceTimeIso,
                server_timestamp: serverTimeIso,
                lat: rec.gps.latitude,
                lng: rec.gps.longitude,
                altitude: rec.gps.altitude,
                angle: rec.gps.angle,
                speed: rec.gps.speed,
                satellites: rec.gps.satellites,
                ignition: props.ignition,
                movement: props.movement,
                external_voltage: props.externalVoltage,
                internal_battery_voltage: props.internalBatteryVoltage,
                gsm_signal: props.gsmSignal,
                odometer_km: props.odometerKm ?? null,
                fuel_level: props.fuelLevel ?? null,
                fuel_used_liters: props.fuelUsedLiters ?? null,
                engine_rpm: props.engineRpm ?? null,
                engine_temp: props.engineTemp ?? null,
                din1: props.din1 ?? null,
                din2: props.din2 ?? null,
                din3: props.din3 ?? null,
                ain1_mv: props.ain1Mv ?? null,
                ain2_mv: props.ain2Mv ?? null,
                io_elements: ioElementsJson,
                raw_payload_hex: rawHex,
                updated_at: serverTimeIso,
              };
            }
          } else {
            duplicates++;
          }
        } catch (err: any) {
          // Check for unique constraint violation (duplicate device_id + timestamp)
          if (err.message && (err.message.includes("UNIQUE") || err.message.includes("duplicate key"))) {
            duplicates++;
          } else {
            throw err;
          }
        }
      }

      return { accepted, duplicates };
    });
  }

  async getLatestSnapshot(deviceId: string): Promise<LatestTelemetrySnapshot | null> {
    const rows = await this.db.query<LatestTelemetrySnapshot>(
      `SELECT t.*, v.registration as vehicle_registration, v.driver
       FROM device_latest_telemetry t
       LEFT JOIN vehicles v ON t.vehicle_id = v.id
       WHERE t.device_id = $1 LIMIT 1`,
      [deviceId]
    );
    return rows[0] ?? null;
  }

  async listHistorical(filter: {
    orgId?: string;
    vehicleId?: string;
    deviceId?: string;
    limit?: number;
    offset?: number;
  }): Promise<HistoricalTelemetryRecord[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let pIdx = 1;

    if (filter.orgId && filter.orgId !== "platform") {
      conditions.push(`h.org_id = $${pIdx++}`);
      params.push(filter.orgId);
    }
    if (filter.vehicleId && filter.vehicleId !== "All") {
      conditions.push(`h.vehicle_id = $${pIdx++}`);
      params.push(filter.vehicleId);
    }
    if (filter.deviceId && filter.deviceId !== "All") {
      conditions.push(`h.device_id = $${pIdx++}`);
      params.push(filter.deviceId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const limit = Math.max(1, Math.min(100, filter.limit ?? 25));
    const offset = Math.max(0, filter.offset ?? 0);

    const sql = `
      SELECT h.*, v.registration as vehicle_registration, v.driver
      FROM historical_telemetry h
      LEFT JOIN vehicles v ON h.vehicle_id = v.id
      ${whereClause}
      ORDER BY h.device_timestamp DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return this.db.query<HistoricalTelemetryRecord>(sql, params);
  }

  async countHistorical(filter: {
    orgId?: string;
    vehicleId?: string;
    deviceId?: string;
  }): Promise<number> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let pIdx = 1;

    if (filter.orgId && filter.orgId !== "platform") {
      conditions.push(`h.org_id = $${pIdx++}`);
      params.push(filter.orgId);
    }
    if (filter.vehicleId && filter.vehicleId !== "All") {
      conditions.push(`h.vehicle_id = $${pIdx++}`);
      params.push(filter.vehicleId);
    }
    if (filter.deviceId && filter.deviceId !== "All") {
      conditions.push(`h.device_id = $${pIdx++}`);
      params.push(filter.deviceId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const sql = `
      SELECT COUNT(*) as count
      FROM historical_telemetry h
      ${whereClause}
    `;

    const rows = await this.db.query<{ count: number | string }>(queryClean(sql), params);
    return Number(rows[0]?.count ?? 0);
  }

  /**
   * Evaluates verified ignition status with documented stale data threshold.
   * Stale threshold: 10 minutes (600 seconds).
   * A disconnected device is NOT automatically OFF; if older than threshold, marked Stale/Unknown.
   */
  async getIgnitionSummary(orgId?: string, staleThresholdMinutes = 10): Promise<IgnitionSummary> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let pIdx = 1;

    if (orgId && orgId !== "platform") {
      conditions.push(`d.org_id = $${pIdx++}`);
      params.push(orgId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT
        d.id as device_id,
        d.vehicle_id,
        COALESCE(v.registration, 'Unassigned') as vehicle_registration,
        COALESCE(v.driver, 'Unassigned') as driver,
        t.ignition,
        t.device_timestamp,
        t.server_timestamp,
        t.external_voltage
      FROM registered_devices d
      LEFT JOIN vehicles v ON d.vehicle_id = v.id
      LEFT JOIN device_latest_telemetry t ON d.id = t.device_id
      ${whereClause}
    `;

    const rows = await this.db.query<any>(query, params);
    const now = Date.now();
    const staleThresholdMs = staleThresholdMinutes * 60 * 1000;

    let verifiedOnCount = 0;
    let verifiedOffCount = 0;
    let staleOrUnknownCount = 0;

    const vehicles = rows.map((r) => {
      const ts = r.device_timestamp ? new Date(r.device_timestamp).getTime() : 0;
      const isStale = ts === 0 || now - ts > staleThresholdMs;

      let status: "ON" | "OFF" | "Stale" | "Unknown" = "Unknown";
      if (!r.ignition || r.ignition === "Unknown") {
        status = "Unknown";
        staleOrUnknownCount++;
      } else if (isStale) {
        status = "Stale";
        staleOrUnknownCount++;
      } else if (r.ignition === "ON") {
        status = "ON";
        verifiedOnCount++;
      } else if (r.ignition === "OFF") {
        status = "OFF";
        verifiedOffCount++;
      }

      return {
        vehicleId: r.vehicle_id || "",
        vehicleReg: r.vehicle_registration,
        deviceId: r.device_id,
        driver: r.driver,
        status,
        lastEventTime: r.device_timestamp || null,
        serverTime: r.server_timestamp || null,
        batteryVoltage: r.external_voltage || null,
        isStale,
      };
    });

    return {
      verifiedOnCount,
      verifiedOffCount,
      staleOrUnknownCount,
      totalMonitored: rows.length,
      staleThresholdMinutes,
      vehicles,
    };
  }

  async listIgnitionEvents(filter: {
    orgId?: string;
    vehicleId?: string;
    limit?: number;
    offset?: number;
  }): Promise<IgnitionEventRecord[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let pIdx = 1;

    if (filter.orgId && filter.orgId !== "platform") {
      conditions.push(`e.org_id = $${pIdx++}`);
      params.push(filter.orgId);
    }
    if (filter.vehicleId && filter.vehicleId !== "All") {
      conditions.push(`e.vehicle_id = $${pIdx++}`);
      params.push(filter.vehicleId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const limit = Math.max(1, Math.min(100, filter.limit ?? 25));
    const offset = Math.max(0, filter.offset ?? 0);

    const query = `
      SELECT e.*, v.registration as vehicle_registration, v.driver
      FROM ignition_events e
      LEFT JOIN vehicles v ON e.vehicle_id = v.id
      ${whereClause}
      ORDER BY e.timestamp DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return this.db.query<IgnitionEventRecord>(query, params);
  }
}

function queryClean(sql: string): string {
  return sql.trim();
}

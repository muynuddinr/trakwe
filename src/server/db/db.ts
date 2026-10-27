import fs from "node:fs";
import path from "node:path";
import { Pool, PoolClient } from "pg";

export interface DatabaseHealth {
  ok: boolean;
  type: "postgres" | "sqlite";
  latencyMs: number;
  databaseName?: string;
  error?: string;
}

export interface IDatabaseClient {
  query<T = any>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<{ affectedRows: number; insertId?: string | number }>;
  transaction<T>(fn: (client: IDatabaseClient) => Promise<T>): Promise<T>;
  checkHealth(): Promise<DatabaseHealth>;
  close(): Promise<void>;
}

// -------------------------------------------------------------
// SQLite Implementation (Zero-dependency local & testing engine)
// -------------------------------------------------------------
class SqliteDatabaseClient implements IDatabaseClient {
  private db: any;
  private isMemory: boolean;

  constructor(dbPath: string) {
    this.isMemory = dbPath === ":memory:";
    if (!this.isMemory) {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    // Use Node.js built-in node:sqlite DatabaseSync
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DatabaseSync } = require("node:sqlite");
    this.db = new DatabaseSync(dbPath);
    this.initializeSchema();
  }

  private initializeSchema() {
    this.db.exec("PRAGMA foreign_keys = ON;");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS organizations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL,
        org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS vehicles (
        id TEXT PRIMARY KEY,
        registration TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        vehicle_type TEXT NOT NULL,
        org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        driver TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS registered_devices (
        id TEXT PRIMARY KEY,
        imei TEXT UNIQUE NOT NULL,
        manufacturer TEXT NOT NULL DEFAULT 'Teltonika',
        model TEXT NOT NULL DEFAULT 'Teltonika FMC920',
        protocol TEXT NOT NULL DEFAULT 'Teltonika Codec 8 / 8E',
        codec TEXT NOT NULL DEFAULT 'Codec 8',
        org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        vehicle_id TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
        status TEXT NOT NULL DEFAULT 'active',
        firmware_version TEXT DEFAULT '03.28.02.Rev.00',
        sim_carrier TEXT DEFAULT 'e& (Etisalat) UAE',
        reporting_interval_sec INTEGER NOT NULL DEFAULT 60,
        last_connection_at TEXT,
        last_communication_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_devices_imei ON registered_devices(imei);
      CREATE INDEX IF NOT EXISTS idx_devices_org ON registered_devices(org_id);
      CREATE INDEX IF NOT EXISTS idx_devices_veh ON registered_devices(vehicle_id);

      CREATE TABLE IF NOT EXISTS device_sessions (
        id TEXT PRIMARY KEY,
        device_id TEXT NOT NULL REFERENCES registered_devices(id) ON DELETE CASCADE,
        imei TEXT NOT NULL,
        remote_ip TEXT NOT NULL,
        remote_port INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        connected_at TEXT NOT NULL DEFAULT (datetime('now')),
        disconnected_at TEXT,
        packets_received INTEGER NOT NULL DEFAULT 0,
        records_received INTEGER NOT NULL DEFAULT 0,
        bytes_received INTEGER NOT NULL DEFAULT 0,
        disconnect_reason TEXT
      );

      CREATE TABLE IF NOT EXISTS device_latest_telemetry (
        device_id TEXT PRIMARY KEY REFERENCES registered_devices(id) ON DELETE CASCADE,
        vehicle_id TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
        imei TEXT NOT NULL,
        device_timestamp TEXT NOT NULL,
        server_timestamp TEXT NOT NULL DEFAULT (datetime('now')),
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        altitude INTEGER NOT NULL DEFAULT 0,
        angle INTEGER NOT NULL DEFAULT 0,
        speed INTEGER NOT NULL DEFAULT 0,
        satellites INTEGER NOT NULL DEFAULT 0,
        ignition TEXT NOT NULL DEFAULT 'Unknown',
        movement TEXT NOT NULL DEFAULT 'Stationary',
        external_voltage REAL,
        internal_battery_voltage REAL,
        gsm_signal INTEGER,
        raw_payload_hex TEXT,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS historical_telemetry (
        id TEXT PRIMARY KEY,
        device_id TEXT NOT NULL REFERENCES registered_devices(id) ON DELETE CASCADE,
        vehicle_id TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
        org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        device_timestamp TEXT NOT NULL,
        server_timestamp TEXT NOT NULL DEFAULT (datetime('now')),
        priority INTEGER NOT NULL DEFAULT 0,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        altitude INTEGER NOT NULL DEFAULT 0,
        angle INTEGER NOT NULL DEFAULT 0,
        speed INTEGER NOT NULL DEFAULT 0,
        satellites INTEGER NOT NULL DEFAULT 0,
        ignition TEXT NOT NULL DEFAULT 'Unknown',
        movement TEXT NOT NULL DEFAULT 'Stationary',
        external_voltage REAL,
        internal_battery_voltage REAL,
        gsm_signal INTEGER,
        io_elements TEXT,
        codec_id TEXT NOT NULL DEFAULT '0x08',
        raw_payload_hex TEXT,
        UNIQUE (device_id, device_timestamp)
      );

      CREATE INDEX IF NOT EXISTS idx_hist_device_time ON historical_telemetry(device_id, device_timestamp);
      CREATE INDEX IF NOT EXISTS idx_hist_org_time ON historical_telemetry(org_id, device_timestamp);
      CREATE INDEX IF NOT EXISTS idx_hist_veh_time ON historical_telemetry(vehicle_id, device_timestamp);

      CREATE TABLE IF NOT EXISTS ignition_events (
        id TEXT PRIMARY KEY,
        device_id TEXT NOT NULL REFERENCES registered_devices(id) ON DELETE CASCADE,
        vehicle_id TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
        org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        server_timestamp TEXT NOT NULL DEFAULT (datetime('now')),
        lat REAL,
        lng REAL,
        external_voltage REAL
      );

      CREATE INDEX IF NOT EXISTS idx_ign_events_veh ON ignition_events(vehicle_id, timestamp);

      CREATE TABLE IF NOT EXISTS device_communication_logs (
        id TEXT PRIMARY KEY,
        device_id TEXT REFERENCES registered_devices(id) ON DELETE SET NULL,
        imei TEXT,
        vehicle_id TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
        org_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
        event_type TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'INFO',
        message TEXT NOT NULL,
        packet_ref TEXT,
        details TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS packet_parsing_errors (
        id TEXT PRIMARY KEY,
        device_id TEXT REFERENCES registered_devices(id) ON DELETE SET NULL,
        imei TEXT,
        remote_ip TEXT,
        error_type TEXT NOT NULL,
        error_message TEXT NOT NULL,
        raw_hex TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS ingestion_stats (
        metric_key TEXT PRIMARY KEY,
        metric_value INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    this.seedFleetContext();
  }

  private seedFleetContext() {
    // Seed standard organizations and vehicles if none exist so device registration can link to existing fleet
    const orgCheck = this.db.prepare("SELECT COUNT(*) as count FROM organizations").get();
    if (orgCheck && (orgCheck as any).count === 0) {
      this.db.exec(`
        INSERT INTO organizations (id, name) VALUES
          ('platform', 'Trackwe Global Platform'),
          ('org-dubai', 'Dubai Logistics Fleet'),
          ('org-emirates', 'Emirates Express Cargo'),
          ('org-capital', 'Abu Dhabi Premier Transit');

        INSERT INTO users (id, name, email, role, org_id) VALUES
          ('account-super', 'Moin', 'superadmin@trackwe.demo', 'Super Admin', 'platform'),
          ('account-admin', 'Ahmed Ali', 'admin@trackwe.demo', 'Admin', 'org-dubai'),
          ('account-manager', 'Sara Khalid', 'manager@trackwe.demo', 'Manager', 'org-dubai'),
          ('account-employee', 'Omar Hassan', 'employee@trackwe.demo', 'Employee', 'org-dubai');

        INSERT INTO vehicles (id, registration, name, vehicle_type, org_id, driver) VALUES
          ('v1', 'Dubai A 10243', 'Dubai Urban Van 01', 'Van', 'org-dubai', 'Rashid Al-Nuaimi'),
          ('v2', 'Dubai B 28491', 'Jebel Ali Heavy Hauler', 'Truck', 'org-dubai', 'Tariq Mansoor'),
          ('v3', 'Dubai C 39201', 'Deira Express Sprinter', 'Van', 'org-dubai', 'Zayed Farooq'),
          ('v4', 'Dubai D 44102', 'Downtown Reefer 04', 'Reefer', 'org-dubai', 'Hamad Qasim'),
          ('v5', 'Abu Dhabi B 40591', 'Capital Heavy Logistics', 'Truck', 'org-capital', 'Sultan Al-Dhaheri');

        INSERT OR IGNORE INTO registered_devices
          (id, imei, manufacturer, model, protocol, codec, org_id, vehicle_id, status, firmware_version, sim_carrier, reporting_interval_sec)
        VALUES
          ('dev-fmc920-01', '864022089340664', 'Teltonika', 'FMC920', 'Teltonika TCP AVL', 'Codec 8 / Codec 8 Extended', 'org-dubai', 'v1', 'active', '03.28.02.Rev.00', 'e& (Etisalat) UAE', 60);
      `);
    }
  }

  private convertPlaceholders(sql: string): string {
    // Convert $1, $2, ... to ? for SQLite
    return sql.replace(/\$\d+/g, "?");
  }

  async query<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
    const sqliteSql = this.convertPlaceholders(sql);
    const stmt = this.db.prepare(sqliteSql);
    const rows = stmt.all(...params) as T[];
    return rows;
  }

  async execute(sql: string, params: unknown[] = []): Promise<{ affectedRows: number; insertId?: string | number }> {
    const sqliteSql = this.convertPlaceholders(sql);
    const stmt = this.db.prepare(sqliteSql);
    const info = stmt.run(...params);
    return {
      affectedRows: Number(info.changes),
      insertId: info.lastInsertRowid,
    };
  }

  async transaction<T>(fn: (client: IDatabaseClient) => Promise<T>): Promise<T> {
    this.db.exec("BEGIN TRANSACTION;");
    try {
      const result = await fn(this);
      this.db.exec("COMMIT;");
      return result;
    } catch (err) {
      this.db.exec("ROLLBACK;");
      throw err;
    }
  }

  async checkHealth(): Promise<DatabaseHealth> {
    const start = Date.now();
    try {
      this.db.prepare("SELECT 1 as ping").get();
      return {
        ok: true,
        type: "sqlite",
        latencyMs: Date.now() - start,
        databaseName: this.isMemory ? "in-memory-sqlite" : "local-sqlite",
      };
    } catch (err: any) {
      return {
        ok: false,
        type: "sqlite",
        latencyMs: Date.now() - start,
        error: err.message,
      };
    }
  }

  async close(): Promise<void> {
    try {
      this.db.close();
    } catch {
      // ignore
    }
  }
}

// -------------------------------------------------------------
// PostgreSQL Implementation (Production multi-tenant database)
// -------------------------------------------------------------
class PostgresDatabaseClient implements IDatabaseClient {
  private pool: Pool;
  private connectionString: string;

  constructor(connectionString: string) {
    this.connectionString = connectionString;
    this.pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }

  async query<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
    const res = await this.pool.query(sql, params);
    return res.rows as T[];
  }

  async execute(sql: string, params: unknown[] = []): Promise<{ affectedRows: number; insertId?: string | number }> {
    const res = await this.pool.query(sql, params);
    return {
      affectedRows: res.rowCount ?? 0,
    };
  }

  async transaction<T>(fn: (client: IDatabaseClient) => Promise<T>): Promise<T> {
    const client: PoolClient = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const clientWrapper: IDatabaseClient = {
        query: async <R = any>(sql: string, params: unknown[] = []) => {
          const res = await client.query(sql, params);
          return res.rows as R[];
        },
        execute: async (sql: string, params: unknown[] = []) => {
          const res = await client.query(sql, params);
          return { affectedRows: res.rowCount ?? 0 };
        },
        transaction: () => {
          throw new Error("Nested transactions are not supported");
        },
        checkHealth: () => this.checkHealth(),
        close: async () => {},
      };

      const result = await fn(clientWrapper);
      await client.query("COMMIT");
      return result;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async checkHealth(): Promise<DatabaseHealth> {
    const start = Date.now();
    try {
      await this.pool.query("SELECT 1 as ping");
      return {
        ok: true,
        type: "postgres",
        latencyMs: Date.now() - start,
        databaseName: "PostgreSQL Database",
      };
    } catch (err: any) {
      return {
        ok: false,
        type: "postgres",
        latencyMs: Date.now() - start,
        error: err.message,
      };
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

// Global Singleton
let dbInstance: IDatabaseClient | null = null;

export function getDatabase(): IDatabaseClient {
  if (dbInstance) {
    return dbInstance;
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl && databaseUrl.startsWith("postgres")) {
    dbInstance = new PostgresDatabaseClient(databaseUrl);
  } else {
    // Default to resilient local SQLite database
    const dbFilePath = process.env.SQLITE_DB_PATH || path.resolve(process.cwd(), ".data", "telematics.db");
    dbInstance = new SqliteDatabaseClient(dbFilePath);
  }

  return dbInstance;
}

export function resetDatabaseInstanceForTesting(inMemory = true): IDatabaseClient {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {}
  }
  dbInstance = new SqliteDatabaseClient(inMemory ? ":memory:" : path.resolve(process.cwd(), ".data", "test.db"));
  return dbInstance;
}

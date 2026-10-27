import { getDatabase, IDatabaseClient } from "../db";

export interface DeviceSession {
  id: string;
  device_id: string;
  imei: string;
  remote_ip: string;
  remote_port: number;
  status: "active" | "closed" | "rejected";
  connected_at: string;
  disconnected_at: string | null;
  packets_received: number;
  records_received: number;
  bytes_received: number;
  disconnect_reason: string | null;
}

export class SessionRepository {
  constructor(private db: IDatabaseClient = getDatabase()) {}

  async createSession(session: {
    id: string;
    deviceId: string;
    imei: string;
    remoteIp: string;
    remotePort: number;
    status?: "active" | "rejected";
    disconnectReason?: string;
  }): Promise<void> {
    const now = new Date().toISOString();
    await this.db.execute(
      `INSERT INTO device_sessions
       (id, device_id, imei, remote_ip, remote_port, status, connected_at, packets_received, records_received, bytes_received, disconnect_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0, 0, $8)`,
      [
        session.id,
        session.deviceId,
        session.imei,
        session.remoteIp,
        session.remotePort,
        session.status || "active",
        now,
        session.disconnectReason || null,
      ]
    );
  }

  async closeSession(id: string, reason?: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.execute(
      `UPDATE device_sessions SET status = 'closed', disconnected_at = $1, disconnect_reason = $2 WHERE id = $3`,
      [now, reason || "Normal termination", id]
    );
  }

  async recordPacket(id: string, recordsCount: number, bytesCount: number): Promise<void> {
    await this.db.execute(
      `UPDATE device_sessions
       SET packets_received = packets_received + 1,
           records_received = records_received + $1,
           bytes_received = bytes_received + $2
       WHERE id = $3`,
      [recordsCount, bytesCount, id]
    );
  }

  async getActiveSessions(): Promise<DeviceSession[]> {
    return this.db.query<DeviceSession>(
      `SELECT * FROM device_sessions WHERE status = 'active' ORDER BY connected_at DESC`
    );
  }

  async getSessionById(id: string): Promise<DeviceSession | null> {
    const rows = await this.db.query<DeviceSession>(`SELECT * FROM device_sessions WHERE id = $1 LIMIT 1`, [id]);
    return rows[0] ?? null;
  }
}

# Trackwe — Teltonika FMC920 Backend Integration Guide

## 1. Architecture & Telematics Data Flow

Trackwe decouples high-throughput raw TCP socket ingestion from dashboard query serving. Teltonika FMC920 GPS trackers communicate over low-level TCP/IP using proprietary binary frames (Codec 8 / Codec 8 Extended) and cannot communicate via HTTP/REST JSON endpoints.

```
┌─────────────────────────────────┐
│   Teltonika FMC920 GPS Tracker  │
│  (Installed in Fleet Vehicle)   │
└────────────────┬────────────────┘
                 │
                 │ 1. TCP Connection to Public IP:Port (5027)
                 │ 2. Phase 1 Handshake: [Length 2B] + [ASCII IMEI]
                 ▼
┌────────────────────────────────────────────────────────┐
│     Dedicated FMC920 TCP Ingestion Service             │
│   (Node.js Net Socket Server · scripts/fmc920-service) │
│                                                        │
│  • Validates IMEI against registered_devices           │
│  • Handshake Response: 0x01 (Accept) or 0x00 (Reject)   │
│  • Stream Buffer Accumulator (handles chunked packets) │
│  • Binary Parser: Codec 8 (0x08) & Codec 8E (0x8E)    │
│  • CRC-16/IBM Checksum Verification (0xA001)           │
│  • AVL I/O Extraction (Ignition, Voltages, GSM, GPS)   │
│  • Sends 4-Byte Big-Endian ACK ONLY AFTER Commit       │
└────────────────┬───────────────────────────────────────┘
                 │
                 │ Durable Transactional Persistence
                 ▼
┌────────────────────────────────────────────────────────┐
│   Database Layer (PostgreSQL / Embedded SQLite)        │
│                                                        │
│  • registered_devices (Tenant-isolated registry)       │
│  • device_latest_telemetry (Latest GPS snapshot)       │
│  • historical_telemetry (Idempotent immutable records) │
│  • ignition_events (ACC state transition ledger)       │
│  • device_sessions & communication_logs                │
└────────────────┬───────────────────────────────────────┘
                 │
                 │ Authenticated JSON REST APIs (/api/telematics/*)
                 ▼
┌────────────────────────────────────────────────────────┐
│      Next.js App Router & Data Fetching UI             │
│     (Trackwe Fleet Management Dashboard :4173)         │
│                                                        │
│  • Real-time Device Monitor with Empty Registry State  │
│  • Verified Ignition Status (ON, OFF, Stale threshold) │
│  • Historical Telemetry Viewer & Raw Hex Inspector     │
│  • Diagnostic Communication Logs Table                 │
│  • Live / Demo Mode toggle preserving simulation       │
└────────────────────────────────────────────────────────┘
```

---

## 2. Files Created & Modified

### Protocol Engine & TCP Ingestion Service
- [`src/server/protocol/crc16.ts`](file:///Users/moin/Downloads/trackwe%202/src/server/protocol/crc16.ts): CRC-16/IBM implementation (polynomial `0xA001`, initial `0x0000`, 16-bit reflected) with checksum verification.
- [`src/server/protocol/teltonika-types.ts`](file:///Users/moin/Downloads/trackwe%202/src/server/protocol/teltonika-types.ts): TypeScript interfaces for Codec 8/8E headers, GPS coordinates, AVL records, and FMC920 property IDs.
- [`src/server/protocol/teltonika-parser.ts`](file:///Users/moin/Downloads/trackwe%202/src/server/protocol/teltonika-parser.ts): Binary packet decoder supporting Codec 8 (`0x08`) and Codec 8 Extended (`0x8E`), partial stream buffering, CRC verification, and I/O extraction.
- [`src/server/protocol/teltonika-ack.ts`](file:///Users/moin/Downloads/trackwe%202/src/server/protocol/teltonika-ack.ts): 4-byte big-endian server acknowledgement encoder and decoder.
- [`src/server/protocol/teltonika-builder.ts`](file:///Users/moin/Downloads/trackwe%202/src/server/protocol/teltonika-builder.ts): Synthetic packet builder generating valid Codec 8/8E frames for automated protocol tests and client simulation.
- [`src/server/tcp/metrics.ts`](file:///Users/moin/Downloads/trackwe%202/src/server/tcp/metrics.ts): Real-time metrics tracking socket sessions, throughput, latency, and packet counts.
- [`src/server/tcp/fmc920-tcp-service.ts`](file:///Users/moin/Downloads/trackwe%202/src/server/tcp/fmc920-tcp-service.ts): Dedicated Node.js TCP socket server implementing the FMC920 lifecycle.

### Persistence & Repositories
- [`migrations/001_initial_telematics_schema.sql`](file:///Users/moin/Downloads/trackwe%202/migrations/001_initial_telematics_schema.sql): PostgreSQL DDL migration creating all tables, indexes, constraints, and audit tables.
- [`src/server/db/db.ts`](file:///Users/moin/Downloads/trackwe%202/src/server/db/db.ts): Database abstraction supporting PostgreSQL (via `pg.Pool`) and zero-setup local SQLite fallback with health checks.
- [`src/server/db/repositories/device-repository.ts`](file:///Users/moin/Downloads/trackwe%202/src/server/db/repositories/device-repository.ts): CRUD, IMEI lookup, tenant isolation, and status updates for registered GPS units.
- [`src/server/db/repositories/telemetry-repository.ts`](file:///Users/moin/Downloads/trackwe%202/src/server/db/repositories/telemetry-repository.ts): Transactional batch ingestion, idempotent deduplication, snapshot updates, and ignition tracking.
- [`src/server/db/repositories/session-repository.ts`](file:///Users/moin/Downloads/trackwe%202/src/server/db/repositories/session-repository.ts): Socket connection session lifecycle tracker.
- [`src/server/db/repositories/log-repository.ts`](file:///Users/moin/Downloads/trackwe%202/src/server/db/repositories/log-repository.ts): Communication event auditing and packet parsing error logging.

### Server Authentication & Security
- [`src/server/auth.ts`](file:///Users/moin/Downloads/trackwe%202/src/server/auth.ts): Server-side authentication and role-based access control (Super Admin, Admin, Manager, Employee).

### Authenticated REST Management APIs
- [`src/app/api/telematics/health/route.ts`](file:///Users/moin/Downloads/trackwe%202/src/app/api/telematics/health/route.ts): Exposes TCP service status, database connectivity, and packet statistics.
- [`src/app/api/telematics/devices/route.ts`](file:///Users/moin/Downloads/trackwe%202/src/app/api/telematics/devices/route.ts): Lists registered devices with tenant scoping and handles new device registration.
- [`src/app/api/telematics/devices/[id]/route.ts`](file:///Users/moin/Downloads/trackwe%202/src/app/api/telematics/devices/%5Bid%5D/route.ts): Individual device metadata, vehicle assignment updates, status toggles, and deletion.
- [`src/app/api/telematics/telemetry/route.ts`](file:///Users/moin/Downloads/trackwe%202/src/app/api/telematics/telemetry/route.ts): Server-paginated historical AVL records query endpoint.
- [`src/app/api/telematics/ignition/route.ts`](file:///Users/moin/Downloads/trackwe%202/src/app/api/telematics/ignition/route.ts): Verified ignition ON/OFF counts, stale-data status, and historical state transitions.
- [`src/app/api/telematics/logs/route.ts`](file:///Users/moin/Downloads/trackwe%202/src/app/api/telematics/logs/route.ts): Diagnostic communication event logs and parsing errors endpoint.

### Frontend Integration
- [`src/features/data-fetching/telematics-api.ts`](file:///Users/moin/Downloads/trackwe%202/src/features/data-fetching/telematics-api.ts): Frontend API client SDK with typed models and authentication header injection.
- [`src/features/data-fetching/data-fetching-page.tsx`](file:///Users/moin/Downloads/trackwe%202/src/features/data-fetching/data-fetching-page.tsx): Updated with Real Backend vs Demo Mode toggle, device registration dialog, empty registry state, unavailable service banners, and real persisted data binding.
- [`src/features/data-fetching/data-fetching.css`](file:///Users/moin/Downloads/trackwe%202/src/features/data-fetching/data-fetching.css): Styles for live/demo mode toggle, alert banners, and empty state cards.

### Scripts & Automated Tests
- [`scripts/fmc920-service.mjs`](file:///Users/moin/Downloads/trackwe%202/scripts/fmc920-service.mjs): Standalone TCP service launcher.
- [`scripts/simulate-device.mjs`](file:///Users/moin/Downloads/trackwe%202/scripts/simulate-device.mjs): Synthetic device simulator for protocol testing.
- [`scripts/run-all-tests.mjs`](file:///Users/moin/Downloads/trackwe%202/scripts/run-all-tests.mjs): Unified master test runner.
- [`tests/fmc920-backend.test.cjs`](file:///Users/moin/Downloads/trackwe%202/tests/fmc920-backend.test.cjs): 22 automated protocol, security, and persistence tests.
- [`.env.example`](file:///Users/moin/Downloads/trackwe%202/.env.example): Production environment variable template.

---

## 3. Database Schema & Migration Instructions

### Tables Overview
1. `registered_devices`: Primary device registry with unique `imei`, `org_id`, assigned `vehicle_id`, and status (`active`, `disabled`, `revoked`).
2. `device_sessions`: Tracks active TCP socket sessions, connect/disconnect timestamps, packet counts, and disconnect reasons.
3. `device_latest_telemetry`: Fast snapshot table holding the latest verified GPS coordinates, voltages, GSM signal, and ignition state per device.
4. `historical_telemetry`: Append-only immutable log of every AVL record received, protected by `UNIQUE (device_id, device_timestamp)` for idempotent deduplication.
5. `ignition_events`: Event ledger tracking verified ACC transitions (`IGNITION_ON` vs `IGNITION_OFF`).
6. `device_communication_logs`: Audit trail for low-level socket connections, handshakes, and rejected unauthorized IMEIs.
7. `packet_parsing_errors`: Malformed packets, CRC mismatches, and frame errors.

### Applying Migrations on PostgreSQL
```bash
# 1. Create the database
createdb -U postgres trackwe_telematics

# 2. Run the migration script
psql -U postgres -d trackwe_telematics -f migrations/001_initial_telematics_schema.sql

# 3. Configure DATABASE_URL in .env
DATABASE_URL=postgresql://postgres:password@localhost:5432/trackwe_telematics
```

*Note: In local development, if `DATABASE_URL` is omitted, Trackwe automatically initialises the equivalent schema in `.data/telematics.db` using Node.js built-in SQLite engine with zero manual setup required.*

---

## 4. Authenticated API Endpoints

All endpoints require authentication via `Authorization: Bearer <accountId>` or `x-trackwe-account-id: <accountId>`.

| Method | Endpoint | Description | Role Permissions |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/telematics/health` | TCP service status, DB latency, packet counters | All Authenticated |
| `GET` | `/api/telematics/devices` | List registered devices with pagination & search | All Authenticated (Scoped) |
| `POST` | `/api/telematics/devices` | Register new GPS tracker with IMEI & vehicle | Admin, Super Admin |
| `GET` | `/api/telematics/devices/[id]` | Individual device metadata & latest snapshot | All Authenticated (Scoped) |
| `PATCH` | `/api/telematics/devices/[id]` | Update status, vehicle assignment, reporting rate | Admin, Super Admin |
| `DELETE` | `/api/telematics/devices/[id]` | Revoke and delete registered device | Admin, Super Admin |
| `GET` | `/api/telematics/telemetry` | Paginated historical AVL records & coordinates | All Authenticated (Scoped) |
| `GET` | `/api/telematics/ignition` | Verified ON/OFF counts, stale status, transition events | All Authenticated (Scoped) |
| `GET` | `/api/telematics/logs` | Diagnostic communication logs & parse errors | All Authenticated (Scoped) |

---

## 5. Teltonika Protocol Parser & Acknowledgement Flow

### Handshake (Phase 1)
1. Device opens TCP socket to `0.0.0.0:5027`.
2. Device transmits 2-byte length (Big-Endian) followed by ASCII IMEI string (15 bytes).
3. Backend inspects IMEI in `registered_devices`:
   - If recognized and `status === 'active'`: server responds with byte `0x01`.
   - If unknown, unregistered, or `status !== 'active'`: server responds with byte `0x00` and immediately terminates the TCP socket.

### Packet Framing & Checksum (Phase 2)
1. **Preamble**: 4 zero bytes (`0x00000000`).
2. **Data Length**: 4 bytes Big-Endian integer.
3. **Codec ID**: `0x08` (Codec 8) or `0x8E` (Codec 8 Extended).
4. **Record Count N1**: 1 byte.
5. **AVL Records**:
   - 8-byte UTC timestamp (ms since UNIX epoch).
   - 1-byte priority (0=Low, 1=High, 2=Panic).
   - 15-byte GPS element: Longitude (4B int32), Latitude (4B int32), Altitude (2B int16), Angle (2B uint16), Satellites (1B uint8), Speed (2B uint16).
   - I/O Elements: Extracted IDs:
     - `AVL ID 239`: Ignition status (`1` = ON, `0` = OFF).
     - `AVL ID 240`: Movement status (`1` = Moving, `0` = Stationary).
     - `AVL ID 66`: External vehicle battery voltage (mV converted to Volts, e.g. `12450` -> `12.45 V`).
     - `AVL ID 67`: Internal backup battery voltage (mV converted to Volts, e.g. `3820` -> `3.82 V`).
     - `AVL ID 21`: GSM signal level (`0` to `5` bars).
6. **Record Count N2**: 1 byte (must match N1).
7. **CRC-16/IBM**: 4 bytes calculated over data length bytes using polynomial `0xA001`.

### Acknowledgement Rule (Phase 2 ACK)
For every valid and durably committed packet, the server replies with a 4-byte integer (Big-Endian) indicating the exact count of accepted records (e.g., `0x00 0x00 0x00 0x01`). If persistence fails or the packet is corrupted, **no success ACK is sent**.

---

## 6. Automated Test Results

Trackwe features a unified test suite with **37 total acceptance checks**:

```
=== RUNNING TRACKWE TEST SUITES ===

--> Suite 1: Existing Demo & RBAC Acceptance Tests
PASS Super Admin: login, session restore, invalid credentials, logout
PASS Admin: login, session restore, invalid credentials, logout
PASS Manager: login, session restore, invalid credentials, logout
PASS Employee: login, session restore, invalid credentials, logout
PASS Session expiry and corrupt payload recover to login
PASS Roles enforce page access and data scope
PASS Employee cannot mutate unrestricted tasks, users, or approvals
PASS Employee updates assigned task; shared counts and persistence follow
PASS Expense submission and manager approval work
PASS Admin cannot assign privileged roles or edit other organizations
PASS Add/edit vehicle and driver preserve registration references
PASS Task creation/edit, geofence edit and acknowledgement persist
PASS Every seeded vehicle, route, geofence and location uses UAE demo areas
PASS Dashboard charts equal scoped source records and date filters change totals
PASS Reset respects organization scope and denies employees
15 acceptance checks passed.

--> Suite 2: Teltonika FMC920 Protocol & Backend Integration Tests
  PASS: 1. Valid IMEI Handshake (0x01 accepted)
  PASS: 2. Invalid IMEI Handshake format rejection
  PASS: 3. Unregistered IMEI Handshake rejection (0x00)
  PASS: 4. Disabled registered device rejection (0x00)
  PASS: 5. Valid Codec 8 packet parsing
  PASS: 6. Valid Codec 8 Extended (0x8E) packet parsing
  PASS: 7. CRC-16/IBM validation and corrupted payload rejection
  PASS: 8. Partial TCP packet delivery across stream chunks
  PASS: 9. Multiple concatenated packets in one TCP stream
  PASS: 10. Invalid packet length handling
  PASS: 11. Invalid record count mismatch (N1 != N2)
  PASS: 12. Correct 4-byte big-endian ACK encoding
  PASS: 13. Persistence failure and acknowledgement behavior
  PASS: 14. Duplicate and retransmitted packet deduplication
  PASS: 15. Ignition I/O element parsing and transition recording
  PASS: 16. Voltage conversion from mV to Volts with precision
  PASS: 17. Tenant isolation and role permissions
  PASS: 18. Empty device registry handling
  PASS: 19. Database reachability health check
  PASS: 20. API authentication failure checks
  PASS: 21. Historical telemetry pagination
  PASS: 22. End-to-End TCP Handshake and Telemetry Ingestion over Socket

ALL 22 AUTOMATED PROTOCOL & BACKEND TESTS PASSED!
✅ ALL TEST SUITES COMPLETED SUCCESSFULLY (37 checks passed across 2 suites)!
```

---

## 7. Local Startup Commands

### Run Everything Concurrently (Recommended)
```bash
# Starts Next.js dashboard (:4173) and FMC920 TCP Listener (:5027)
npm run dev
```

### Run Tests
```bash
# Run master test suite (37 tests across demo and protocol suites)
npm test

# Run protocol & backend suite only
npm run test:protocol

# Run frontend demo acceptance tests only
npm run test:demo
```

### Simulate Synthetic FMC920 Hardware Packets
```bash
# Exercise handshake & send 3 valid Codec 8 packets over TCP socket
npm run simulate:device -- --imei 864275048912345 --count 3

# Send Codec 8 Extended packets
npm run simulate:device -- --imei 864275048912345 --count 5 --extended
```

---

## 8. Deployment & Teltonika Configurator Setup

### Hardware Provisioning with Teltonika Configurator
When physical FMC920 devices arrive:
1. Connect FMC920 to PC using micro-USB cable.
2. Launch official **Teltonika Configurator** (version compatible with FMC920).
3. Under **GPRS Settings**:
   - Set **APN** matching the UAE SIM card (e.g. `etisalat.ae` or `du.ae`).
   - Leave APN username and password blank unless required by the operator.
4. Under **Server Settings**:
   - Set **Domain / IP**: Public IP or DNS of the Trackwe TCP server (e.g. `telematics.trackwe.ae`).
   - Set **Port**: `5027`.
   - Set **Protocol**: `TCP`.
5. Under **Data Acquisition**:
   - Set **Min Period (Moving)**: 60 seconds.
   - Set **Min Period (Stop)**: 300 seconds.
   - Set **Min Distance**: 100 meters.
   - Set **Min Angle**: 20 degrees.
6. Under **System -> Codec**:
   - Select **Codec 8** or **Codec 8 Extended**.
7. Note down the 15-digit IMEI printed on the device label and register it in the Trackwe dashboard under **Data Fetching -> Register GPS Device**.
8. Disconnect USB, insert active micro-SIM, and connect to vehicle 12V/24V power.

### Cloud VPS Deployment (Ubuntu / Debian)
1. **Firewall (UFW)**:
   ```bash
   sudo ufw default deny incoming
   sudo ufw allow 22/tcp    # SSH
   sudo ufw allow 80/tcp    # HTTP (Let's Encrypt)
   sudo ufw allow 443/tcp   # HTTPS (Dashboard)
   sudo ufw allow 5027/tcp  # Raw Teltonika GPS Ingestion Port
   sudo ufw enable
   ```
2. **Systemd Service for TCP Ingestion (`/etc/systemd/system/trackwe-fmc920.service`)**:
   ```ini
   [Unit]
   Description=Trackwe Teltonika FMC920 TCP Ingestion Service
   After=network.target postgresql.service

   [Service]
   Type=simple
   User=trackwe
   WorkingDirectory=/opt/trackwe
   Environment=NODE_ENV=production
   Environment=GPS_TCP_HOST=0.0.0.0
   Environment=GPS_TCP_PORT=5027
   Environment=DATABASE_URL=postgresql://trackwe:secret@localhost:5432/trackwe_telematics
   ExecStart=/usr/bin/node scripts/fmc920-service.mjs
   Restart=always
   RestartSec=5

   [Install]
   WantedBy=multi-user.target
   ```
3. Enable and start:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now trackwe-fmc920.service
   ```

---

## 9. Known Limitations & Production Recommendations

1. **Single Node TCP Listener**: The current service runs as a single Node.js process managing up to 1,000 concurrent sockets. For fleets exceeding 10,000 simultaneous devices, deploy multiple TCP listener workers behind a Layer 4 TCP Load Balancer (HAProxy or AWS Network Load Balancer).
2. **Historical Retention**: Telemetry records are stored in PostgreSQL/SQLite. For high-frequency reporting (<10s intervals across thousands of vehicles), consider partitioning `historical_telemetry` by month or leveraging TimescaleDB.
3. **Firmware FOTA**: Remote firmware updates and SMS configuration commands over GPRS require Teltonika Codec 12 / SMS gateway integration, which can be layered onto the `device_sessions` table in a future phase.

# Trackwe — UAE Fleet Intelligence Platform (Demo)

A premium Next.js App Router + React + TypeScript fleet management and operations platform focused exclusively on the **United Arab Emirates (UAE)**. Built with a clean enterprise white theme, navy sidebar (`#0c2f4a`), gold accents (`#c6ab6d`), interactive OpenStreetMap via Leaflet, Recharts, and smooth CSS micro-animations.

---

## 🚀 Getting Started

### 1. Install & Run Locally

```bash
npm install
npm run dev
```

Visit **http://localhost:3000** in your browser.

### 2. Verify Compilation & Static Build

```bash
npm run typecheck
npm run build
```

---

## 🔑 Demo Accounts & Role Permissions

The platform includes a dedicated login screen with quick one-click role sign-in and credential verification:

| Role | Demo Email | Demo Password | Primary Permissions |
|---|---|---|---|
| **Super Admin** | `superadmin@trackwe.demo` | `Trackwe@123` | Platform dashboard, all UAE regions & organizations, user/role management, device catalog, platform settings, reset demo data |
| **Admin** | `admin@trackwe.demo` | `Trackwe@123` | Fleet vehicles, drivers, managers & employees, live tracking, route history, fuel/temp/CAN diagnostics, driver safety, dash cams, immobilizer simulation, expense approvals, task management |
| **Manager** | `manager@trackwe.demo` | `Trackwe@123` | Authorized fleet vehicles & drivers, live tracking & route history, fuel, temperature & CAN monitoring, alerts, task assignment & progress, expense review & approval |
| **Employee** | `employee@trackwe.demo` | `Trackwe@123` | Dedicated Employee Dashboard: assigned vehicle telemetry (Dubai A-10842), assigned task updates, reimbursement expense submission, notifications |

---

## 📂 Project & Component Architecture

Organized cleanly by feature modules and components:

```
src/
├── app/
│   ├── globals.css                # Enterprise white theme, tokens, smooth animations & keyframes
│   ├── layout.tsx                 # Root layout with Geist font
│   └── page.tsx                   # Main entry point rendering FleetApp
├── context/
│   ├── auth-context.tsx           # Multi-role demo auth, session persistence, role permissions
│   └── fleet-context.tsx          # Shared reactive state (vehicles, tasks, expenses, alerts, trips) with localStorage persistence
├── data/
│   ├── mock-credentials.ts        # The 4 demo user credentials and RBAC permission matrix
│   ├── uae-vehicles.ts            # Realistic UAE commercial fleet (Dubai, Abu Dhabi, Sharjah, Ajman, RAK, Fujairah, Al Ain)
│   └── uae-records.ts             # UAE tasks, expenses in AED, alerts, trips, and geofences
├── types/
│   └── index.ts                   # Complete TypeScript interfaces (Vehicle, Driver, Task, Expense, Alert, etc.)
└── components/
    ├── auth/
    │   └── login-page.tsx         # Polished login screen with demo role quick-switcher and validation
    ├── layout/
    │   ├── sidebar.tsx            # Navy sidebar with dynamic role-based navigation filtering
    │   ├── topbar.tsx             # Breadcrumbs, global search, notifications bell, user profile popover
    │   ├── notification-popover.tsx # Popover with one-click alert acknowledgement
    │   └── user-popover.tsx       # Profile info, quick role switcher, and logout
    ├── common/
    │   ├── badge.tsx              # Status badges (Moving, Idle, Offline, High, etc.)
    │   ├── kpi-card.tsx           # Compact metric card with icons & color tones
    │   ├── panel.tsx              # Reusable card panel container
    │   ├── data-table.tsx         # Searchable, sortable, paginated table with AED currency and CSV export
    │   ├── charts.tsx             # Recharts trend lines, bars, and donut charts
    │   ├── modal.tsx              # Accessible dialog modal
    │   └── toast.tsx              # Slide-in toast notification system
    ├── map/
    │   └── fleet-map.tsx          # Leaflet OpenStreetMap centered on Dubai/UAE with vehicle markers, geofences, route player
    └── views/
        ├── dashboard/
        │   ├── dashboard-view.tsx     # Role-adaptive dashboard with KPI grid, status donut, distance & fuel trends
        │   └── employee-dashboard.tsx # Focused view for field employees (my vehicle, assigned tasks, expenses)
        ├── tracking/
        │   └── live-tracking-view.tsx # Live OpenStreetMap + UAE vehicle list + details drawer
        ├── vehicles/
        │   └── vehicles-view.tsx      # Vehicle directory, search/filters, Add Vehicle modal
        ├── drivers/
        │   └── drivers-view.tsx       # UAE licensed driver directory, safety ratings, Add Driver modal
        ├── trips/
        │   └── trips-view.tsx         # Route history along Sheikh Zayed Road (E11) with interactive replay player
        ├── geofences/
        │   └── geofences-view.tsx     # Geofence list, interactive map drawer (circle & polygon)
        ├── intelligence/
        │   ├── fuel-view.tsx          # Fuel consumption, refuels & drops (ENOC / ADNOC)
        │   ├── temperature-view.tsx   # Cold-chain refrigerated monitoring (HACCP 2–8 °C)
        │   ├── diagnostics-view.tsx   # CAN Bus J1939 parameters (RPM, coolant, battery, DTC trouble codes)
        │   ├── behavior-view.tsx      # Driver safety index and violation incident log
        │   ├── cameras-view.tsx       # Dash camera streaming preview (labeled demo mode)
        │   └── immobilizer-view.tsx   # Remote engine cut-off simulator with safety confirmation dialog
        ├── operations/
        │   ├── tasks-view.tsx         # List and Kanban board views, task creation & status updating
        │   ├── expenses-view.tsx      # AED expense management, submission modal, approval flow for managers/admins
        │   ├── alerts-view.tsx        # Real-time alert list with acknowledgement
        │   └── reports-view.tsx       # Fleet reports, utilization efficiency, CSV downloads
        └── admin/
            ├── users-view.tsx         # User management, role assignment, RBAC permissions matrix
            ├── integrations-view.tsx  # Teltonika, Queclink, camera integrations gateway status
            └── settings-view.tsx      # Org settings, timezone (Asia/Dubai), distance units, and Reset Demo Data
```

---

## 🇦🇪 UAE Geographic Focus & Regional Formatting

- **Map Center**: Dubai, UAE (`[25.2048, 55.2708]`) using real OpenStreetMap tiles.
- **Regions Covered**: Dubai (Downtown, JAFZA, DLC, DIP, Al Quoz), Abu Dhabi (Musaffah, KIZAD, Corniche), Sharjah, Ajman, Ras Al Khaimah, Fujairah, and Al Ain.
- **Registration Plates**: UAE standard formats (e.g., `Dubai A-10842`, `Abu Dhabi 4-19283`, `Sharjah 1-48291`, etc.).
- **Currency**: United Arab Emirates Dirham (`AED`) throughout all tables, expenses, and summaries.
- **Timezone**: `Asia/Dubai (UTC +04:00)` — Gulf Standard Time (GST).

---

## 📡 Teltonika FMC920 GPS Hardware Integration

Trackwe includes a dedicated Node.js / TypeScript TCP Telematics Gateway engineered specifically to ingest, parse, normalize, and broadcast binary telemetry streams from physical **Teltonika FMC920 4G LTE Cat 1** GPS trackers.

### 1. Ingestion Architecture & Data Flow

```
┌─────────────────────────┐
│ Teltonika FMC920 Tracker│ (Physical GPS Hardware / Cellular GPRS/LTE)
└────────────┬────────────┘
             │ TCP Socket Connection
             ▼
┌─────────────────────────┐
│ TCP Listener (Port 5027)│ net.Server buffer stream with fragmentation handling
└────────────┬────────────┘
             │ Phase 1: 2-byte Length + ASCII IMEI
             ▼
┌─────────────────────────┐
│ IMEI Handshake & Auth   │ Verify against authorized registry -> Return 0x01 (Accept) or 0x00 (Reject)
└────────────┬────────────┘
             │ Phase 2: Binary AVL Data Packet
             ▼
┌─────────────────────────┐
│ Binary Protocol Decoder │ Validates Preamble, Payload Length, Codec 8 (0x08) & Codec 8 Extended (0x8E),
│ (CRC-16 IBM: 0xA001)    │ Record Counts (N1==N2), and computes 4-byte Big-Endian ACK response
└────────────┬────────────┘
             │ Normalized Telemetry (GPS + I/O Elements)
             ▼
┌─────────────────────────┐
│ In-Memory Tracking Store│ Stores latest vehicle position, diagnostics, health metrics, and bounded history
│ (ITrackingStore)        │ * Clean interface ready for Phase 2 MongoDB replacement *
└────────────┬────────────┘
             │ Real-Time Broadcast
             ▼
┌─────────────────────────┐
│ WebSocket (Port 8088)   │ Role-based filtering (Employee isolation vs Admin full fleet)
└────────────┬────────────┘
             │ ws://localhost:8088
             ▼
┌─────────────────────────┐
│ Trackwe Live Dashboard  │ Leaflet Map radar markers, Live FMC920 pill, speed/ignition/voltage gauges
└─────────────────────────┘
```

> [!NOTE]
> **Phase 1 In-Memory Storage Disclaimer**: Telemetry state and connection metrics are stored in RAM for maximum ingestion performance. All in-memory data resets when the tracking service process terminates. A MongoDB persistence adapter can be dropped into the `ITrackingStore` interface for Phase 2.

---

### 2. Supported Teltonika Codecs & FMC920 I/O Elements

The decoder parses both **Codec 8 (`0x08`)** and **Codec 8 Extended (`0x8E`)** with 16-bit CRC-16-IBM (`0xA001`) verification:

| I/O Element ID | Parameter Name | Type / Units | Normalized Usage in Trackwe |
|---|---|---|---|
| **I/O 239** | Ignition Status (ACC) | 1 Byte (`0 / 1`) | Engine ON / OFF status indicator |
| **I/O 240** | Movement Sensor | 1 Byte (`0 / 1`) | Accelerometer motion detection (Moving / Stationary) |
| **I/O 66** | External Main Voltage | 2 Bytes (`mV`) | Vehicle 12V/24V battery level (converted to Volts, e.g. 12.6V) |
| **I/O 67** | Internal Backup Battery | 2 Bytes (`mV`) | FMC920 backup Li-ion battery (converted to Volts, e.g. 3.82V) |
| **I/O 21** | GSM Cellular Signal | 1 Byte (`0–5`) | Cellular signal quality indicator |
| **GPS** | Coordinates & Motion | 15 Bytes | Latitude, Longitude, Speed (km/h), Altitude (m), Heading, Satellites |

---

### 3. Critical Packet Acknowledgement (ACK)

In compliance with the Teltonika protocol specification, after valid packet decoding the TCP server immediately replies with a **4-byte Big-Endian integer** matching the exact count of records processed:

- **1 Record**: `0x00 0x00 0x00 0x01`
- **5 Records**: `0x00 0x00 0x00 0x05`

If the tracker does not receive this exact ACK, it assumes network failure and repeatedly resends historical packets.

---

### 4. Running the Telematics Gateway & Simulator

#### Terminal 1: Start Tracking Gateway (TCP 5027 + WS 8088)
```bash
npm run tracker:start
```

#### Terminal 2: Run Automated Test Suite (14 Unit & Integration Tests)
```bash
npm run tracker:test
```

#### Terminal 3: Stream Simulated FMC920 Hardware Packets
```bash
# Streams live FMC920 packets along Sheikh Zayed Road (E11) corridor every 3 seconds
npm run tracker:sim

# Or send a single packet for testing
npm run tracker:sim -- --once

# Or test Codec 8 Extended (0x8E)
npm run tracker:sim -- --extended
```

#### Terminal 4: Frontend Web App
```bash
npm run dev
# or for production static export:
npm run build && npx serve out -l 3000
```

---

### 5. Physical Teltonika FMC920 Device Configuration Guide

To connect a physical FMC920 tracker:

1. Connect device to a PC via micro-USB and open **Teltonika Configurator**.
2. **GPRS Section**:
   - Set APN according to your UAE SIM provider (e.g., `du` or `etisalat`).
3. **Server Settings**:
   - Protocol: `TCP`
   - Server IP: `YOUR_PUBLIC_SERVER_IP`
   - Server Port: `5027` (ensure this port is open in your cloud security group)
4. **Data Protocol**:
   - Set to `Codec 8` or `Codec 8 Extended`.
5. **Device Registration**:
   - Add the device's 15-digit IMEI to `TRACKING_ALLOWED_IMEIS` in `.env`:
     ```env
     TRACKING_ALLOWED_IMEIS=356289104928172:v-dxb-01,YOUR_DEVICE_IMEI:YOUR_VEHICLE_ID
     ```
   - *Unauthorized IMEIs are automatically rejected with single byte `0x00` and dropped.*

---

### 6. Verification Status

- [x] **IMEI Handshake Acceptance & Rejection**: Verified (0x01 on authorized, 0x00 on unauthorized).
- [x] **Teltonika Codec 8 & Codec 8 Extended Binary Parsing**: Verified against official hardware fixtures.
- [x] **CRC-16-IBM (`0xA001`) Integrity Checking**: Verified against official captures.
- [x] **4-byte Big-Endian ACK Generation**: Verified.
- [x] **FMC920 I/O Parameter Extraction** (IDs 239, 240, 66, 67, 21): Verified.
- [x] **In-Memory Store & Device Health Diagnostics**: Verified.
- [x] **WebSocket Live Streaming**: Verified with role-based filtering (Employee vs Admin).
- [x] **UI Integration**: Live Hardware Badge, Leaflet radar pulse marker, floating details card, and Vehicle Profile I/O telemetry panel verified in browser.
- [ ] **Physical Hardware On Public Cloud IP**: *Pending deployment to cloud VM with physical FMC920 hardware.*


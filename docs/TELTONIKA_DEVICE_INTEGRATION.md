# Trackwe — Teltonika FMC920 & FMC130 Fleet Telematics Integration Guide

## 1. Unified Architecture & Shared TCP Socket Pipeline

Trackwe provides a high-throughput, unified Teltonika telematics ingestion architecture supporting both **Teltonika FMC920** and **Teltonika FMC130** hardware units through a single, model-aware TCP socket listener.

```
┌─────────────────────────────────┐      ┌─────────────────────────────────┐
│   Teltonika FMC920 GPS Tracker  │      │   Teltonika FMC130 GPS Tracker  │
│    (4G LTE Cat 1 / Compact)     │      │   (4G LTE Cat 1 / Multi-I/O)    │
└────────────────┬────────────────┘      └────────────────┬────────────────┘
                 │                                        │
                 │ 1. TCP Connection to Public IP:Port (5027)
                 │ 2. Phase 1 Handshake: [Length 2B] + [ASCII IMEI]
                 ▼                                        ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                   Unified Teltonika TCP Ingestion Service                │
│             (Node.js Net Socket Server · scripts/fmc920-service)         │
│                                                                          │
│  • Validates IMEI against registered_devices                             │
│  • Dynamically detects hardware model (FMC920 vs FMC130)                 │
│  • Handshake Response: 0x01 (Authorized) or 0x00 (Rejected)              │
│  • Stream Buffer Accumulator (handles partial reads & multi-packets)     │
│  • Binary Parser: Codec 8 (0x08), Codec 8 Extended (0x8E), Codec 16 (0x10)│
│  • CRC-16/IBM Checksum Verification (0xA001)                             │
│  • Model-Aware Telemetry & Multi-Source Ignition Engine                  │
│  • Sends 4-Byte Big-Endian ACK ONLY AFTER Database Transaction Commit    │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     │ Durable Transactional Persistence
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                 Database Layer (PostgreSQL / SQLite Fallback)            │
│                                                                          │
│  • registered_devices (Tenant-isolated registry, model, ignition config) │
│  • device_latest_telemetry (Latest GPS, Odometer, Fuel, RPM, Voltages)   │
│  • historical_telemetry (Idempotent immutable records + raw AVL I/O map) │
│  • ignition_events (ACC state transition ledger with GPS & Voltages)     │
│  • device_sessions & communication_logs                                  │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     │ Authenticated REST APIs (/api/telematics/*)
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                      Trackwe Fleet Management UI                         │
│                    (Next.js App Router · Port 3000)                      │
│                                                                          │
│  • Hardware Model Filters (All, Teltonika FMC130, Teltonika FMC920)     │
│  • Multi-Source Ignition Monitor (DIN1, Voltage, Accelerometer, RPM)     │
│  • Real-time Telemetry Viewer & Decoded AVL I/O Inspector                │
│  • Real Backend / Demo Mode Toggle                                       │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Hardware Comparison & Supported Codecs

| Specification | Teltonika FMC920 | Teltonika FMC130 |
| :--- | :--- | :--- |
| **Cellular Network** | 4G LTE Cat 1 (with 2G fallback) | 4G LTE Cat 1 (with 2G fallback) |
| **GNSS Engine** | GPS, GLONASS, GALILEO, BEIDOU | GPS, GLONASS, GALILEO, BEIDOU |
| **Digital Inputs** | 1 Digital Input (DIN1) | 3 Digital Inputs (DIN1, DIN2, DIN3) |
| **Analog Inputs** | 1 Analog Input (AIN1) | 2 Analog Inputs (AIN1, AIN2) |
| **Digital Outputs** | 1 Digital Output (DOUT1) | 2 Digital Outputs (DOUT1, DOUT2) |
| **CAN / OBD Data** | Basic Bluetooth OBD | LV-CAN200 / ALL-CAN300 / CAN-CONTROL |
| **Supported Codecs** | Codec 8 (`0x08`), Codec 8 Extended (`0x8E`) | Codec 8 (`0x08`), Codec 8 Extended (`0x8E`), Codec 16 (`0x10`) |
| **Ignition Sources** | DIN1, Voltage, Accelerometer, AVL ID 239 | DIN1, Voltage, Accelerometer, Engine RPM, AVL ID 239 |

---

## 3. Supported Codecs & Protocol Specification

### 3.1 Codec 8 (`0x08`)
- **Use case**: Standard telemetry for basic installations.
- **Header**: 4-byte zero preamble (`0x00000000`) + 4-byte big-endian data length.
- **Payload**: Codec ID (`0x08`) + Record count N1 (1 byte) + AVL Records + Record count N2 (1 byte).
- **CRC**: 4-byte CRC-16/IBM (`0xA001`) over the payload.
- **I/O Identifiers**: 1-byte AVL IDs (IDs 1–255), 1-byte counts for 1B, 2B, 4B, 8B values.

### 3.2 Codec 8 Extended (`0x8E`)
- **Use case**: Advanced telemetry including CAN bus, fuel meters, odometer, and temperature sensors where AVL IDs exceed 255.
- **Header**: 4-byte zero preamble (`0x00000000`) + 4-byte big-endian data length.
- **Payload**: Codec ID (`0x8E`) + Record count N1 (1 byte) + AVL Records + Record count N2 (1 byte).
- **I/O Identifiers**: 2-byte AVL IDs (IDs 1–65535), 2-byte counts for 1B, 2B, 4B, 8B, and variable length elements.

### 3.3 Codec 16 (`0x10`)
- **Use case**: Teltonika extended protocol for specialized firmware configurations.
- **Payload**: Codec ID (`0x10`) + Record count N1 (1 byte) + AVL Records + Record count N2 (1 byte).
- **Server Acknowledgement**: All codecs return a 4-byte big-endian integer count of successfully persisted records.

---

## 4. Multi-Source Configurable Ignition Detection

FMC130 and FMC920 devices can detect vehicle ignition using four distinct hardware sources configured per device:

```
                      ┌──────────────────────────────────────────────┐
                      │    Configurable Device Ignition Source       │
                      └──────────────────────┬───────────────────────┘
                                             │
      ┌──────────────────┬───────────────────┼───────────────────┬──────────────────┐
      ▼                  ▼                   ▼                   ▼                  ▼
┌───────────┐      ┌───────────┐       ┌───────────┐       ┌───────────┐      ┌───────────┐
│   DIN1    │      │  VOLTAGE  │       │   ACCEL   │       │    RPM    │      │AUTO_AVL239│
│(AVL ID 1) │      │(AVL ID 66)│       │(AVL ID 240│       │(AVL ID 85)│      │(AVL ID 239│
└─────┬─────┘      └─────┬─────┘       └─────┬─────┘       └─────┬─────┘      └─────┬─────┘
      │                  │                   │                   │                  │
 1 = ON             >= 13.2V = ON       Moving = ON         >= 400 = ON        1 = ON
 0 = OFF            <= 12.8V = OFF      Stationary = OFF    < 400 = OFF        0 = OFF
```

1. **Digital Input 1 (DIN1)**:
   - Hardwired connection to vehicle ACC line.
   - Evaluates AVL ID 1: `1` => Ignition ON, `0` => Ignition OFF.
2. **External Power Voltage (VOLTAGE)**:
   - 2-wire quick installation (positive + ground).
   - Alternator charging check: If voltage >= high threshold (default `13.2V`) => ON; if <= low threshold (default `12.8V`) => OFF.
   - Hysteresis avoids flickering during engine idle.
3. **Accelerometer / Movement (ACCELEROMETER)**:
   - Evaluates internal 3-axis accelerometer (AVL ID 240).
   - `Moving` => ON, `Stationary` => OFF.
4. **Engine RPM (RPM)**:
   - Evaluates live engine RPM from CAN-bus adapter (AVL ID 85).
   - RPM >= threshold (default `400 RPM`) => ON, `< 400 RPM` (or 0) => OFF.

### Stale Data & Disconnection Handling
- When a device disconnects, its ignition status **remains at its last verified state**.
- If no telemetry update arrives after the stale threshold (default 10 minutes), the state is marked as **Stale**.
- Trackwe **never infers ignition OFF merely because a socket disconnects**.

---

## 5. FMC130 Telemetry Parameters & AVL IDs

| Parameter | AVL ID | Byte Length | Scale / Unit | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Digital Input 1** | 1 | 1 | 0 or 1 | Ignition / ACC wire |
| **Digital Input 2** | 2 | 1 | 0 or 1 | Aux input / Panic button |
| **Digital Input 3** | 3 | 1 | 0 or 1 | Door sensor / PTO |
| **Analog Input 1** | 9 | 2 | mV | Fuel float sensor / pressure |
| **Analog Input 2** | 10 | 2 | mV | Second analog probe |
| **Total Odometer** | 16 | 4 | meters -> km | High-precision mileage |
| **GSM Signal** | 21 | 1 | 0–5 bars | Cellular signal level |
| **External Voltage** | 66 | 2 | mV -> Volts | Vehicle battery / Alternator |
| **Internal Battery** | 67 | 2 | mV -> Volts | Backup Li-Po battery |
| **1-Wire Temperature 1**| 72 | 2 | 0.1 °C | Dallas DS18B20 temperature |
| **iButton / RFID** | 78 | 8 | Hex string | Driver ID card |
| **Fuel Level (%)** | 83 | 1 | 0–100% | CAN-bus fuel tank percentage |
| **Fuel Consumed** | 84 | 4 | Liters | Total fuel used |
| **Engine RPM** | 85 | 2 | RPM | Live engine crankshaft speed |
| **Engine Temperature** | 115 | 1 | signed °C | Engine coolant temperature |
| **Digital Output 1** | 179 | 1 | 0 or 1 | Starter immobilizer relay |
| **Digital Output 2** | 180 | 1 | 0 or 1 | Buzzer / indicator light |
| **Ignition** | 239 | 1 | 0 or 1 | Teltonika calculated ignition |
| **Movement** | 240 | 1 | 0 or 1 | Accelerometer movement flag |

All unmapped AVL IDs are automatically preserved in the immutable JSONB `io_elements` column.

---

## 6. Teltonika Configurator Setup

### Server Settings (GPRS Tab)
- **Domain**: VPS Public IP or Domain (e.g. `50.62.182.143`)
- **Port**: `5027`
- **Protocol**: `TCP`
- **APN**: SIM provider APN (e.g. `etisalat.ae` or `du`)

### Protocol Settings (System Tab)
- **Data Protocol**: `Codec 8 Extended` (or `Codec 8` / `Codec 16`)
- **Ignition Source**: Select matching configuration:
  - `Digital Input 1`
  - `Power Voltage` (High: 13200 mV, Low: 12800 mV)
  - `Accelerometer`
  - `CAN Engine RPM`

### Data Acquisition Settings
- **Min Period**: `60` sec (On Stop: `300` sec)
- **Min Angle**: `30` degrees
- **Min Distance**: `100` meters
- **Min Speed Delta**: `10` km/h

---

## 7. Device Registration & Verification

### Step-by-Step UI Registration:
1. Open Trackwe Dashboard -> **Data Fetching**.
2. Click **Add Device**.
3. Select **Manufacturer**: `Teltonika`.
4. Select **Model**: `Teltonika FMC130` (or `Teltonika FMC920`).
5. Enter the **15-digit IMEI**.
6. Select **Fleet Vehicle** assignment.
7. Select **Ignition Source** (`DIN1`, `VOLTAGE`, `ACCELEROMETER`, or `RPM`).
8. Click **Authorize & Register Device**.

### Command Line Seeding:
```bash
# Seed FMC920
npm run seed

# Seed FMC130 with custom IMEI
npm run seed:fmc130 867123049100001
```

### Hardware Simulation Testing:
```bash
# Simulate FMC130 with Codec 8 Extended & DIN1 ignition ON
npm run simulate:device -- --model FMC130 --imei 867123049100001 --codec 8e --ignition 1 --voltage 13.8 --rpm 1500

# Simulate FMC130 with Codec 16
npm run simulate:device -- --model FMC130 --imei 867123049100001 --codec 16 --ignition 0 --voltage 12.4
```

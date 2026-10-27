-- Trackwe Telematics Database Schema (PostgreSQL)
-- Teltonika FMC920 Telematics Ingestion & Fleet Management Pipeline

CREATE TABLE IF NOT EXISTS organizations (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(32) NOT NULL, -- 'Super Admin', 'Admin', 'Manager', 'Employee'
    org_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicles (
    id VARCHAR(64) PRIMARY KEY,
    registration VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    vehicle_type VARCHAR(64) NOT NULL,
    org_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    driver VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS registered_devices (
    id VARCHAR(64) PRIMARY KEY,
    imei VARCHAR(32) UNIQUE NOT NULL,
    manufacturer VARCHAR(64) NOT NULL DEFAULT 'Teltonika',
    model VARCHAR(64) NOT NULL DEFAULT 'Teltonika FMC920',
    protocol VARCHAR(64) NOT NULL DEFAULT 'Teltonika Codec 8 / 8E',
    codec VARCHAR(32) NOT NULL DEFAULT 'Codec 8',
    org_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    vehicle_id VARCHAR(64) REFERENCES vehicles(id) ON DELETE SET NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active', -- 'active', 'disabled', 'revoked'
    firmware_version VARCHAR(64) DEFAULT '03.28.02.Rev.00',
    sim_carrier VARCHAR(64) DEFAULT 'e& (Etisalat) UAE',
    reporting_interval_sec INTEGER NOT NULL DEFAULT 60,
    last_connection_at TIMESTAMPTZ,
    last_communication_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_registered_devices_imei ON registered_devices(imei);
CREATE INDEX IF NOT EXISTS idx_registered_devices_org_id ON registered_devices(org_id);
CREATE INDEX IF NOT EXISTS idx_registered_devices_vehicle_id ON registered_devices(vehicle_id);

CREATE TABLE IF NOT EXISTS device_sessions (
    id VARCHAR(64) PRIMARY KEY,
    device_id VARCHAR(64) NOT NULL REFERENCES registered_devices(id) ON DELETE CASCADE,
    imei VARCHAR(32) NOT NULL,
    remote_ip VARCHAR(64) NOT NULL,
    remote_port INTEGER NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active', -- 'active', 'closed', 'rejected'
    connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    disconnected_at TIMESTAMPTZ,
    packets_received INTEGER NOT NULL DEFAULT 0,
    records_received INTEGER NOT NULL DEFAULT 0,
    bytes_received BIGINT NOT NULL DEFAULT 0,
    disconnect_reason VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_device_sessions_device_id ON device_sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_device_sessions_status ON device_sessions(status);

CREATE TABLE IF NOT EXISTS device_latest_telemetry (
    device_id VARCHAR(64) PRIMARY KEY REFERENCES registered_devices(id) ON DELETE CASCADE,
    vehicle_id VARCHAR(64) REFERENCES vehicles(id) ON DELETE SET NULL,
    imei VARCHAR(32) NOT NULL,
    device_timestamp TIMESTAMPTZ NOT NULL,
    server_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    altitude INTEGER NOT NULL DEFAULT 0,
    angle INTEGER NOT NULL DEFAULT 0,
    speed INTEGER NOT NULL DEFAULT 0,
    satellites INTEGER NOT NULL DEFAULT 0,
    ignition VARCHAR(16) NOT NULL DEFAULT 'Unknown', -- 'ON', 'OFF', 'Unknown'
    movement VARCHAR(16) NOT NULL DEFAULT 'Stationary', -- 'Moving', 'Stationary'
    external_voltage DOUBLE PRECISION, -- Converted from mV to Volts (AVL ID 66)
    internal_battery_voltage DOUBLE PRECISION, -- Converted from mV to Volts (AVL ID 67)
    gsm_signal INTEGER, -- 0-5 bars (AVL ID 21)
    raw_payload_hex TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS historical_telemetry (
    id VARCHAR(64) PRIMARY KEY,
    device_id VARCHAR(64) NOT NULL REFERENCES registered_devices(id) ON DELETE CASCADE,
    vehicle_id VARCHAR(64) REFERENCES vehicles(id) ON DELETE SET NULL,
    org_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    device_timestamp TIMESTAMPTZ NOT NULL,
    server_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    priority INTEGER NOT NULL DEFAULT 0,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    altitude INTEGER NOT NULL DEFAULT 0,
    angle INTEGER NOT NULL DEFAULT 0,
    speed INTEGER NOT NULL DEFAULT 0,
    satellites INTEGER NOT NULL DEFAULT 0,
    ignition VARCHAR(16) NOT NULL DEFAULT 'Unknown', -- 'ON', 'OFF', 'Unknown'
    movement VARCHAR(16) NOT NULL DEFAULT 'Stationary',
    external_voltage DOUBLE PRECISION,
    internal_battery_voltage DOUBLE PRECISION,
    gsm_signal INTEGER,
    io_elements JSONB,
    codec_id VARCHAR(16) NOT NULL DEFAULT '0x08',
    raw_payload_hex TEXT,
    CONSTRAINT uq_device_timestamp UNIQUE (device_id, device_timestamp)
);

CREATE INDEX IF NOT EXISTS idx_hist_telemetry_device_time ON historical_telemetry(device_id, device_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_hist_telemetry_org_time ON historical_telemetry(org_id, device_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_hist_telemetry_vehicle_time ON historical_telemetry(vehicle_id, device_timestamp DESC);

CREATE TABLE IF NOT EXISTS ignition_events (
    id VARCHAR(64) PRIMARY KEY,
    device_id VARCHAR(64) NOT NULL REFERENCES registered_devices(id) ON DELETE CASCADE,
    vehicle_id VARCHAR(64) REFERENCES vehicles(id) ON DELETE SET NULL,
    org_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    event_type VARCHAR(32) NOT NULL, -- 'IGNITION_ON', 'IGNITION_OFF'
    timestamp TIMESTAMPTZ NOT NULL,
    server_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    external_voltage DOUBLE PRECISION
);

CREATE INDEX IF NOT EXISTS idx_ignition_events_vehicle ON ignition_events(vehicle_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ignition_events_device ON ignition_events(device_id, timestamp DESC);

CREATE TABLE IF NOT EXISTS device_communication_logs (
    id VARCHAR(64) PRIMARY KEY,
    device_id VARCHAR(64) REFERENCES registered_devices(id) ON DELETE SET NULL,
    imei VARCHAR(32),
    vehicle_id VARCHAR(64) REFERENCES vehicles(id) ON DELETE SET NULL,
    org_id VARCHAR(64) REFERENCES organizations(id) ON DELETE SET NULL,
    event_type VARCHAR(64) NOT NULL,
    severity VARCHAR(16) NOT NULL DEFAULT 'INFO', -- 'INFO', 'WARN', 'ERROR'
    message TEXT NOT NULL,
    packet_ref VARCHAR(64),
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comm_logs_device ON device_communication_logs(device_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comm_logs_severity ON device_communication_logs(severity, created_at DESC);

CREATE TABLE IF NOT EXISTS packet_parsing_errors (
    id VARCHAR(64) PRIMARY KEY,
    device_id VARCHAR(64) REFERENCES registered_devices(id) ON DELETE SET NULL,
    imei VARCHAR(32),
    remote_ip VARCHAR(64),
    error_type VARCHAR(64) NOT NULL,
    error_message TEXT NOT NULL,
    raw_hex TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ingestion_stats (
    metric_key VARCHAR(64) PRIMARY KEY,
    metric_value BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Organizations
INSERT INTO organizations (id, name) VALUES
  ('platform', 'Trackwe Global Platform'),
  ('org-dubai', 'Dubai Logistics Fleet'),
  ('org-emirates', 'Emirates Express Cargo'),
  ('org-capital', 'Abu Dhabi Premier Transit')
ON CONFLICT (id) DO NOTHING;

-- Seed Demo / Administrative Accounts
INSERT INTO users (id, name, email, role, org_id) VALUES
  ('account-super', 'Moin', 'superadmin@trackwe.demo', 'Super Admin', 'platform'),
  ('account-admin', 'Ahmed Ali', 'admin@trackwe.demo', 'Admin', 'org-dubai'),
  ('account-manager', 'Sara Khalid', 'manager@trackwe.demo', 'Manager', 'org-dubai'),
  ('account-employee', 'Omar Hassan', 'employee@trackwe.demo', 'Employee', 'org-dubai')
ON CONFLICT (id) DO NOTHING;

-- Seed Initial Fleet Vehicles
INSERT INTO vehicles (id, registration, name, vehicle_type, org_id, driver) VALUES
  ('v1', 'Dubai A 10243', 'Dubai Urban Van 01', 'Van', 'org-dubai', 'Rashid Al-Nuaimi'),
  ('v2', 'Dubai B 28491', 'Jebel Ali Heavy Hauler', 'Truck', 'org-dubai', 'Tariq Mansoor'),
  ('v3', 'Dubai C 39201', 'Deira Express Sprinter', 'Van', 'org-dubai', 'Zayed Farooq'),
  ('v4', 'Dubai D 44102', 'Downtown Reefer 04', 'Reefer', 'org-dubai', 'Hamad Qasim'),
  ('v5', 'Abu Dhabi B 40591', 'Capital Heavy Logistics', 'Truck', 'org-capital', 'Sultan Al-Dhaheri')
ON CONFLICT (id) DO NOTHING;

-- Seed FMC920 Hardware Registration (Status: Active / Awaiting real connection)
INSERT INTO registered_devices (
  id, imei, manufacturer, model, protocol, codec, org_id, vehicle_id, status, firmware_version, sim_carrier, reporting_interval_sec
) VALUES (
  'dev-fmc920-01', '864022089340664', 'Teltonika', 'FMC920', 'Teltonika TCP AVL', 'Codec 8 / Codec 8 Extended', 'org-dubai', 'v1', 'active', '03.28.02.Rev.00', 'e& (Etisalat) UAE', 60
) ON CONFLICT (imei) DO UPDATE SET
  status = 'active',
  model = 'FMC920',
  protocol = 'Teltonika TCP AVL',
  codec = 'Codec 8 / Codec 8 Extended';


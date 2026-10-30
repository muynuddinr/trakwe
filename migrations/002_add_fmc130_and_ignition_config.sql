-- Trackwe Telematics Database Schema Migration 002
-- Extends Teltonika support for FMC130 and configurable multi-source ignition detection

-- 1. Extend registered_devices with ignition configuration and model telemetry profile
ALTER TABLE registered_devices ADD COLUMN IF NOT EXISTS ignition_source VARCHAR(32) DEFAULT 'DIN1';
ALTER TABLE registered_devices ADD COLUMN IF NOT EXISTS ignition_high_threshold DOUBLE PRECISION DEFAULT 13.2;
ALTER TABLE registered_devices ADD COLUMN IF NOT EXISTS ignition_low_threshold DOUBLE PRECISION DEFAULT 12.8;
ALTER TABLE registered_devices ADD COLUMN IF NOT EXISTS ignition_rpm_threshold INTEGER DEFAULT 400;
ALTER TABLE registered_devices ADD COLUMN IF NOT EXISTS telemetry_profile JSONB DEFAULT '{}';

-- 2. Extend device_latest_telemetry with FMC130 extended metrics and raw I/O
ALTER TABLE device_latest_telemetry ADD COLUMN IF NOT EXISTS odometer_km DOUBLE PRECISION;
ALTER TABLE device_latest_telemetry ADD COLUMN IF NOT EXISTS fuel_level DOUBLE PRECISION;
ALTER TABLE device_latest_telemetry ADD COLUMN IF NOT EXISTS fuel_used_liters DOUBLE PRECISION;
ALTER TABLE device_latest_telemetry ADD COLUMN IF NOT EXISTS engine_rpm INTEGER;
ALTER TABLE device_latest_telemetry ADD COLUMN IF NOT EXISTS engine_temp INTEGER;
ALTER TABLE device_latest_telemetry ADD COLUMN IF NOT EXISTS din1 INTEGER;
ALTER TABLE device_latest_telemetry ADD COLUMN IF NOT EXISTS din2 INTEGER;
ALTER TABLE device_latest_telemetry ADD COLUMN IF NOT EXISTS din3 INTEGER;
ALTER TABLE device_latest_telemetry ADD COLUMN IF NOT EXISTS ain1_mv INTEGER;
ALTER TABLE device_latest_telemetry ADD COLUMN IF NOT EXISTS ain2_mv INTEGER;
ALTER TABLE device_latest_telemetry ADD COLUMN IF NOT EXISTS io_elements JSONB;

-- 3. Extend historical_telemetry with FMC130 telematics parameters
ALTER TABLE historical_telemetry ADD COLUMN IF NOT EXISTS odometer_km DOUBLE PRECISION;
ALTER TABLE historical_telemetry ADD COLUMN IF NOT EXISTS fuel_level DOUBLE PRECISION;
ALTER TABLE historical_telemetry ADD COLUMN IF NOT EXISTS fuel_used_liters DOUBLE PRECISION;
ALTER TABLE historical_telemetry ADD COLUMN IF NOT EXISTS engine_rpm INTEGER;
ALTER TABLE historical_telemetry ADD COLUMN IF NOT EXISTS engine_temp INTEGER;
ALTER TABLE historical_telemetry ADD COLUMN IF NOT EXISTS din1 INTEGER;
ALTER TABLE historical_telemetry ADD COLUMN IF NOT EXISTS din2 INTEGER;
ALTER TABLE historical_telemetry ADD COLUMN IF NOT EXISTS din3 INTEGER;
ALTER TABLE historical_telemetry ADD COLUMN IF NOT EXISTS ain1_mv INTEGER;
ALTER TABLE historical_telemetry ADD COLUMN IF NOT EXISTS ain2_mv INTEGER;

-- 4. Create index for fast model-based filtering
CREATE INDEX IF NOT EXISTS idx_registered_devices_model ON registered_devices(model);


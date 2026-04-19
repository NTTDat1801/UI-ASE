-- KidGuard / CLMS — MySQL schema (aligns with clms-backend ensureSchema + upsert logic)
-- Optional: periodic snapshot child_latest_location → location_history is done in Node
-- (LOCATION_SNAPSHOT_INTERVAL_MS; default 1 min in code for test, use 3600000 for 60 min prod), not MySQL EVENT.

CREATE DATABASE IF NOT EXISTS clms
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE clms;

CREATE TABLE IF NOT EXISTS geofence (
  id BIGINT NOT NULL AUTO_INCREMENT,
  child_id VARCHAR(128) NOT NULL,
  center_lat DOUBLE NOT NULL,
  center_lng DOUBLE NOT NULL,
  radius_meters DOUBLE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY child_id (child_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS child_latest_location (
  id BIGINT NOT NULL AUTO_INCREMENT,
  child_id VARCHAR(128) NOT NULL,
  lat DOUBLE NOT NULL,
  lng DOUBLE NOT NULL,
  captured_at BIGINT NOT NULL COMMENT 'Unix epoch ms when position was captured',
  geofence_violated TINYINT(1) NOT NULL DEFAULT 0,
  distance_from_center_meters DOUBLE DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY child_id (child_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS location_history (
  id BIGINT NOT NULL AUTO_INCREMENT,
  child_id VARCHAR(128) NOT NULL,
  lat DOUBLE NOT NULL,
  lng DOUBLE NOT NULL,
  captured_at BIGINT NOT NULL,
  geofence_violated TINYINT(1) NOT NULL DEFAULT 0,
  distance_from_center_meters DOUBLE DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_location_history_child_time (child_id, captured_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

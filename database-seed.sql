-- Seed sau khi xóa data (chạy trong DBeaver / mysql CLI, đã USE clms;)
-- Thing ID / child_id: cb184099-9a5c-4a47-a5cc-d712bff00f7a

USE clms;

INSERT INTO geofence (child_id, center_lat, center_lng, radius_meters)
VALUES ('cb184099-9a5c-4a47-a5cc-d712bff00f7a', 10.928, 106.702, 800)
ON DUPLICATE KEY UPDATE
  center_lat = VALUES(center_lat),
  center_lng = VALUES(center_lng),
  radius_meters = VALUES(radius_meters);

INSERT INTO child_latest_location (
  child_id, lat, lng, captured_at, geofence_violated, distance_from_center_meters
) VALUES (
  'cb184099-9a5c-4a47-a5cc-d712bff00f7a',
  10.928,
  106.702,
  UNIX_TIMESTAMP() * 1000,
  0,
  NULL
)
ON DUPLICATE KEY UPDATE
  lat = VALUES(lat),
  lng = VALUES(lng),
  captured_at = VALUES(captured_at),
  geofence_violated = VALUES(geofence_violated),
  distance_from_center_meters = VALUES(distance_from_center_meters);

INSERT INTO location_history (
  child_id, lat, lng, captured_at, geofence_violated, distance_from_center_meters
) VALUES (
  'cb184099-9a5c-4a47-a5cc-d712bff00f7a',
  10.928,
  106.702,
  UNIX_TIMESTAMP() * 1000,
  0,
  NULL
);

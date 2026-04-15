import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import mysql from 'mysql2/promise'

dotenv.config()

const app = express()
const port = Number(process.env.PORT || 8080)

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USERNAME || 'clms_user',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'clms',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
}

const pool = mysql.createPool(dbConfig)

app.use(cors())
app.use(express.json())

function haversineMeters(lat1, lng1, lat2, lng2) {
  const earthRadius = 6371000
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS geofence (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      child_id VARCHAR(128) NOT NULL UNIQUE,
      center_lat DOUBLE NOT NULL,
      center_lng DOUBLE NOT NULL,
      radius_meters DOUBLE NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS child_latest_location (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      child_id VARCHAR(128) NOT NULL UNIQUE,
      lat DOUBLE NOT NULL,
      lng DOUBLE NOT NULL,
      captured_at BIGINT NOT NULL,
      geofence_violated BOOLEAN NOT NULL DEFAULT FALSE,
      distance_from_center_meters DOUBLE NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS location_history (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      child_id VARCHAR(128) NOT NULL,
      lat DOUBLE NOT NULL,
      lng DOUBLE NOT NULL,
      captured_at BIGINT NOT NULL,
      geofence_violated BOOLEAN NOT NULL DEFAULT FALSE,
      distance_from_center_meters DOUBLE NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_location_history_child_time (child_id, captured_at DESC)
    )
  `)
}

app.get('/health', async (_req, res) => {
  await pool.query('SELECT 1')
  res.json({ ok: true, service: 'clms-node-backend' })
})

// Some webhook providers validate URL with GET/HEAD before saving.
app.get('/api/webhooks/arduino/gps', (_req, res) => {
  res.json({ ok: true, message: 'Webhook endpoint is reachable. Use POST to send GPS payload.' })
})

app.head('/api/webhooks/arduino/gps', (_req, res) => {
  res.status(200).end()
})

app.post('/api/geofences', async (req, res) => {
  const { childId, centerLat, centerLng, radiusMeters } = req.body ?? {}
  if (!childId || !Number.isFinite(centerLat) || !Number.isFinite(centerLng) || !Number.isFinite(radiusMeters) || radiusMeters <= 0) {
    return res.status(400).json({ message: 'Invalid geofence payload.' })
  }

  await pool.query(
    `INSERT INTO geofence (child_id, center_lat, center_lng, radius_meters)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       center_lat = VALUES(center_lat),
       center_lng = VALUES(center_lng),
       radius_meters = VALUES(radius_meters)`,
    [childId, centerLat, centerLng, radiusMeters],
  )

  return res.json({
    childId,
    centerLat,
    centerLng,
    radiusMeters,
  })
})

app.post('/api/webhooks/arduino/gps', async (req, res) => {
  const { childId, lat, lng, timestamp } = req.body ?? {}
  if (!childId || !Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(timestamp)) {
    return res.status(400).json({
      message: 'Payload must include childId(string), lat(number), lng(number), timestamp(number).',
    })
  }

  const [geofenceRows] = await pool.query(
    'SELECT center_lat, center_lng, radius_meters FROM geofence WHERE child_id = ? LIMIT 1',
    [childId],
  )

  let geofenceViolated = false
  let distanceFromCenterMeters = null

  if (Array.isArray(geofenceRows) && geofenceRows.length > 0) {
    const geofence = geofenceRows[0]
    distanceFromCenterMeters = haversineMeters(lat, lng, geofence.center_lat, geofence.center_lng)
    geofenceViolated = distanceFromCenterMeters > geofence.radius_meters
  }

  await pool.query(
    `INSERT INTO child_latest_location (child_id, lat, lng, captured_at, geofence_violated, distance_from_center_meters)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       lat = VALUES(lat),
       lng = VALUES(lng),
       captured_at = VALUES(captured_at),
       geofence_violated = VALUES(geofence_violated),
       distance_from_center_meters = VALUES(distance_from_center_meters)`,
    [childId, lat, lng, Math.trunc(timestamp), geofenceViolated, distanceFromCenterMeters],
  )

  await pool.query(
    `INSERT INTO location_history (child_id, lat, lng, captured_at, geofence_violated, distance_from_center_meters)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [childId, lat, lng, Math.trunc(timestamp), geofenceViolated, distanceFromCenterMeters],
  )

  await pool.query(
    `DELETE FROM location_history
     WHERE child_id = ?
       AND id NOT IN (
         SELECT id FROM (
           SELECT id
           FROM location_history
           WHERE child_id = ?
           ORDER BY captured_at DESC
           LIMIT 100
         ) AS keep_rows
       )`,
    [childId, childId],
  )

  return res.status(202).json({
    childId,
    lat,
    lng,
    timestamp: Math.trunc(timestamp),
    geofenceViolated,
    distanceFromCenterMeters,
  })
})

app.get('/api/location/latest/:childId', async (req, res) => {
  const { childId } = req.params
  const [rows] = await pool.query(
    `SELECT child_id AS childId, lat, lng, captured_at AS timestamp,
            geofence_violated AS geofenceViolated,
            distance_from_center_meters AS distanceFromCenterMeters
     FROM child_latest_location WHERE child_id = ? LIMIT 1`,
    [childId],
  )
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(404).json({ message: 'No location found for child.' })
  }
  return res.json(rows[0])
})

app.get('/api/location/history/:childId', async (req, res) => {
  const { childId } = req.params
  const [rows] = await pool.query(
    `SELECT child_id AS childId, lat, lng, captured_at AS timestamp,
            geofence_violated AS geofenceViolated,
            distance_from_center_meters AS distanceFromCenterMeters
     FROM location_history
     WHERE child_id = ?
     ORDER BY captured_at DESC
     LIMIT 100`,
    [childId],
  )
  return res.json(rows)
})

app.use((error, _req, res, _next) => {
  console.error(error)
  res.status(500).json({ message: 'Internal server error' })
})

ensureSchema()
  .then(() => {
    app.listen(port, () => {
      console.log(`CLMS backend running on http://localhost:${port}`)
    })
  })
  .catch((error) => {
    console.error('Failed to initialize DB schema:', error.message)
    process.exit(1)
  })

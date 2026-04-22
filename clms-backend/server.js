import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import mysql from 'mysql2/promise'

import { fetchThingPropertiesRaw, pickLatLngFromPropertiesPayload } from './arduinoCloud.js'
import { tryExtractLatLngFromGpsJsonValue } from './gpsParse.js'

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
const GLOBAL_SAFEZONE_CHILD_ID = '__ALL__'

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

function isWgs84(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng)
    && lat >= -90 && lat <= 90
    && lng >= -180 && lng <= 180
}

function parseCsvIds(raw) {
  if (typeof raw !== 'string') return []
  return raw
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
}

/**
 * Some clients (e.g. Shortcuts) send lat/lng as huge integers. Try lat/10^a, lng/10^b
 * until WGS84 fits. Same power for both (e.g. /1e14) rarely works for lng vs lat magnitude.
 */
function tryDenormalizeScaledIntegerGps(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (isWgs84(lat, lng)) return { lat, lng, scaled: false }
  const scales = []
  for (let e = 5; e <= 16; e++) scales.push(10 ** e)
  for (const slat of scales) {
    for (const slng of scales) {
      const la = lat / slat
      const lo = lng / slng
      if (isWgs84(la, lo)) return { lat: la, lng: lo, scaled: true }
    }
  }
  return null
}

/** Accept seconds or ms; return epoch ms or null if out of plausible range */
function normalizeEpochMs(raw) {
  let ts = raw
  if (typeof ts === 'string' && ts.trim() !== '') ts = Number(ts)
  if (!Number.isFinite(ts)) return null
  let ms = Math.trunc(ts)
  if (ms > 0 && ms < 1e12) ms *= 1000
  const min = 946684800000
  const max = Date.now() + 86400000 * 365 * 2
  if (ms < min || ms > max) return null
  return ms
}

function validateGpsForStorage({ lat, lng, timestamp }) {
  const decoded = tryDenormalizeScaledIntegerGps(lat, lng)
  if (!decoded) {
    return {
      ok: false,
      message:
        'lat/lng must be WGS84 decimal degrees, or huge integers that decode after dividing by powers of ten (e.g. Shortcuts). Example degrees: lat 10.773, lng 106.66.',
    }
  }
  const ms = normalizeEpochMs(timestamp)
  if (ms == null) {
    return {
      ok: false,
      message:
        'timestamp must be Unix time in milliseconds (about 13 digits). In Shortcuts use Current Date → Format as epoch ms, or multiply seconds by 1000.',
    }
  }
  return {
    ok: true,
    lat: decoded.lat,
    lng: decoded.lng,
    timestamp: ms,
    integerScaled: decoded.scaled,
  }
}

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS children (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      child_id VARCHAR(128) NOT NULL UNIQUE,
      display_name VARCHAR(128) NOT NULL,
      thing_id VARCHAR(128) NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS safe_zones (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      child_id VARCHAR(128) NOT NULL,
      zone_name VARCHAR(128) NOT NULL,
      shape_type VARCHAR(16) NOT NULL DEFAULT 'circle',
      center_lat DOUBLE NOT NULL,
      center_lng DOUBLE NOT NULL,
      radius_meters DOUBLE NOT NULL,
      corner_a_lat DOUBLE NULL,
      corner_a_lng DOUBLE NULL,
      corner_c_lat DOUBLE NULL,
      corner_c_lng DOUBLE NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_safe_zones_child (child_id, active)
    )
  `)

  // Backfill new rectangle columns for existing deployments (compatible with MySQL versions
  // that do not support `ADD COLUMN IF NOT EXISTS`).
  const ensureColumn = async (tableName, columnName, ddl) => {
    const [rows] = await pool.query(
      `SELECT 1
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = ?
         AND column_name = ?
       LIMIT 1`,
      [tableName, columnName],
    )
    if (Array.isArray(rows) && rows.length > 0) return
    await pool.query(`ALTER TABLE ${tableName} ADD COLUMN ${ddl}`)
  }

  await ensureColumn('safe_zones', 'shape_type', "shape_type VARCHAR(16) NOT NULL DEFAULT 'circle'")
  await ensureColumn('safe_zones', 'corner_a_lat', 'corner_a_lat DOUBLE NULL')
  await ensureColumn('safe_zones', 'corner_a_lng', 'corner_a_lng DOUBLE NULL')
  await ensureColumn('safe_zones', 'corner_c_lat', 'corner_c_lat DOUBLE NULL')
  await ensureColumn('safe_zones', 'corner_c_lng', 'corner_c_lng DOUBLE NULL')

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

async function listPollTargets() {
  const [rows] = await pool.query(
    `SELECT child_id, thing_id
     FROM children
     WHERE active = TRUE`,
  )

  const targets = []
  if (Array.isArray(rows) && rows.length > 0) {
    for (const row of rows) {
      const childId = typeof row.child_id === 'string' ? row.child_id : ''
      const thingId = typeof row.thing_id === 'string' && row.thing_id ? row.thing_id : childId
      if (childId && thingId) targets.push({ childId, thingId })
    }
  }

  if (targets.length > 0) return targets

  const envChildIds = parseCsvIds(process.env.ARDUINO_CHILD_IDS || process.env.ARDUINO_CHILD_ID || '')
  const envThingIds = parseCsvIds(process.env.ARDUINO_THING_IDS || process.env.ARDUINO_THING_ID || '')

  const fallbackTargets = []
  const max = Math.max(envChildIds.length, envThingIds.length)
  for (let i = 0; i < max; i += 1) {
    const childId = envChildIds[i] || envThingIds[i]
    const thingId = envThingIds[i] || envChildIds[i]
    if (childId && thingId) fallbackTargets.push({ childId, thingId })
  }
  return fallbackTargets
}

async function pickZoneStatusForChild(childId, lat, lng) {
  const [rows] = await pool.query(
    `SELECT id, zone_name, shape_type, center_lat, center_lng, radius_meters,
            corner_a_lat, corner_a_lng, corner_c_lat, corner_c_lng
     FROM safe_zones
     WHERE child_id IN (?, ?) AND active = TRUE`,
    [childId, GLOBAL_SAFEZONE_CHILD_ID],
  )

  if (Array.isArray(rows) && rows.length > 0) {
    let insideAny = false
    let minDistance = Number.POSITIVE_INFINITY
    let matchedZone = null
    for (const zone of rows) {
      const shapeType = zone.shape_type === 'rectangle' ? 'rectangle' : 'circle'
      let distance = haversineMeters(lat, lng, zone.center_lat, zone.center_lng)
      let isInside = false
      if (shapeType === 'rectangle'
        && Number.isFinite(zone.corner_a_lat)
        && Number.isFinite(zone.corner_a_lng)
        && Number.isFinite(zone.corner_c_lat)
        && Number.isFinite(zone.corner_c_lng)) {
        const minLat = Math.min(zone.corner_a_lat, zone.corner_c_lat)
        const maxLat = Math.max(zone.corner_a_lat, zone.corner_c_lat)
        const minLng = Math.min(zone.corner_a_lng, zone.corner_c_lng)
        const maxLng = Math.max(zone.corner_a_lng, zone.corner_c_lng)
        isInside = lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng
        distance = 0
      } else {
        isInside = distance <= zone.radius_meters
      }
      if (distance < minDistance) {
        minDistance = distance
        matchedZone = zone
      }
      if (isInside) {
        insideAny = true
      }
    }
    return {
      geofenceViolated: !insideAny,
      distanceFromCenterMeters: Number.isFinite(minDistance) ? minDistance : null,
      matchedZoneName: matchedZone?.zone_name ?? null,
    }
  }

  // Backward compatibility with old single-zone table.
  const [legacyRows] = await pool.query(
    'SELECT center_lat, center_lng, radius_meters FROM geofence WHERE child_id = ? LIMIT 1',
    [childId],
  )
  if (!Array.isArray(legacyRows) || legacyRows.length === 0) {
    return { geofenceViolated: false, distanceFromCenterMeters: null, matchedZoneName: null }
  }
  const geofence = legacyRows[0]
  const distanceFromCenterMeters = haversineMeters(lat, lng, geofence.center_lat, geofence.center_lng)
  return {
    geofenceViolated: distanceFromCenterMeters > geofence.radius_meters,
    distanceFromCenterMeters,
    matchedZoneName: null,
  }
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

app.get('/api/children', async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT child_id AS childId, display_name AS displayName, thing_id AS thingId, active, created_at AS createdAt
     FROM children
     ORDER BY created_at ASC`,
  )
  return res.json(rows)
})

app.post('/api/children', async (req, res) => {
  const { childId, displayName, thingId } = req.body ?? {}
  if (!childId || typeof childId !== 'string') {
    return res.status(400).json({ message: 'childId is required.' })
  }
  const safeDisplayName = typeof displayName === 'string' && displayName.trim()
    ? displayName.trim()
    : `Child ${childId.slice(0, 6)}`
  const safeThingId = typeof thingId === 'string' && thingId.trim() ? thingId.trim() : childId

  await pool.query(
    `INSERT INTO children (child_id, display_name, thing_id, active)
     VALUES (?, ?, ?, TRUE)
     ON DUPLICATE KEY UPDATE
       display_name = VALUES(display_name),
       thing_id = VALUES(thing_id),
       active = TRUE`,
    [childId.trim(), safeDisplayName, safeThingId],
  )
  return res.status(201).json({ childId: childId.trim(), displayName: safeDisplayName, thingId: safeThingId })
})

app.patch('/api/children/:childId', async (req, res) => {
  const { childId } = req.params
  const { displayName, thingId, active } = req.body ?? {}
  const fields = []
  const values = []
  if (typeof displayName === 'string' && displayName.trim()) {
    fields.push('display_name = ?')
    values.push(displayName.trim())
  }
  if (typeof thingId === 'string' && thingId.trim()) {
    fields.push('thing_id = ?')
    values.push(thingId.trim())
  }
  if (typeof active === 'boolean') {
    fields.push('active = ?')
    values.push(active)
  }
  if (fields.length === 0) {
    return res.status(400).json({ message: 'No updatable fields.' })
  }
  values.push(childId)
  await pool.query(`UPDATE children SET ${fields.join(', ')} WHERE child_id = ?`, values)
  return res.json({ ok: true, childId })
})

app.get('/api/safezones/:childId', async (req, res) => {
  const { childId } = req.params
  const [rows] = await pool.query(
    `SELECT id, child_id AS childId, zone_name AS zoneName, shape_type AS shapeType,
            center_lat AS centerLat, center_lng AS centerLng, radius_meters AS radiusMeters,
            corner_a_lat AS cornerALat, corner_a_lng AS cornerALng,
            corner_c_lat AS cornerCLat, corner_c_lng AS cornerCLng,
            active, created_at AS createdAt
     FROM safe_zones
     WHERE child_id IN (?, ?)
     ORDER BY created_at DESC`,
    [childId, GLOBAL_SAFEZONE_CHILD_ID],
  )
  return res.json(rows)
})

app.get('/api/safezones', async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT id, child_id AS childId, zone_name AS zoneName, shape_type AS shapeType,
            center_lat AS centerLat, center_lng AS centerLng, radius_meters AS radiusMeters,
            corner_a_lat AS cornerALat, corner_a_lng AS cornerALng,
            corner_c_lat AS cornerCLat, corner_c_lng AS cornerCLng,
            active, created_at AS createdAt
     FROM safe_zones
     WHERE child_id = ?
     ORDER BY created_at DESC`,
    [GLOBAL_SAFEZONE_CHILD_ID],
  )
  return res.json(rows)
})

app.post('/api/safezones', async (req, res) => {
  const {
    childId,
    zoneName,
    shapeType,
    centerLat,
    centerLng,
    edgeLat,
    edgeLng,
    radiusMeters,
    cornerALat,
    cornerALng,
    cornerCLat,
    cornerCLng,
  } = req.body ?? {}
  const effectiveChildId = typeof childId === 'string' && childId.trim()
    ? childId.trim()
    : GLOBAL_SAFEZONE_CHILD_ID
  if (!zoneName || typeof zoneName !== 'string' || !zoneName.trim()) {
    return res.status(400).json({ message: 'zoneName is required.' })
  }
  if (!Number.isFinite(centerLat) || !Number.isFinite(centerLng)) {
    return res.status(400).json({ message: 'centerLat/centerLng must be numbers.' })
  }
  const normalizedShape = shapeType === 'rectangle' ? 'rectangle' : 'circle'
  let computedRadius = Number(radiusMeters)
  let safeCornerALat = null
  let safeCornerALng = null
  let safeCornerCLat = null
  let safeCornerCLng = null

  if (normalizedShape === 'rectangle') {
    safeCornerALat = Number(cornerALat)
    safeCornerALng = Number(cornerALng)
    safeCornerCLat = Number(cornerCLat)
    safeCornerCLng = Number(cornerCLng)
    if (
      !Number.isFinite(safeCornerALat)
      || !Number.isFinite(safeCornerALng)
      || !Number.isFinite(safeCornerCLat)
      || !Number.isFinite(safeCornerCLng)
    ) {
      return res.status(400).json({ message: 'Rectangle requires cornerALat/cornerALng/cornerCLat/cornerCLng.' })
    }
    const latSpan = Math.abs(safeCornerALat - safeCornerCLat)
    const lngSpan = Math.abs(safeCornerALng - safeCornerCLng)
    if (latSpan < 0.00001 || lngSpan < 0.00001) {
      return res.status(400).json({ message: 'Rectangle zone is too small.' })
    }
    const midLat = (safeCornerALat + safeCornerCLat) / 2
    const midLng = (safeCornerALng + safeCornerCLng) / 2
    computedRadius = haversineMeters(midLat, midLng, safeCornerALat, safeCornerALng)
  } else if (!Number.isFinite(computedRadius) || computedRadius <= 0) {
    if (!Number.isFinite(edgeLat) || !Number.isFinite(edgeLng)) {
      return res.status(400).json({ message: 'Provide edgeLat/edgeLng or radiusMeters.' })
    }
    computedRadius = haversineMeters(centerLat, centerLng, edgeLat, edgeLng)
  }
  if (!Number.isFinite(computedRadius) || computedRadius < 10) {
    return res.status(400).json({ message: 'radiusMeters is too small.' })
  }

  const [insertResult] = await pool.query(
    `INSERT INTO safe_zones
      (child_id, zone_name, shape_type, center_lat, center_lng, radius_meters,
       corner_a_lat, corner_a_lng, corner_c_lat, corner_c_lng, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
    [
      effectiveChildId,
      zoneName.trim(),
      normalizedShape,
      centerLat,
      centerLng,
      computedRadius,
      safeCornerALat,
      safeCornerALng,
      safeCornerCLat,
      safeCornerCLng,
    ],
  )
  return res.status(201).json({
    id: insertResult.insertId,
    childId: effectiveChildId,
    zoneName: zoneName.trim(),
    shapeType: normalizedShape,
    centerLat,
    centerLng,
    radiusMeters: computedRadius,
    cornerALat: safeCornerALat,
    cornerALng: safeCornerALng,
    cornerCLat: safeCornerCLat,
    cornerCLng: safeCornerCLng,
    active: true,
  })
})

app.patch('/api/safezones/:zoneId', async (req, res) => {
  const zoneId = Number(req.params.zoneId)
  if (!Number.isFinite(zoneId) || zoneId <= 0) {
    return res.status(400).json({ message: 'Invalid zoneId.' })
  }
  const { zoneName, active } = req.body ?? {}
  const fields = []
  const values = []
  if (typeof zoneName === 'string' && zoneName.trim()) {
    fields.push('zone_name = ?')
    values.push(zoneName.trim())
  }
  if (typeof active === 'boolean') {
    fields.push('active = ?')
    values.push(active)
  }
  if (fields.length === 0) {
    return res.status(400).json({ message: 'No updatable fields.' })
  }
  values.push(zoneId)
  await pool.query(`UPDATE safe_zones SET ${fields.join(', ')} WHERE id = ?`, values)
  return res.json({ ok: true, zoneId })
})

app.delete('/api/safezones/:zoneId', async (req, res) => {
  const zoneId = Number(req.params.zoneId)
  if (!Number.isFinite(zoneId) || zoneId <= 0) {
    return res.status(400).json({ message: 'Invalid zoneId.' })
  }
  await pool.query('DELETE FROM safe_zones WHERE id = ?', [zoneId])
  return res.json({ ok: true, zoneId })
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
    zoneName: 'Legacy geofence',
    centerLat,
    centerLng,
    radiusMeters,
  })
})

let locationSnapshotEmptyHintShown = false

async function trimLocationHistoryForChild(childId) {
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
}

/** Append current `child_latest_location` rows to `location_history` (scheduled snapshot). */
async function snapshotLatestToHistory() {
  const [rows] = await pool.query(
    'SELECT child_id, lat, lng, geofence_violated, distance_from_center_meters FROM child_latest_location',
  )
  if (!Array.isArray(rows) || rows.length === 0) {
    if (!locationSnapshotEmptyHintShown) {
      locationSnapshotEmptyHintShown = true
      console.log(
        '[location snapshot] child_latest_location is still empty — snapshots only copy existing rows. Send GPS once (Arduino poll with API credentials, POST /api/sync/arduino-cloud, or POST /api/webhooks/arduino/gps). Further empty runs are silent.',
      )
    }
    return
  }

  locationSnapshotEmptyHintShown = false

  const now = Date.now()
  for (const row of rows) {
    await pool.query(
      `INSERT INTO location_history (child_id, lat, lng, captured_at, geofence_violated, distance_from_center_meters)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        row.child_id,
        row.lat,
        row.lng,
        now,
        Boolean(row.geofence_violated),
        row.distance_from_center_meters,
      ],
    )
    await trimLocationHistoryForChild(row.child_id)
  }
  console.log(
    `[location snapshot] archived ${rows.length} child row(s) from child_latest_location → location_history`,
  )
}

/** Pull Thing properties from Arduino IoT Cloud and upsert GPS (uses Gps JSON or lat/lng variables). */
async function pollArduinoCloudGpsToDb(target) {
  const clientId = process.env.ARDUINO_CLIENT_ID
  const clientSecret = process.env.ARDUINO_CLIENT_SECRET
  const thingId = target?.thingId
  const childId = target?.childId

  if (!clientId || !clientSecret || !thingId) {
    return
  }

  const payload = await fetchThingPropertiesRaw(thingId)
  const { lat, lng, vars } = pickLatLngFromPropertiesPayload(payload)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    console.log('[arduino poll] no lat/lng in Thing properties', Object.keys(vars))
    return
  }

  const v = validateGpsForStorage({ lat, lng, timestamp: Date.now() })
  if (!v.ok) {
    console.warn('[arduino poll]', v.message)
    return
  }

  await upsertGpsLocation({
    childId,
    lat: v.lat,
    lng: v.lng,
    timestamp: v.timestamp,
  })
  console.log('[arduino poll] saved', childId, v.lat, v.lng)
}

function startArduinoCloudPollScheduler() {
  const clientId = process.env.ARDUINO_CLIENT_ID
  const clientSecret = process.env.ARDUINO_CLIENT_SECRET

  const pollMs = Number(process.env.ARDUINO_POLL_INTERVAL_MS ?? 60_000)
  if (!clientId || !clientSecret || !Number.isFinite(pollMs) || pollMs <= 0) {
    return
  }

  const run = async () => {
    try {
      const targets = await listPollTargets()
      for (const target of targets) {
        // eslint-disable-next-line no-await-in-loop
        await pollArduinoCloudGpsToDb(target).catch((err) => {
          console.error('[arduino poll]', target.childId, err.message)
        })
      }
    } catch (err) {
      console.error('[arduino poll] scheduler', err.message)
    }
  }

  const bootDelay = Number(process.env.ARDUINO_POLL_BOOT_DELAY_MS ?? 5_000)
  if (Number.isFinite(bootDelay) && bootDelay >= 0) {
    setTimeout(run, bootDelay)
  }
  setInterval(run, pollMs)

  const label = pollMs >= 60_000 ? `${Math.round(pollMs / 60_000)} min` : `${Math.round(pollMs / 1000)} s`
  console.log(`Arduino Cloud GPS poll every ${label} (targets from children table or env fallback)`)
}

async function upsertGpsLocation({ childId, lat, lng, timestamp }) {
  await pool.query(
    `INSERT INTO children (child_id, display_name, thing_id, active)
     VALUES (?, ?, ?, TRUE)
     ON DUPLICATE KEY UPDATE
       thing_id = COALESCE(thing_id, VALUES(thing_id))`,
    [childId, `Child ${String(childId).slice(0, 6)}`, childId],
  )

  const zoneStatus = await pickZoneStatusForChild(childId, lat, lng)
  const geofenceViolated = zoneStatus.geofenceViolated
  const distanceFromCenterMeters = zoneStatus.distanceFromCenterMeters

  const capturedAt = Math.trunc(timestamp)

  await pool.query(
    `INSERT INTO child_latest_location (child_id, lat, lng, captured_at, geofence_violated, distance_from_center_meters)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       lat = VALUES(lat),
       lng = VALUES(lng),
       captured_at = VALUES(captured_at),
       geofence_violated = VALUES(geofence_violated),
       distance_from_center_meters = VALUES(distance_from_center_meters)`,
    [childId, lat, lng, capturedAt, geofenceViolated, distanceFromCenterMeters],
  )

  await pool.query(
    `INSERT INTO location_history (child_id, lat, lng, captured_at, geofence_violated, distance_from_center_meters)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [childId, lat, lng, capturedAt, geofenceViolated, distanceFromCenterMeters],
  )

  await trimLocationHistoryForChild(childId)

  return {
    childId,
    lat,
    lng,
    timestamp: capturedAt,
    geofenceViolated,
    distanceFromCenterMeters,
    zoneName: zoneStatus.matchedZoneName,
  }
}

/** Arduino IoT Cloud "Data forwarding (Webhook)" often sends `{ values: [{ name, value }] }`. */
function parseLatLngFromArduinoCloudBody(body) {
  const vars = {}
  const values = body?.values
  if (Array.isArray(values)) {
    for (const entry of values) {
      const n = entry?.name
      if (typeof n === 'string' && n.length > 0) {
        vars[n.toLowerCase()] = entry.value
      }
    }
  }
  const pickNumber = (keys) => {
    for (const k of keys) {
      const v = vars[k.toLowerCase()]
      if (typeof v === 'number' && Number.isFinite(v)) return v
      if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v)
    }
    return null
  }
  let lat = null
  let lng = null
  for (const k of ['gps', 'location', 'position']) {
    const v = vars[k]
    const pair = tryExtractLatLngFromGpsJsonValue(v)
    if (pair) {
      lat = pair.lat
      lng = pair.lng
      break
    }
  }
  if (lat == null || lng == null) {
    lat = pickNumber(['lat', 'latitude'])
    lng = pickNumber(['lng', 'lon', 'longitude'])
  }
  if (lat == null && Number.isFinite(body?.lat)) lat = body.lat
  if (lng == null && Number.isFinite(body?.lng)) lng = body.lng
  if (lat == null && Number.isFinite(body?.latitude)) lat = body.latitude
  if (lng == null && Number.isFinite(body?.longitude)) lng = body.longitude

  let ts = body?.timestamp ?? body?.time
  if (typeof ts === 'string' && ts.trim() !== '') ts = Number(ts)
  if (!Number.isFinite(ts)) ts = Date.now()
  if (ts < 1e12) ts *= 1000

  return { lat, lng, timestamp: ts }
}

app.post('/api/webhooks/arduino/gps', async (req, res) => {
  const { childId, lat, lng, timestamp } = req.body ?? {}
  if (!childId || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({
      message: 'Payload must include childId(string), lat(number), lng(number). Optional: timestamp(epoch ms); if omitted, server time is used.',
    })
  }
  const ts = Number.isFinite(timestamp) ? timestamp : Date.now()
  const v = validateGpsForStorage({ lat, lng, timestamp: ts })
  if (!v.ok) {
    return res.status(400).json({ message: v.message })
  }
  const result = await upsertGpsLocation({ childId, lat: v.lat, lng: v.lng, timestamp: v.timestamp })
  return res.status(202).json({ ...result, integerScaled: Boolean(v.integerScaled) })
})

app.get('/api/webhooks/arduino/cloud', (_req, res) => {
  res.json({
    ok: true,
    message: 'Arduino Cloud webhook target. Use POST. Pass childId as query (?childId=...) matching your Thing ID.',
  })
})

app.head('/api/webhooks/arduino/cloud', (_req, res) => {
  res.status(200).end()
})

/**
 * Receives Arduino IoT Cloud "Data forwarding" payloads.
 * Configure URL (HTTPS, publicly reachable), e.g.:
 *   https://YOUR_HOST/api/webhooks/arduino/cloud?childId=dcdfbea3-8fea-48ce-a45c-423b0f6057e8
 * Cloud variables should include lat and lng (or latitude/longitude).
 */
app.post('/api/webhooks/arduino/cloud', async (req, res) => {
  const childId =
    (typeof req.query.childId === 'string' && req.query.childId) ||
    (typeof req.body?.childId === 'string' && req.body.childId) ||
    (typeof req.body?.thing_id === 'string' && req.body.thing_id) ||
    (typeof req.body?.thingId === 'string' && req.body.thingId) ||
    ''

  const { lat, lng, timestamp } = parseLatLngFromArduinoCloudBody(req.body ?? {})
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng)

  if (!childId) {
    if (!hasCoords) {
      return res.status(200).json({
        ok: true,
        message:
          'Webhook reachable. Add ?childId=<THING_ID> to the URL, or use /api/webhooks/arduino/cloud/<THING_ID>.',
      })
    }
    return res.status(400).json({
      message:
        'Missing childId. Add ?childId=<your-thing-id> to the webhook URL in Arduino Cloud, or send childId/thing_id in JSON.',
    })
  }

  if (!hasCoords) {
    return res.status(200).json({
      ok: true,
      childId,
      message: 'Webhook ready; no lat/lng in this request (Arduino Cloud URL check).',
    })
  }

  const v = validateGpsForStorage({ lat, lng, timestamp })
  if (!v.ok) {
    return res.status(400).json({ message: v.message })
  }
  const result = await upsertGpsLocation({ childId, lat: v.lat, lng: v.lng, timestamp: v.timestamp })
  return res.status(202).json({ ...result, integerScaled: Boolean(v.integerScaled) })
})

/** Shorter URL for Arduino Cloud (no query string): .../cloud/<THING_ID> */
app.get('/api/webhooks/arduino/cloud/:childId', (req, res) => {
  res.json({
    ok: true,
    childId: req.params.childId,
    message:
      'Arduino Cloud webhook target. Use POST with JSON body; Cloud variables lat and lng (or latitude/longitude).',
  })
})

app.head('/api/webhooks/arduino/cloud/:childId', (_req, res) => {
  res.status(200).end()
})

app.post('/api/webhooks/arduino/cloud/:childId', async (req, res) => {
  const { childId } = req.params
  if (!childId || childId.length < 8) {
    return res.status(400).json({ message: 'Invalid childId in path.' })
  }
  const { lat, lng, timestamp } = parseLatLngFromArduinoCloudBody(req.body ?? {})
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(200).json({
      ok: true,
      childId,
      message: 'Webhook ready; no lat/lng in this request (Arduino Cloud URL check).',
    })
  }
  const v = validateGpsForStorage({ lat, lng, timestamp })
  if (!v.ok) {
    return res.status(400).json({ message: v.message })
  }
  const result = await upsertGpsLocation({ childId, lat: v.lat, lng: v.lng, timestamp: v.timestamp })
  return res.status(202).json({ ...result, integerScaled: Boolean(v.integerScaled) })
})

/**
 * Ultra-short webhook URL for providers with strict URL validation.
 * Configure ARDUINO_CHILD_ID in env to avoid passing childId in URL/query.
 */
app.get('/w', (_req, res) => {
  res.json({
    ok: true,
    message:
      'Short Arduino webhook target. Use POST with lat/lng values. Configure ARDUINO_CHILD_ID on server.',
  })
})

app.head('/w', (_req, res) => {
  res.status(200).end()
})

app.post('/w', async (req, res) => {
  const childId =
    (typeof process.env.ARDUINO_CHILD_ID === 'string' && process.env.ARDUINO_CHILD_ID) ||
    (typeof req.body?.childId === 'string' && req.body.childId) ||
    (typeof req.body?.thing_id === 'string' && req.body.thing_id) ||
    ''

  if (!childId) {
    return res.status(200).json({
      ok: true,
      message: 'Webhook reachable. Set ARDUINO_CHILD_ID on server to save GPS data.',
    })
  }

  const { lat, lng, timestamp } = parseLatLngFromArduinoCloudBody(req.body ?? {})
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(200).json({
      ok: true,
      childId,
      message: 'Webhook ready; no lat/lng in this request.',
    })
  }

  const v = validateGpsForStorage({ lat, lng, timestamp })
  if (!v.ok) {
    return res.status(400).json({ message: v.message })
  }
  const result = await upsertGpsLocation({ childId, lat: v.lat, lng: v.lng, timestamp: v.timestamp })
  return res.status(202).json({ ...result, integerScaled: Boolean(v.integerScaled) })
})

/**
 * Pull latest lat/lng from Arduino IoT Cloud Thing properties and save to DB.
 * Requires ARDUINO_CLIENT_ID + ARDUINO_CLIENT_SECRET.
 * Optional: ARDUINO_THING_ID (defaults to ARDUINO_CHILD_ID), ARDUINO_SYNC_TOKEN (required header if set).
 */
app.post('/api/sync/arduino-cloud', async (req, res) => {
  const syncToken = process.env.ARDUINO_SYNC_TOKEN
  if (syncToken) {
    const provided = req.headers['x-arduino-sync-token'] ?? req.body?.syncToken
    if (provided !== syncToken) {
      return res.status(401).json({ message: 'Invalid or missing x-arduino-sync-token / syncToken.' })
    }
  }

  const thingId =
    (typeof req.body?.thingId === 'string' && req.body.thingId) ||
    (typeof process.env.ARDUINO_THING_ID === 'string' && process.env.ARDUINO_THING_ID) ||
    (typeof process.env.ARDUINO_CHILD_ID === 'string' && process.env.ARDUINO_CHILD_ID) ||
    ''

  const childId =
    (typeof req.body?.childId === 'string' && req.body.childId) ||
    (typeof process.env.ARDUINO_CHILD_ID === 'string' && process.env.ARDUINO_CHILD_ID) ||
    thingId

  if (!thingId) {
    return res.status(400).json({
      message: 'Set ARDUINO_THING_ID or ARDUINO_CHILD_ID, or pass thingId in JSON body.',
    })
  }

  try {
    const payload = await fetchThingPropertiesRaw(thingId)
    const { lat, lng, vars } = pickLatLngFromPropertiesPayload(payload)
    const ts = Date.now()

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(404).json({
        message:
          'No lat/lng on this Thing. Create Cloud variables named lat and lng (or latitude/longitude) and publish values.',
        propertyNames: Object.keys(vars),
      })
    }

    const v = validateGpsForStorage({ lat, lng, timestamp: ts })
    if (!v.ok) {
      return res.status(400).json({ message: v.message })
    }

    const result = await upsertGpsLocation({
      childId,
      lat: v.lat,
      lng: v.lng,
      timestamp: v.timestamp,
    })

    return res.status(202).json({
      ...result,
      source: 'arduino-cloud-api',
      thingId,
      integerScaled: Boolean(v.integerScaled),
      propertyNames: Object.keys(vars),
    })
  } catch (err) {
    console.error('Arduino Cloud sync:', err)
    return res.status(502).json({
      message: err?.message || 'Arduino Cloud sync failed.',
    })
  }
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

app.get('/api/location/latest', async (req, res) => {
  const idsRaw = typeof req.query.childIds === 'string' ? req.query.childIds : ''
  const childIds = idsRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (childIds.length === 0) {
    return res.status(400).json({ message: 'Query childIds is required (comma-separated).' })
  }
  const placeholders = childIds.map(() => '?').join(',')
  const [rows] = await pool.query(
    `SELECT child_id AS childId, lat, lng, captured_at AS timestamp,
            geofence_violated AS geofenceViolated,
            distance_from_center_meters AS distanceFromCenterMeters
     FROM child_latest_location
     WHERE child_id IN (${placeholders})`,
    childIds,
  )
  return res.json(rows)
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

    // Default 1 min for testing; set LOCATION_SNAPSHOT_INTERVAL_MS=3600000 in .env for 60 min production.
    const snapshotMs = Number(process.env.LOCATION_SNAPSHOT_INTERVAL_MS ?? 60 * 1000)
    if (Number.isFinite(snapshotMs) && snapshotMs > 0) {
      const runSnapshot = () => {
        snapshotLatestToHistory().catch((err) => {
          console.error('Scheduled location_history snapshot:', err.message)
        })
      }
      const bootDelay = Number(process.env.LOCATION_SNAPSHOT_BOOT_DELAY_MS ?? 10_000)
      if (Number.isFinite(bootDelay) && bootDelay >= 0) {
        setTimeout(runSnapshot, bootDelay)
      }
      setInterval(runSnapshot, snapshotMs)
      const intervalLabel =
        snapshotMs >= 60_000
          ? `${Math.round(snapshotMs / 60_000)} min`
          : `${Math.round(snapshotMs / 1000)} s`
      console.log(
        `Scheduled copy of child_latest_location → location_history every ${intervalLabel} (first run after ${bootDelay}ms)`,
      )
    }

    startArduinoCloudPollScheduler()
  })
  .catch((error) => {
    console.error('Failed to initialize DB schema:', error.message)
    process.exit(1)
  })

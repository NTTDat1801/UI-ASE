# CLMS Node Backend

Node.js REST backend that receives GPS updates from Arduino IoT Cloud webhook.

## Features

- `POST /api/webhooks/arduino/gps` receives payload:
  - `childId` (string)
  - `lat` (number)
  - `lng` (number)
  - `timestamp` (epoch milliseconds, optional — if omitted the server uses current time)
- `POST /api/webhooks/arduino/cloud` — for **Arduino IoT Cloud → Data forwarding (Webhook)**. Body is usually `{ "values": [ { "name": "lat", "value": ... }, ... ] }`. You must pass **`childId`** (same as Thing ID used in the UI) either:
  - as a query string on the webhook URL: `?childId=YOUR_THING_ID`, or
  - in JSON as `childId` or `thing_id`.
- `POST /api/webhooks/arduino/cloud/:childId` — same as above, but **Thing ID is in the path** (shorter URL, easier if Arduino’s field truncates query strings). Example: `https://YOUR_HOST/api/webhooks/arduino/cloud/dcdfbea3-8fea-48ce-a45c-423b0f6057e8`
  Cloud variables should be named **`lat`** and **`lng`** (or `latitude` / `longitude`). If `timestamp` is omitted, the server uses the current time.
  **Arduino Cloud URL check:** the first `POST` from Arduino may have no GPS yet; the server answers **200** so the webhook is accepted. Real updates still return **202** when `lat`/`lng` are present.
- Stores current latest location per child in MySQL table `child_latest_location`
- Stores location history in `location_history`
- Keeps only the latest 100 history records per child
- Detects geofence violation if geofence exists

## Geofence Setup

Create or update geofence by child:

- `POST /api/geofences`

```json
{
  "childId": "child-001",
  "centerLat": 10.773,
  "centerLng": 106.659,
  "radiusMeters": 300
}
```

## Environment

Create `.env` (or use defaults):

```bash
PORT=8080
DB_HOST=localhost
DB_PORT=3306
DB_NAME=clms
DB_USERNAME=clms_user
DB_PASSWORD=123456
```

## Run

1. Start MySQL
2. Install dependencies
3. Run dev server:

```bash
npm install
npm run dev
```

Backend starts at `http://localhost:8080`.

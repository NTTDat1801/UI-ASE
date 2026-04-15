# CLMS Node Backend

Node.js REST backend that receives GPS updates from Arduino IoT Cloud webhook.

## Features

- `POST /api/webhooks/arduino/gps` receives payload:
  - `childId` (string)
  - `lat` (number)
  - `lng` (number)
  - `timestamp` (epoch milliseconds)
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

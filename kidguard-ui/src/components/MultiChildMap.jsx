import { Circle, MapContainer, Marker, Popup, Rectangle, TileLayer, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useEffect, useRef } from 'react'

const childIcon = (color = '#2A5BF5') =>
  new L.DivIcon({
    className: 'kidguard-div-icon',
    html: `<div style="width:14px;height:14px;border:2px solid #0D0D0D;background:${color};box-shadow:2px 2px 0 #0D0D0D"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })

const zoneColors = ['#2A5BF5', '#E8631A', '#1A8C4E', '#D92B2B']

function FitBounds({ locations = [] }) {
  const map = useMap()
  const fittedRef = useRef(false)
  const lastCountRef = useRef(0)

  useEffect(() => {
    if (!Array.isArray(locations) || locations.length === 0) return

    // Do not force-fit every refresh tick, otherwise user cannot zoom/pan manually.
    // Auto-fit only first time (or when number of tracked children changes).
    const shouldAutoFit = !fittedRef.current || lastCountRef.current !== locations.length
    if (!shouldAutoFit) return

    if (locations.length === 1) {
      map.setView([locations[0].lat, locations[0].lng], 15, { animate: false })
    } else {
      const bounds = L.latLngBounds(locations.map((loc) => [loc.lat, loc.lng]))
      map.fitBounds(bounds, { padding: [50, 50], animate: false, maxZoom: 15 })
    }

    fittedRef.current = true
    lastCountRef.current = locations.length
  }, [map, locations])
  return null
}

export default function MultiChildMap({ locations = [], zonesByChild = {}, height = '100%', center }) {
  const fallbackCenter = center || (locations[0] ? [locations[0].lat, locations[0].lng] : [10.928, 106.702])

  return (
    <MapContainer center={fallbackCenter} zoom={15} style={{ width: '100%', height }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds locations={locations} />

      {Object.entries(zonesByChild).flatMap(([childId, zones]) =>
        (Array.isArray(zones) ? zones : []).map((zone, idx) => (
          zone.shapeType === 'rectangle'
            && Number.isFinite(zone.cornerALat)
            && Number.isFinite(zone.cornerALng)
            && Number.isFinite(zone.cornerCLat)
            && Number.isFinite(zone.cornerCLng) ? (
              <Rectangle
                key={`zone-${childId}-${zone.id ?? idx}`}
                bounds={[
                  [Math.min(zone.cornerALat, zone.cornerCLat), Math.min(zone.cornerALng, zone.cornerCLng)],
                  [Math.max(zone.cornerALat, zone.cornerCLat), Math.max(zone.cornerALng, zone.cornerCLng)],
                ]}
                pathOptions={{
                  color: zoneColors[idx % zoneColors.length],
                  fillOpacity: 0.12,
                  weight: 2,
                }}
              >
                <Tooltip direction="top" sticky>
                  {zone.zoneName} (rectangle)
                </Tooltip>
              </Rectangle>
              ) : (
                <Circle
                  key={`zone-${childId}-${zone.id ?? idx}`}
                  center={[zone.centerLat, zone.centerLng]}
                  radius={zone.radiusMeters}
                  pathOptions={{
                    color: zoneColors[idx % zoneColors.length],
                    fillOpacity: 0.12,
                    weight: 2,
                  }}
                >
                  <Tooltip direction="top" sticky>
                    {zone.zoneName} ({Math.round(zone.radiusMeters)}m)
                  </Tooltip>
                </Circle>
              )
        )),
      )}

      {locations.map((loc, idx) => (
        <Marker
          key={`child-${loc.childId}`}
          position={[loc.lat, loc.lng]}
          icon={childIcon(zoneColors[idx % zoneColors.length])}
        >
          <Popup>
            <div style={{ fontFamily: 'sans-serif', minWidth: '160px' }}>
              <div><strong>{loc.displayName || loc.childId}</strong></div>
              <div>{loc.lat.toFixed(6)}, {loc.lng.toFixed(6)}</div>
              <div style={{ fontSize: '12px', opacity: 0.7 }}>{new Date(loc.timestamp).toLocaleString()}</div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}

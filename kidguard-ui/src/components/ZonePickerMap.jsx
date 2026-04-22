import { Circle, MapContainer, Marker, Rectangle, TileLayer, Tooltip, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { useRef } from 'react'

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)))
}

const centerIcon = new L.DivIcon({
  className: 'kidguard-center-icon',
  html: '<div style="width:14px;height:14px;background:#2A5BF5;border:2px solid #0D0D0D"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

const edgeIcon = new L.DivIcon({
  className: 'kidguard-edge-icon',
  html: '<div style="width:12px;height:12px;background:#E8631A;border:2px solid #0D0D0D"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

function ClickHandler({
  mode,
  centerPoint,
  edgePoint,
  onCenterPointChange,
  onEdgePointChange,
  cornerA,
  cornerC,
  onCornerAChange,
  onCornerCChange,
}) {
  const drawingRectRef = useRef(false)
  useMapEvents({
    mousedown(e) {
      if (mode !== 'rectangle') return
      drawingRectRef.current = true
      const p = { lat: e.latlng.lat, lng: e.latlng.lng }
      onCornerAChange(p)
      onCornerCChange(p)
    },
    mousemove(e) {
      if (mode !== 'rectangle' || !drawingRectRef.current || !cornerA) return
      onCornerCChange({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
    mouseup(e) {
      if (mode !== 'rectangle' || !drawingRectRef.current) return
      drawingRectRef.current = false
      onCornerCChange({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
    click(e) {
      if (mode === 'rectangle') return
      const p = { lat: e.latlng.lat, lng: e.latlng.lng }
      if (!centerPoint) {
        onCenterPointChange(p)
        return
      }
      if (!edgePoint) {
        onEdgePointChange(p)
        return
      }
      // Third click resets center to new point and requires new edge.
      onCenterPointChange(p)
      onEdgePointChange(null)
    },
  })
  return null
}

export default function ZonePickerMap({
  mode = 'circle',
  centerPoint,
  edgePoint,
  onCenterPointChange,
  onEdgePointChange,
  cornerA,
  cornerC,
  onCornerAChange,
  onCornerCChange,
  mapCenter = [10.928, 106.702],
}) {
  const radius =
    centerPoint && edgePoint
      ? haversineMeters(centerPoint.lat, centerPoint.lng, edgePoint.lat, edgePoint.lng)
      : 0

  return (
    <MapContainer center={mapCenter} zoom={15} style={{ width: '100%', height: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler
        mode={mode}
        centerPoint={centerPoint}
        edgePoint={edgePoint}
        onCenterPointChange={onCenterPointChange}
        onEdgePointChange={onEdgePointChange}
        cornerA={cornerA}
        cornerC={cornerC}
        onCornerAChange={onCornerAChange}
        onCornerCChange={onCornerCChange}
      />
      {mode === 'circle' && centerPoint && <Marker position={[centerPoint.lat, centerPoint.lng]} icon={centerIcon} />}
      {mode === 'circle' && edgePoint && <Marker position={[edgePoint.lat, edgePoint.lng]} icon={edgeIcon} />}
      {mode === 'circle' && centerPoint && edgePoint && radius > 0 && (
        <Circle
          center={[centerPoint.lat, centerPoint.lng]}
          radius={radius}
          pathOptions={{ color: '#2A5BF5', fillOpacity: 0.14, weight: 2 }}
        >
          <Tooltip direction="top">Radius ~ {Math.round(radius)}m</Tooltip>
        </Circle>
      )}
      {mode === 'rectangle' && cornerA && cornerC && (
        <Rectangle
          bounds={[
            [Math.min(cornerA.lat, cornerC.lat), Math.min(cornerA.lng, cornerC.lng)],
            [Math.max(cornerA.lat, cornerC.lat), Math.max(cornerA.lng, cornerC.lng)],
          ]}
          pathOptions={{ color: '#2A5BF5', fillOpacity: 0.14, weight: 2 }}
        >
          <Tooltip direction="top">Rectangle zone</Tooltip>
        </Rectangle>
      )}
    </MapContainer>
  )
}

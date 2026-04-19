import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import WebLayout from '../../components/WebLayout'
import StatusChip from '../../components/StatusChip'
import Button from '../../components/Button'
import { mockChild } from '../../data/mock'

export default function LiveMap() {
  const navigate = useNavigate()
  const [location, setLocation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const apiBase = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8080'
  const childId =
    import.meta.env.VITE_CHILD_ID || 'cb184099-9a5c-4a47-a5cc-d712bff00f7a'

  async function refreshLocation() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`${apiBase}/api/location/latest/${encodeURIComponent(childId)}`)
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || 'Khong lay duoc du lieu vi tri.')
      }
      const data = await response.json()
      setLocation(data)
    } catch (apiError) {
      setLocation(null)
      setError(apiError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshLocation()
    const intervalId = setInterval(refreshLocation, 5000)
    return () => clearInterval(intervalId)
  }, [])

  const mapSrc = useMemo(() => {
    if (!location) return ''
    const { lat, lng } = location
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01}%2C${lat - 0.01}%2C${lng + 0.01}%2C${lat + 0.01}&layer=mapnik&marker=${lat}%2C${lng}`
  }, [location])

  const updatedText = location
    ? new Date(location.timestamp).toLocaleString()
    : '--'

  return (
    <WebLayout active="map">
      {/* Page header */}
      <div style={{
        background: '#fff', borderBottom: '2px solid var(--border)',
        padding: '0 32px', height: '64px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '20px' }}>
            <span style={{ background: 'var(--slab-blue)', color: '#fff', padding: '2px 8px' }}>LIVE</span>
            {' '}LOCATION
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <StatusChip label={location ? 'LIVE' : 'WAITING'} variant={location ? 'online' : 'warning'} />
          <Button variant="ghost" onClick={refreshLocation}>REFRESH</Button>
        </div>
      </div>

      {/* Map + info panel */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Full-height map */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {location ? (
            <iframe
              title="live-location-map"
              src={mapSrc}
              style={{ width: '100%', height: '100%', border: 0 }}
            />
          ) : (
            <div style={{ padding: '20px', background: '#fff', height: '100%', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              {loading ? 'Dang tai vi tri hien tai...' : 'Chua co du lieu GPS. Kiem tra backend (poll Arduino Cloud) va child_id.'}
            </div>
          )}
        </div>

        {/* Right info panel */}
        <div style={{
          width: '320px', flexShrink: 0,
          borderLeft: '2px solid var(--border)',
          background: '#fff',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Child header */}
          <div style={{ padding: '24px', borderBottom: '2px solid var(--border)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '26px', marginBottom: '8px' }}>
              {mockChild.name.toUpperCase()}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', marginBottom: '12px' }}>
              {location ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}` : mockChild.location.address}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <StatusChip
                label={location?.geofenceViolated ? 'OUTSIDE ZONE' : 'INSIDE ZONE'}
                variant={location?.geofenceViolated ? 'outside' : 'inside'}
              />
              <StatusChip label="GPS ARDUINO" variant="info" />
            </div>
            <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              Updated {updatedText}
            </div>
          </div>

          {/* Stats */}
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--bg-base)' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', letterSpacing: '0.04em' }}>DISTANCE</span>
              <span style={{ fontSize: '14px', color: 'var(--slab-orange)', fontWeight: 600, fontFamily: 'var(--font-body)' }}>
                {location?.distanceFromCenterMeters ? `${Math.round(location.distanceFromCenterMeters)} m` : '--'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--bg-base)' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', letterSpacing: '0.04em' }}>STATUS</span>
              <StatusChip label={location ? 'ONLINE' : 'WAITING'} variant={location ? 'online' : 'warning'} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', letterSpacing: '0.04em' }}>CHILD ID</span>
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{childId}</span>
            </div>
            {error && <div style={{ color: 'var(--slab-red)', fontSize: '12px' }}>{error}</div>}
          </div>

          {/* Actions */}
          <div style={{ padding: '20px', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '2px solid var(--border)' }}>
            <Button fullWidth variant="ghost" onClick={() => navigate('/history')}>VIEW HISTORY →</Button>
            <Button fullWidth variant="primary" onClick={() => navigate('/zones')}>MANAGE ZONES →</Button>
          </div>
        </div>
      </div>
    </WebLayout>
  )
}

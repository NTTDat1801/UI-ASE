import { useNavigate } from 'react-router-dom'
import WebLayout from '../../components/WebLayout'
import MapMock from '../../components/MapMock'
import StatusChip from '../../components/StatusChip'
import Button from '../../components/Button'
import { mockChild } from '../../data/mock'

export default function LiveMap() {
  const navigate = useNavigate()
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
        <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', border: '2px solid var(--border)', background: 'var(--bg-base)', padding: '4px 10px' }}>
          2 MIN AGO
        </span>
      </div>

      {/* Map + info panel */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Full-height map */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <MapMock showPin showZone height="100%" />
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
              {mockChild.location.address}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <StatusChip label="INSIDE: HOME ZONE" variant="inside" />
              <StatusChip label="GPS GOOD" variant="info" />
            </div>
            <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              Updated {mockChild.location.updatedAt}
            </div>
          </div>

          {/* Stats */}
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--bg-base)' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', letterSpacing: '0.04em' }}>BATTERY</span>
              <span style={{ fontSize: '14px', color: 'var(--slab-orange)', fontWeight: 600, fontFamily: 'var(--font-body)' }}>⚡ {mockChild.battery}%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--bg-base)' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', letterSpacing: '0.04em' }}>STATUS</span>
              <StatusChip label="ONLINE" variant="online" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', letterSpacing: '0.04em' }}>DEVICE ID</span>
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{mockChild.deviceId}</span>
            </div>
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

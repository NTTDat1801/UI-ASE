import { useNavigate } from 'react-router-dom'
import WebLayout from '../../components/WebLayout'
import Button from '../../components/Button'
import ZoneCard from '../../components/ZoneCard'
import MapMock from '../../components/MapMock'
import { mockZones } from '../../data/mock'

export default function SafeZones() {
  const navigate = useNavigate()
  const activeCount = mockZones.filter(z => z.active).length

  return (
    <WebLayout active="zones">
      {/* Page header */}
      <div style={{
        background: '#fff', borderBottom: '2px solid var(--border)',
        padding: '0 32px', height: '64px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '20px' }}>SAFE ZONES</span>
          <span style={{ background: 'var(--slab-blue)', color: '#fff', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '3px 8px', fontFamily: 'var(--font-body)' }}>
            {activeCount} ACTIVE
          </span>
        </div>
        <Button variant="primary" onClick={() => navigate('/zones/add')}>＋ ADD NEW ZONE</Button>
      </div>

      {/* Content: zones list + map */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left: zones list */}
        <div style={{
          width: '400px', flexShrink: 0,
          borderRight: '2px solid var(--border)',
          overflowY: 'auto', padding: '24px',
          display: 'flex', flexDirection: 'column', gap: '12px',
        }}>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', margin: 0 }}>
            Define where your child should be. Alerts trigger when they enter or leave a zone.
          </p>
          {mockZones.map(zone => <ZoneCard key={zone.id} zone={zone} />)}
          <div style={{ marginTop: '8px' }}>
            <Button fullWidth variant="ghost" onClick={() => navigate('/zones/add')}>＋ ADD NEW ZONE</Button>
          </div>
        </div>

        {/* Right: zone map preview */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <MapMock showPin showZone zoneName="Home" height="100%" />
          <div style={{
            position: 'absolute', top: '16px', left: '16px',
            background: '#fff', border: '2px solid var(--border)',
            padding: '8px 12px', boxShadow: '3px 3px 0 #0D0D0D',
          }}>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', fontFamily: 'var(--font-body)', letterSpacing: '0.06em' }}>
              ZONE PREVIEW
            </span>
          </div>
        </div>
      </div>
    </WebLayout>
  )
}

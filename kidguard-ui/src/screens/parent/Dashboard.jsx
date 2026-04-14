import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import WebLayout from '../../components/WebLayout'
import Card from '../../components/Card'
import StatusChip from '../../components/StatusChip'
import MapMock from '../../components/MapMock'
import NotificationCard from '../../components/NotificationCard'
import { mockChild, mockNotifications } from '../../data/mock'

export default function Dashboard() {
  const navigate = useNavigate()
  return (
    <WebLayout active="map">
      {/* Page header */}
      <div style={{
        background: '#fff', borderBottom: '2px solid var(--border)',
        padding: '0 32px', height: '64px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
            GOOD MORNING,
          </div>
          <div style={{ fontSize: '20px', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
            Minh Khang 👋
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{ position: 'relative', cursor: 'pointer', padding: '8px' }}
            onClick={() => navigate('/notifications')}
          >
            <Bell size={22} />
            <div style={{
              position: 'absolute', top: '4px', right: '4px',
              width: '16px', height: '16px', background: 'var(--slab-orange)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: '10px', color: '#fff', fontWeight: 700 }}>2</span>
            </div>
          </div>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '6px 12px', border: '2px solid var(--border)', background: 'var(--bg-base)' }}
            onClick={() => navigate('/child-profile')}
          >
            <div style={{ width: '28px', height: '28px', border: '2px solid var(--border)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>B</div>
            <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', fontFamily: 'var(--font-body)' }}>{mockChild.name}</span>
          </div>
        </div>
      </div>

      {/* Two-column body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left panel — status + alerts */}
        <div style={{
          width: '360px', flexShrink: 0,
          borderRight: '2px solid var(--border)',
          overflowY: 'auto',
          padding: '24px',
          display: 'flex', flexDirection: 'column', gap: '16px',
        }}>

          {/* Child status card */}
          <Card heavy padding="16px">
            <div style={{ marginBottom: '10px' }}>
              <span style={{ background: 'var(--slab-blue)', color: '#fff', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '2px 8px', fontFamily: 'var(--font-body)' }}>
                CHILD STATUS
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '52px', height: '52px', border: '2px solid var(--border)',
                background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px', fontWeight: 700, flexShrink: 0,
              }}>B</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'var(--font-body)' }}>{mockChild.name}</div>
                <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>Last seen {mockChild.lastSeen}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <StatusChip label="ONLINE" variant="online" />
                <span style={{ fontSize: '12px', color: 'var(--slab-orange)', fontFamily: 'var(--font-body)', fontWeight: 500 }}>⚡ {mockChild.battery}%</span>
              </div>
            </div>
          </Card>

          {/* Location strip */}
          <div style={{
            background: '#fff', border: '2px solid var(--border)',
            padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.06em', fontFamily: 'var(--font-body)', marginBottom: '2px' }}>CURRENT ZONE</div>
              <StatusChip label="INSIDE: HOME" variant="inside" />
            </div>
            <span
              onClick={() => navigate('/map')}
              style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--slab-blue)', cursor: 'pointer', fontFamily: 'var(--font-body)', letterSpacing: '0.04em' }}>
              VIEW LIVE MAP →
            </span>
          </div>

          {/* Recent alerts heading */}
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', marginTop: '4px' }}>
            RECENT ALERTS
          </div>
          {mockNotifications.slice(0, 2).map(n => <NotificationCard key={n.id} notification={n} />)}

          <span
            onClick={() => navigate('/notifications')}
            style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--slab-blue)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            VIEW ALL ALERTS →
          </span>
        </div>

        {/* Right panel — full-height map */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <MapMock showPin showZone zoneName="Home" height="100%" />

          {/* Floating info bar at bottom */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: '#fff', borderTop: '2px solid var(--border)',
            padding: '12px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                {mockChild.location.address}
              </div>
              <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: '2px' }}>
                Updated {mockChild.location.updatedAt}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <StatusChip label="GPS GOOD" variant="info" />
              <button
                onClick={() => navigate('/map')}
                style={{
                  background: 'var(--slab-blue)', color: '#fff',
                  border: '2px solid var(--border)', padding: '6px 16px',
                  fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
                  letterSpacing: '0.06em', cursor: 'pointer', fontFamily: 'var(--font-body)',
                }}
              >
                OPEN MAP →
              </button>
            </div>
          </div>
        </div>
      </div>
    </WebLayout>
  )
}

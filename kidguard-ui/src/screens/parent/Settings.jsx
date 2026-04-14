import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import WebLayout from '../../components/WebLayout'
import Card from '../../components/Card'
import StatusChip from '../../components/StatusChip'
import { mockParent } from '../../data/mock'

const settingsSections = [
  {
    title: 'ACCOUNT',
    rows: [
      { label: 'CHANGE PASSWORD', right: null },
      { label: 'MULTI-FACTOR AUTH', right: <StatusChip label="ON" variant="online" /> },
      { label: 'NOTIFICATION PREFERENCES', right: null },
    ],
  },
  {
    title: 'SUPPORT',
    rows: [
      { label: 'HELP & SUPPORT', right: null },
      { label: 'PRIVACY POLICY', right: null },
      { label: 'TERMS OF SERVICE', right: null },
    ],
  },
]

export default function Settings() {
  const navigate = useNavigate()
  return (
    <WebLayout active="settings">
      {/* Page header */}
      <div style={{
        background: '#fff', borderBottom: '2px solid var(--border)',
        padding: '0 32px', height: '64px', flexShrink: 0,
        display: 'flex', alignItems: 'center',
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '20px' }}>SETTINGS</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
        <div style={{ maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Profile card */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '56px', height: '56px', border: '2px solid var(--border)',
                background: 'var(--bg-base)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px', fontWeight: 700, flexShrink: 0,
              }}>MK</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'var(--font-body)' }}>{mockParent.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>{mockParent.email}</div>
              </div>
              <button style={{
                background: 'var(--bg-base)', border: '2px solid var(--border)',
                padding: '8px 14px', fontSize: '11px', fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.06em',
                cursor: 'pointer', fontFamily: 'var(--font-body)', color: 'var(--text-primary)',
              }}>
                EDIT PROFILE
              </button>
            </div>
          </Card>

          {/* Settings sections */}
          {settingsSections.map(section => (
            <div key={section.title}>
              <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', marginBottom: '8px' }}>
                {section.title}
              </div>
              <Card padding="0">
                {section.rows.map((row, i) => (
                  <div key={row.label} style={{
                    padding: '0 20px', height: '52px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    borderBottom: i < section.rows.length - 1 ? '2px solid var(--border)' : 'none',
                    cursor: 'pointer',
                  }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'var(--font-body)' }}>
                      {row.label}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {row.right}
                      <ChevronRight size={16} color="var(--text-muted)" />
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          ))}

          {/* Log out */}
          <button
            onClick={() => navigate('/')}
            style={{
              border: '2px solid var(--slab-red)', background: 'transparent',
              color: 'var(--slab-red)', padding: '14px', width: '100%',
              fontSize: '13px', fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '0.08em', cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}>
            LOG OUT
          </button>
        </div>
      </div>
    </WebLayout>
  )
}

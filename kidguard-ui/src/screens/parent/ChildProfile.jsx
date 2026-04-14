import { useNavigate } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import WebLayout from '../../components/WebLayout'
import Card from '../../components/Card'
import Input from '../../components/Input'
import StatusChip from '../../components/StatusChip'
import { mockChild } from '../../data/mock'
import { useState } from 'react'

export default function ChildProfile() {
  const navigate = useNavigate()
  const [sharing, setSharing] = useState(true)

  return (
    <WebLayout active="profile">
      {/* Page header */}
      <div style={{
        background: '#fff', borderBottom: '2px solid var(--border)',
        padding: '0 32px', height: '64px', flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
        >
          <span style={{ fontSize: '20px', color: 'var(--text-primary)' }}>←</span>
        </button>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '20px' }}>
          CHILD <span style={{ background: 'var(--slab-blue)', color: '#fff', padding: '2px 8px' }}>PROFILE</span>
        </span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', gap: '32px' }}>

          {/* Left: avatar + basic info */}
          <div style={{ width: '200px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: '96px', height: '96px', border: '2px solid var(--border)',
                background: 'var(--bg-base)', boxShadow: '3px 3px 0 #0D0D0D',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '36px', fontWeight: 700,
              }}>B</div>
              <div style={{
                position: 'absolute', bottom: '-4px', right: '-4px',
                width: '24px', height: '24px', background: '#fff',
                border: '2px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}>
                <Pencil size={12} />
              </div>
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '20px' }}>BON</span>
            <StatusChip label="CONNECTED" variant="online" />
          </div>

          {/* Right: form fields */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Card>
              <Input label="Child's Name" placeholder="Bon" />
            </Card>

            <Card padding="0">
              <div style={{ padding: '16px 20px', borderBottom: '2px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', fontFamily: 'var(--font-body)', letterSpacing: '0.04em' }}>DEVICE ID</span>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)' }}>{mockChild.deviceId}</span>
              </div>
              <div style={{ padding: '16px 20px', borderBottom: '2px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', fontFamily: 'var(--font-body)', letterSpacing: '0.04em' }}>STATUS</span>
                <StatusChip label="CONNECTED" variant="online" />
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', fontFamily: 'var(--font-body)', letterSpacing: '0.04em' }}>LAST SEEN</span>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{mockChild.lastSeen}</span>
              </div>
            </Card>

            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-body)', marginBottom: '4px' }}>LOCATION SHARING</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                    {sharing ? 'Active — parents can see location' : 'Disabled — location hidden'}
                  </div>
                </div>
                <div onClick={() => setSharing(!sharing)} style={{
                  width: '48px', height: '26px',
                  background: sharing ? 'var(--slab-blue)' : 'var(--text-muted)',
                  border: '2px solid var(--border)', position: 'relative', cursor: 'pointer',
                }}>
                  <div style={{
                    position: 'absolute', top: '3px',
                    left: sharing ? '23px' : '3px',
                    width: '16px', height: '16px',
                    background: '#fff', border: '1px solid var(--border)',
                    transition: 'left 0.2s',
                  }} />
                </div>
              </div>
            </Card>

            <button style={{
              border: '2px solid var(--slab-red)', background: 'transparent',
              color: 'var(--slab-red)', padding: '12px', width: '100%',
              fontSize: '13px', fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '0.08em', cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}>
              UNLINK DEVICE
            </button>
          </div>
        </div>
      </div>
    </WebLayout>
  )
}

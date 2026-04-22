import { useNavigate } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import WebLayout from '../../components/WebLayout'
import Card from '../../components/Card'
import Input from '../../components/Input'
import StatusChip from '../../components/StatusChip'
import Button from '../../components/Button'
import { useMemo, useState } from 'react'
import { loadChildrenConfig, saveChildrenConfig } from '../../utils/childrenConfig'

export default function ChildProfile() {
  const navigate = useNavigate()
  const apiBase = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8080'
  const initialChildren = useMemo(() => loadChildrenConfig(), [])
  const [children, setChildren] = useState(initialChildren)
  const [sharing, setSharing] = useState(true)
  const [newName, setNewName] = useState('')
  const [newChildId, setNewChildId] = useState('')
  const [newThingId, setNewThingId] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const primary = children[0]

  async function addChild() {
    setError('')
    const childId = newChildId.trim()
    if (!childId) {
      setError('Child ID is required.')
      return
    }
    if (children.some((c) => c.childId === childId)) {
      setError('Child ID already exists in list.')
      return
    }
    const entry = {
      childId,
      displayName: newName.trim() || `Child ${children.length + 1}`,
      thingId: newThingId.trim() || childId,
      active: true,
    }
    const next = [...children, entry]
    setSaving(true)
    try {
      const res = await fetch(`${apiBase}/api/children`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || 'Cannot save child.')
      }
      setChildren(next)
      saveChildrenConfig(next)
      setNewName('')
      setNewChildId('')
      setNewThingId('')
    } catch (e) {
      setError(e.message || 'Cannot save child.')
    } finally {
      setSaving(false)
    }
  }

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
              }}>{(primary?.displayName?.[0] || 'C').toUpperCase()}</div>
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
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '20px' }}>
              {(primary?.displayName || 'NO CHILD').toUpperCase()}
            </span>
            <StatusChip label="CONNECTED" variant="online" />
          </div>

          {/* Right: form fields */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Card>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '6px' }}>
                Primary Child Name
              </div>
              <div style={{ border: '2px solid var(--border)', padding: '12px', background: '#fff' }}>
                {primary?.displayName || '--'}
              </div>
            </Card>

            <Card padding="0">
              <div style={{ padding: '16px 20px', borderBottom: '2px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', fontFamily: 'var(--font-body)', letterSpacing: '0.04em' }}>DEVICE ID</span>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)' }}>{primary?.thingId || '--'}</span>
              </div>
              <div style={{ padding: '16px 20px', borderBottom: '2px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', fontFamily: 'var(--font-body)', letterSpacing: '0.04em' }}>STATUS</span>
                <StatusChip label="CONNECTED" variant="online" />
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', fontFamily: 'var(--font-body)', letterSpacing: '0.04em' }}>LAST SEEN</span>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>Live map polling</span>
              </div>
            </Card>

            <Card>
              <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                Add Child
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <Input label="Display Name" placeholder="e.g. Bon / Anna" value={newName} onChange={(e) => setNewName(e.target.value)} />
                <Input label="Child ID" placeholder="Thing UUID or child id" value={newChildId} onChange={(e) => setNewChildId(e.target.value)} />
                <Input label="Thing ID (optional)" placeholder="Thing UUID (default = Child ID)" value={newThingId} onChange={(e) => setNewThingId(e.target.value)} />
                {error && <div style={{ color: 'var(--slab-red)', fontSize: '12px' }}>{error}</div>}
                <Button onClick={addChild} variant="primary">
                  {saving ? 'ADDING...' : 'ADD CHILD'}
                </Button>
              </div>
            </Card>

            <Card>
              <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                Tracking List ({children.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {children.map((c) => (
                  <div
                    key={c.childId}
                    style={{
                      border: '2px solid var(--border)',
                      padding: '10px',
                      background: 'var(--bg-base)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '10px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{c.displayName}</div>
                      <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        childId: {c.childId}
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      thing: {c.thingId}
                    </div>
                  </div>
                ))}
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

            <button type="button" style={{
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

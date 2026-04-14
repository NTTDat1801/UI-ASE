import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import WebLayout from '../../components/WebLayout'
import MapMock from '../../components/MapMock'
import Input from '../../components/Input'
import Button from '../../components/Button'

const swatchColors = ['#2A5BF5', '#E8631A', '#1A8C4E', '#D92B2B']

export default function AddZone() {
  const navigate = useNavigate()
  const [radius, setRadius] = useState(200)
  const [selectedColor, setSelectedColor] = useState(0)

  return (
    <WebLayout active="zones">
      {/* Page header */}
      <div style={{
        background: '#fff', borderBottom: '2px solid var(--border)',
        padding: '0 32px', height: '64px', flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: '16px',
      }}>
        <button
          onClick={() => navigate('/zones')}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
        >
          <span style={{ fontSize: '20px', color: 'var(--text-primary)' }}>←</span>
        </button>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '20px' }}>
          ADD <span style={{ background: 'var(--slab-blue)', color: '#fff', padding: '2px 8px' }}>SAFE ZONE</span>
        </span>
      </div>

      {/* Side-by-side layout */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left: map */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <MapMock height="100%" showZone />
          {/* Crosshair */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '28px', color: 'var(--text-muted)',
            pointerEvents: 'none',
          }}>+</div>
          {/* Floating hint */}
          <div style={{
            position: 'absolute', bottom: '20px', left: '50%',
            transform: 'translateX(-50%)',
            background: '#fff', border: '2px solid var(--border)',
            padding: '8px 16px', boxShadow: '3px 3px 0 #0D0D0D',
          }}>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-body)', color: 'var(--text-muted)' }}>
              DRAG TO POSITION ZONE CENTER
            </span>
          </div>
        </div>

        {/* Right: form panel */}
        <div style={{
          width: '360px', flexShrink: 0,
          borderLeft: '2px solid var(--border)',
          background: '#fff',
          overflowY: 'auto',
          padding: '28px 24px',
          display: 'flex', flexDirection: 'column', gap: '20px',
        }}>
          <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
            ZONE DETAILS
          </span>

          <Input label="Zone Name" placeholder="e.g. Home, School, Grandma's" />

          {/* Radius */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', fontFamily: 'var(--font-body)' }}>RADIUS</span>
              <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{radius}M</span>
            </div>
            <input
              type="range" min={50} max={1000} step={50} value={radius}
              onChange={e => setRadius(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--slab-blue)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>50M</span>
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>1000M</span>
            </div>
          </div>

          {/* Color */}
          <div>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', fontFamily: 'var(--font-body)', display: 'block', marginBottom: '10px' }}>COLOR</span>
            <div style={{ display: 'flex', gap: '10px' }}>
              {swatchColors.map((c, i) => (
                <div key={c} onClick={() => setSelectedColor(i)} style={{
                  width: '32px', height: '32px', background: c,
                  border: '2px solid var(--border)',
                  outline: selectedColor === i ? `3px solid var(--slab-blue)` : 'none',
                  outlineOffset: '2px', cursor: 'pointer',
                }} />
              ))}
            </div>
          </div>

          {/* Zone type info */}
          <div style={{ background: 'var(--bg-base)', border: '2px solid var(--border)', padding: '12px' }}>
            <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.06em', fontFamily: 'var(--font-body)', marginBottom: '4px' }}>
              ALERT TYPE
            </div>
            <div style={{ fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--text-primary)' }}>
              Notify when child enters or leaves this zone
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'auto' }}>
            <Button fullWidth variant="primary" onClick={() => navigate('/zones')}>SAVE ZONE →</Button>
            <Button fullWidth variant="ghost" onClick={() => navigate('/zones')}>CANCEL</Button>
          </div>
        </div>
      </div>
    </WebLayout>
  )
}

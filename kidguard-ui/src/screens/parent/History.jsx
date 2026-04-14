import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import WebLayout from '../../components/WebLayout'
import StatusChip from '../../components/StatusChip'
import { mockHistory } from '../../data/mock'

const dateTabs = ['TODAY', 'YESTERDAY', 'APR 12', 'APR 11']

export default function History() {
  const [activeTab, setActiveTab] = useState(0)
  const navigate = useNavigate()

  return (
    <WebLayout active="history">
      {/* Page header */}
      <div style={{
        background: '#fff', borderBottom: '2px solid var(--border)',
        padding: '0 32px', height: '64px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '20px' }}>
          LOCATION <span style={{ background: 'var(--slab-blue)', color: '#fff', padding: '2px 8px' }}>HISTORY</span>
        </span>
        <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
          {mockHistory.reduce((a, g) => a + g.entries.length, 0)} entries
        </span>
      </div>

      {/* Date tabs */}
      <div style={{
        background: 'var(--bg-base)',
        padding: '12px 32px',
        borderBottom: '2px solid var(--border)',
        display: 'flex', gap: '8px', flexShrink: 0,
      }}>
        {dateTabs.map((tab, i) => (
          <button key={tab} onClick={() => setActiveTab(i)} style={{
            padding: '6px 16px',
            background: i === activeTab ? 'var(--slab-blue)' : '#fff',
            color: i === activeTab ? '#fff' : 'var(--text-primary)',
            border: '2px solid var(--border)',
            fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.06em', cursor: 'pointer', whiteSpace: 'nowrap',
            fontFamily: 'var(--font-body)',
          }}>
            {tab}
          </button>
        ))}
      </div>

      {/* Content: two-column list + map */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* History list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 32px' }}>
          {mockHistory.map(group => (
            <div key={group.date}>
              <div style={{
                fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
                color: 'var(--text-muted)', letterSpacing: '0.06em',
                borderBottom: '2px solid var(--border)',
                padding: '16px 0 8px', fontFamily: 'var(--font-body)',
              }}>
                {group.date}
              </div>
              {group.entries.map((entry, i) => (
                <div key={i} style={{
                  display: 'flex', gap: '0', padding: '16px 0',
                  borderBottom: '2px solid var(--border)',
                  alignItems: 'flex-start',
                }}>
                  <div style={{ width: '64px', flexShrink: 0 }}>
                    <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{entry.time}</span>
                  </div>
                  <div style={{ width: '24px', flexShrink: 0, display: 'flex', justifyContent: 'center', paddingTop: '4px' }}>
                    <div style={{ width: '2px', background: '#C0BAB0', height: '100%', borderLeft: '2px dashed #C0BAB0' }} />
                  </div>
                  <div style={{ flex: 1, paddingLeft: '12px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-body)' }}>
                      {entry.address}
                    </div>
                    <div style={{ marginTop: '6px' }}>
                      <StatusChip label={entry.duration} variant="white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Right summary panel */}
        <div style={{
          width: '280px', flexShrink: 0,
          borderLeft: '2px solid var(--border)',
          background: '#fff', padding: '24px',
          display: 'flex', flexDirection: 'column', gap: '16px',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.06em', fontFamily: 'var(--font-body)' }}>
            SUMMARY
          </div>

          {[
            { label: 'LOCATIONS VISITED', value: '3' },
            { label: 'TIME AT HOME', value: '1h 45m' },
            { label: 'TIME AT SCHOOL', value: '5h 45m' },
            { label: 'TOTAL TRACKED', value: '8h 15m' },
          ].map(stat => (
            <div key={stat.label} style={{ padding: '12px', background: 'var(--bg-base)', border: '2px solid var(--border)' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.06em', fontFamily: 'var(--font-body)', marginBottom: '4px' }}>
                {stat.label}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '22px' }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </WebLayout>
  )
}

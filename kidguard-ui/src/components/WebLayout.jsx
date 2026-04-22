import SideNav from './SideNav'

/**
 * Full-viewport web layout with left sidebar navigation.
 * Use for all authenticated parent app screens.
 *
 * @param {string} active - active nav key: 'map' | 'history' | 'zones' | 'alerts' | 'profile' | 'settings'
 */
export default function WebLayout({ children, active }) {
  const sidebarWidth = 220

  return (
    <div style={{
      height: '100vh',
      background: 'var(--bg-base)',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <SideNav active={active} />
      <div style={{
        position: 'absolute',
        left: `${sidebarWidth}px`,
        right: 0,
        top: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minWidth: 0,
        zIndex: 1,
      }}>
        {children}
      </div>
    </div>
  )
}

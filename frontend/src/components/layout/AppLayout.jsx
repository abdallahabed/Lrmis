import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'

const PAGE_TITLES = {
  '/dashboard':          'Applicant Dashboard',
  '/submit':             'Submit Application',
  '/track':              'Track Application',
  '/documents':          'Upload Documents',
  '/objections':         'Objections',
  '/staff/dashboard':    'Staff Dashboard',
  '/staff/applications': 'Application Management',
  '/map':                'Live Parcel Map',
  '/analytics':          'Analytics Dashboard',
}

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const title = PAGE_TITLES[location.pathname] || 'LRMIS'

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <header style={{
          background: 'var(--color-surface-raised)',
          borderBottom: '1px solid var(--color-navy-100)',
          padding: '0 28px',
          height: 60,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '17px', fontWeight: 700,
            color: 'var(--color-navy-900)',
          }}>
            {title}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-navy-700), var(--color-navy-900))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: '13px', fontWeight: 700,
            }}>
              U
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: '28px', maxWidth: 1400, width: '100%', margin: '0 auto' }}
          className="animate-fade-up">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

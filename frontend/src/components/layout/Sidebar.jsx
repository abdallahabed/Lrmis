import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, FilePlus, Search, Upload, AlertTriangle,
  Users, ClipboardList, Map, BarChart3, ChevronRight,
  Building2, LogOut
} from 'lucide-react'

const NAV_GROUPS = [
  {
    label: 'Applicant Portal',
    items: [
      { to: '/dashboard',        icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/submit',           icon: FilePlus,        label: 'Submit Application' },
      { to: '/track',            icon: Search,          label: 'Track Application' },
      { to: '/documents',        icon: Upload,          label: 'Upload Documents' },
      { to: '/objections',       icon: AlertTriangle,   label: 'Objections' },
    ],
  },
  {
    label: 'Staff Console',
    items: [
      { to: '/staff/dashboard',  icon: ClipboardList,   label: 'Staff Dashboard' },
      { to: '/staff/applications', icon: Users,         label: 'All Applications' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { to: '/map',              icon: Map,             label: 'Live Map' },
      { to: '/analytics',        icon: BarChart3,       label: 'Analytics' },
    ],
  },
]

export default function Sidebar({ collapsed, setCollapsed }) {
  return (
    <aside style={{
      width: collapsed ? 68 : 260,
      minHeight: '100vh',
      background: 'var(--color-navy-950)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.25s ease',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
    }}>
      {/* Logo */}
      <div style={{
        padding: collapsed ? '20px 0' : '24px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--color-emerald-500), var(--color-emerald-600))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Building2 size={18} color="#fff" />
          </div>
          {!collapsed && (
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: '#fff', fontSize: '14px', lineHeight: 1 }}>LRMIS</div>
              <div style={{ fontSize: '10px', color: 'var(--color-navy-400)', marginTop: 2 }}>Land Registry</div>
            </div>
          )}
        </div>
        {!collapsed && (
          <button onClick={() => setCollapsed(true)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-navy-400)', padding: 4,
          }}>
            <ChevronRight size={16} />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <button onClick={() => setCollapsed(false)} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--color-navy-400)', padding: '12px 0',
          display: 'flex', justifyContent: 'center',
        }}>
          <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} />
        </button>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, padding: collapsed ? '8px 0' : '16px 12px', overflowY: 'auto' }}>
        {NAV_GROUPS.map(group => (
          <div key={group.label} style={{ marginBottom: 24 }}>
            {!collapsed && (
              <div style={{
                fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em',
                color: 'var(--color-navy-500)', textTransform: 'uppercase',
                padding: '0 8px', marginBottom: 6,
              }}>
                {group.label}
              </div>
            )}
            {group.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center',
                  gap: collapsed ? 0 : 10,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  padding: collapsed ? '10px 0' : '9px 10px',
                  borderRadius: 10,
                  marginBottom: 2,
                  textDecoration: 'none',
                  color: isActive ? '#fff' : 'var(--color-navy-300)',
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(16,185,129,0.18), rgba(5,150,105,0.12))'
                    : 'transparent',
                  fontWeight: isActive ? 600 : 400,
                  fontSize: '13.5px',
                  transition: 'all 0.15s',
                  position: 'relative',
                })}
              >
                {({ isActive }) => (
                  <>
                    {isActive && !collapsed && (
                      <span style={{
                        position: 'absolute', left: 0, top: '20%', bottom: '20%',
                        width: 3, borderRadius: '0 2px 2px 0',
                        background: 'var(--color-emerald-400)',
                      }} />
                    )}
                    <item.icon size={16} color={isActive ? 'var(--color-emerald-400)' : undefined} />
                    {!collapsed && item.label}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{
        padding: collapsed ? '16px 0' : '16px 12px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        <button style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--color-navy-400)', fontSize: '13px',
          padding: '8px 10px', borderRadius: 8,
          fontFamily: 'var(--font-body)',
        }}>
          <LogOut size={15} />
          {!collapsed && 'Sign Out'}
        </button>
      </div>
    </aside>
  )
}

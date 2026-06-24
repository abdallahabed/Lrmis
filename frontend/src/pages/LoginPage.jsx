import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, User, ShieldCheck, MapPin } from 'lucide-react'
import { Button } from '../components/ui'

const ROLES = [
  {
    id: 'applicant',
    label: 'Applicant / Citizen',
    description: 'Submit and track land registration applications',
    icon: User,
    color: 'var(--color-emerald-500)',
    to: '/dashboard',
  },
  {
    id: 'staff',
    label: 'Staff / Registrar',
    description: 'Review applications, manage workflow, issue decisions',
    icon: ShieldCheck,
    color: 'var(--color-navy-600)',
    to: '/staff/dashboard',
  },
  {
    id: 'surveyor',
    label: 'Surveyor',
    description: 'Manage field survey tasks and upload reports',
    icon: MapPin,
    color: '#7c3aed',
    to: '/staff/dashboard',
  },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState(null)
  const [hovered, setHovered] = useState(null)

  const handleContinue = () => {
    if (selected) {
      const role = ROLES.find(r => r.id === selected)
      navigate(role.to)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-navy-950)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'absolute', top: -200, right: -200,
        width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: -150, left: -150,
        width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(72,101,129,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 520, position: 'relative' }} className="animate-fade-up">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 64, height: 64, borderRadius: 18,
            background: 'linear-gradient(135deg, var(--color-emerald-500), var(--color-emerald-600))',
            marginBottom: 20,
            boxShadow: '0 8px 32px rgba(16,185,129,0.3)',
          }}>
            <Building2 size={30} color="#fff" />
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 800,
            color: '#fff', marginBottom: 8,
          }}>
            LRMIS
          </h1>
          <p style={{ color: 'var(--color-navy-300)', fontSize: '14px' }}>
            Land Registration Management Information System
          </p>
        </div>

        {/* Role cards */}
        <div style={{
          background: 'var(--color-surface-dark-raised)',
          borderRadius: 20, padding: '32px',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: 'var(--shadow-float)',
        }}>
          <p style={{ color: 'var(--color-navy-300)', fontSize: '13px', marginBottom: 20, textAlign: 'center' }}>
            Select your role to continue
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            {ROLES.map(role => {
              const Icon = role.icon
              const isSelected = selected === role.id
              const isHovered = hovered === role.id

              return (
                <button
                  key={role.id}
                  onClick={() => setSelected(role.id)}
                  onMouseEnter={() => setHovered(role.id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    padding: '16px 20px', borderRadius: 14,
                    border: `2px solid ${isSelected ? role.color : 'rgba(255,255,255,0.06)'}`,
                    background: isSelected
                      ? `${role.color}14`
                      : isHovered ? 'rgba(255,255,255,0.04)' : 'transparent',
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.15s ease',
                    fontFamily: 'var(--font-body)',
                    width: '100%',
                  }}
                >
                  <div style={{
                    width: 42, height: 42, borderRadius: 11, flexShrink: 0,
                    background: `${role.color}20`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={18} color={role.color} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: '#fff', fontSize: '14px', marginBottom: 2 }}>
                      {role.label}
                    </div>
                    <div style={{ color: 'var(--color-navy-400)', fontSize: '12px' }}>
                      {role.description}
                    </div>
                  </div>
                  {isSelected && (
                    <div style={{
                      marginLeft: 'auto', width: 20, height: 20, borderRadius: '50%',
                      background: role.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <svg width="10" height="10" viewBox="0 0 12 9" fill="none">
                        <path d="M1 4.5L4.5 8L11 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          <Button
            variant="primary"
            size="lg"
            disabled={!selected}
            onClick={handleContinue}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            Continue
          </Button>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--color-navy-500)', fontSize: '12px', marginTop: 24 }}>
          Palestine Land Authority · COMP4382 Final Project · 2025–2026
        </p>
      </div>
    </div>
  )
}

import { STATUS_CONFIG, PRIORITY_CONFIG } from '../../lib/utils'

// ── StatusBadge ───────────────────────────────────────────────────────
export function StatusBadge({ status, size = 'sm' }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: '#627d98', bg: '#f0f4f8', dot: '#829ab1' }
  const px = size === 'lg' ? '12px 16px' : '4px 10px'
  const fs = size === 'lg' ? '13px' : '11px'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: cfg.bg, color: cfg.color,
      padding: px, borderRadius: 'var(--radius-badge)',
      fontSize: fs, fontWeight: 600, letterSpacing: '0.02em',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  )
}

// ── PriorityBadge ─────────────────────────────────────────────────────
export function PriorityBadge({ priority }) {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.normal
  return (
    <span style={{
      display: 'inline-block',
      background: cfg.bg, color: cfg.color,
      padding: '3px 8px', borderRadius: 'var(--radius-badge)',
      fontSize: '11px', fontWeight: 600, letterSpacing: '0.02em',
    }}>
      {cfg.label}
    </span>
  )
}

// ── Button ────────────────────────────────────────────────────────────
export function Button({ children, variant = 'primary', size = 'md', disabled, loading, onClick, type = 'button', style = {} }) {
  const styles = {
    primary: {
      background: 'linear-gradient(135deg, var(--color-emerald-500), var(--color-emerald-600))',
      color: '#fff', border: 'none',
    },
    secondary: {
      background: 'var(--color-surface-raised)',
      color: 'var(--color-navy-700)',
      border: '1.5px solid var(--color-navy-200)',
    },
    danger: {
      background: 'linear-gradient(135deg, var(--color-coral-400), var(--color-coral-500))',
      color: '#fff', border: 'none',
    },
    ghost: {
      background: 'transparent', color: 'var(--color-navy-600)',
      border: '1.5px solid transparent',
    },
    navy: {
      background: 'linear-gradient(135deg, var(--color-navy-700), var(--color-navy-900))',
      color: '#fff', border: 'none',
    },
  }
  const sizes = {
    sm:  { padding: '6px 14px', fontSize: '13px' },
    md:  { padding: '10px 20px', fontSize: '14px' },
    lg:  { padding: '13px 28px', fontSize: '15px' },
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        ...styles[variant],
        ...sizes[size],
        borderRadius: 'var(--radius-button)',
        fontFamily: 'var(--font-body)',
        fontWeight: 600,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.65 : 1,
        display: 'inline-flex', alignItems: 'center', gap: 8,
        transition: 'all 0.15s ease',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {loading && <Spinner size={14} color="currentColor" />}
      {children}
    </button>
  )
}

// ── Card ──────────────────────────────────────────────────────────────
export function Card({ children, style = {}, hover = false, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--color-surface-raised)',
        borderRadius: 'var(--radius-card)',
        boxShadow: 'var(--shadow-card)',
        border: '1px solid var(--color-navy-100)',
        padding: '24px',
        cursor: onClick ? 'pointer' : undefined,
        transition: hover || onClick ? 'all 0.2s ease' : undefined,
        ...style,
      }}
      onMouseEnter={e => { if (hover || onClick) e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)' }}
      onMouseLeave={e => { if (hover || onClick) e.currentTarget.style.boxShadow = 'var(--shadow-card)' }}
    >
      {children}
    </div>
  )
}

// ── Input ─────────────────────────────────────────────────────────────
export function Input({ label, error, hint, required, icon, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-navy-700)' }}>
          {label}{required && <span style={{ color: 'var(--color-coral-500)', marginLeft: 3 }}>*</span>}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {icon && (
          <span style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--color-navy-400)', display: 'flex', alignItems: 'center',
          }}>
            {icon}
          </span>
        )}
        <input
          {...props}
          style={{
            width: '100%',
            padding: icon ? '10px 14px 10px 38px' : '10px 14px',
            borderRadius: 'var(--radius-input)',
            border: `1.5px solid ${error ? 'var(--color-coral-400)' : 'var(--color-navy-200)'}`,
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            color: 'var(--color-navy-900)',
            background: 'var(--color-surface-raised)',
            outline: 'none',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => { e.target.style.borderColor = error ? 'var(--color-coral-400)' : 'var(--color-emerald-500)' }}
          onBlur={e => { e.target.style.borderColor = error ? 'var(--color-coral-400)' : 'var(--color-navy-200)' }}
        />
      </div>
      {error && <span style={{ fontSize: '12px', color: 'var(--color-coral-500)' }}>{error}</span>}
      {hint && !error && <span style={{ fontSize: '12px', color: 'var(--color-navy-400)' }}>{hint}</span>}
    </div>
  )
}

// ── Textarea ──────────────────────────────────────────────────────────
export function Textarea({ label, error, hint, required, rows = 4, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-navy-700)' }}>
          {label}{required && <span style={{ color: 'var(--color-coral-500)', marginLeft: 3 }}>*</span>}
        </label>
      )}
      <textarea
        {...props}
        rows={rows}
        style={{
          width: '100%',
          padding: '10px 14px',
          borderRadius: 'var(--radius-input)',
          border: `1.5px solid ${error ? 'var(--color-coral-400)' : 'var(--color-navy-200)'}`,
          fontFamily: 'var(--font-body)',
          fontSize: '14px',
          color: 'var(--color-navy-900)',
          background: 'var(--color-surface-raised)',
          outline: 'none',
          resize: 'vertical',
          transition: 'border-color 0.15s',
        }}
        onFocus={e => { e.target.style.borderColor = 'var(--color-emerald-500)' }}
        onBlur={e => { e.target.style.borderColor = error ? 'var(--color-coral-400)' : 'var(--color-navy-200)' }}
      />
      {error && <span style={{ fontSize: '12px', color: 'var(--color-coral-500)' }}>{error}</span>}
      {hint && !error && <span style={{ fontSize: '12px', color: 'var(--color-navy-400)' }}>{hint}</span>}
    </div>
  )
}

// ── Select ────────────────────────────────────────────────────────────
export function Select({ label, error, hint, required, options = [], ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-navy-700)' }}>
          {label}{required && <span style={{ color: 'var(--color-coral-500)', marginLeft: 3 }}>*</span>}
        </label>
      )}
      <select
        {...props}
        style={{
          width: '100%',
          padding: '10px 14px',
          borderRadius: 'var(--radius-input)',
          border: `1.5px solid ${error ? 'var(--color-coral-400)' : 'var(--color-navy-200)'}`,
          fontFamily: 'var(--font-body)',
          fontSize: '14px',
          color: 'var(--color-navy-900)',
          background: 'var(--color-surface-raised)',
          outline: 'none',
          cursor: 'pointer',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23627d98' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 14px center',
          paddingRight: 36,
        }}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <span style={{ fontSize: '12px', color: 'var(--color-coral-500)' }}>{error}</span>}
      {hint && !error && <span style={{ fontSize: '12px', color: 'var(--color-navy-400)' }}>{hint}</span>}
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────
export function Spinner({ size = 20, color = 'var(--color-emerald-500)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ animation: 'spin 0.7s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

// ── PageLoader ────────────────────────────────────────────────────────
export function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
      <Spinner size={36} />
    </div>
  )
}

// ── EmptyState ────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 24px' }}>
      {icon && <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>}
      <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-navy-800)', marginBottom: 8 }}>{title}</h3>
      {description && <p style={{ color: 'var(--color-navy-500)', fontSize: '14px', marginBottom: 24 }}>{description}</p>}
      {action}
    </div>
  )
}

// ── Alert ─────────────────────────────────────────────────────────────
export function Alert({ type = 'info', title, children }) {
  const configs = {
    info:    { bg: 'var(--color-navy-50)',    border: 'var(--color-navy-200)',   color: 'var(--color-navy-700)' },
    success: { bg: 'var(--color-emerald-50)', border: 'var(--color-emerald-200)', color: 'var(--color-emerald-700)' },
    warning: { bg: 'var(--color-amber-50)',   border: 'var(--color-amber-200)',  color: '#92400e' },
    error:   { bg: 'var(--color-coral-50)',   border: 'var(--color-coral-200)',  color: 'var(--color-coral-500)' },
  }
  const c = configs[type]
  return (
    <div style={{
      background: c.bg, border: `1.5px solid ${c.border}`, borderRadius: 'var(--radius-input)',
      padding: '12px 16px', color: c.color,
    }}>
      {title && <div style={{ fontWeight: 700, marginBottom: 4, fontSize: '14px' }}>{title}</div>}
      <div style={{ fontSize: '13px' }}>{children}</div>
    </div>
  )
}

// ── Divider ───────────────────────────────────────────────────────────
export function Divider({ label }) {
  if (!label) return <hr style={{ border: 'none', borderTop: '1px solid var(--color-navy-100)', margin: '20px 0' }} />
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--color-navy-100)' }} />
      <span style={{ fontSize: '12px', color: 'var(--color-navy-400)', fontWeight: 600, letterSpacing: '0.05em' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--color-navy-100)' }} />
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────
export function KpiCard({ label, value, icon, color = 'var(--color-emerald-500)', trend }) {
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '13px', color: 'var(--color-navy-500)', fontWeight: 500, marginBottom: 8 }}>{label}</div>
          <div style={{ fontSize: '32px', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--color-navy-900)', lineHeight: 1 }}>
            {value ?? <span className="skeleton" style={{ display: 'inline-block', width: 60, height: 32 }} />}
          </div>
          {trend && <div style={{ fontSize: '12px', color: 'var(--color-navy-400)', marginTop: 6 }}>{trend}</div>}
        </div>
        {icon && (
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: `${color}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color,
          }}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  )
}

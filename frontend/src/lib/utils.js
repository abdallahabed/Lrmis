// ── Status config ─────────────────────────────────────────────────────
export const STATUS_CONFIG = {
  submitted:          { label: 'Submitted',          color: '#627d98', bg: '#f0f4f8', dot: '#829ab1' },
  pre_checked:        { label: 'Pre-Checked',        color: '#486581', bg: '#d9e2ec', dot: '#627d98' },
  survey_required:    { label: 'Survey Required',    color: '#b45309', bg: '#fffbeb', dot: '#f59e0b' },
  surveyed:           { label: 'Surveyed',           color: '#0369a1', bg: '#e0f2fe', dot: '#0284c7' },
  legal_review:       { label: 'Legal Review',       color: '#7c3aed', bg: '#f5f3ff', dot: '#8b5cf6' },
  approved:           { label: 'Approved',           color: '#047857', bg: '#ecfdf5', dot: '#10b981' },
  certificate_issued: { label: 'Certificate Issued', color: '#065f46', bg: '#d1fae5', dot: '#059669' },
  closed:             { label: 'Closed',             color: '#374151', bg: '#f9fafb', dot: '#9ca3af' },
  rejected:           { label: 'Rejected',           color: '#be123c', bg: '#fff1f2', dot: '#f43f5e' },
  on_hold:            { label: 'On Hold',            color: '#92400e', bg: '#fef3c7', dot: '#fbbf24' },
  missing_documents:  { label: 'Missing Docs',       color: '#c2410c', bg: '#fff7ed', dot: '#fb923c' },
  under_objection:    { label: 'Under Objection',    color: '#9d174d', bg: '#fdf2f8', dot: '#ec4899' },
}

export const APP_TYPE_LABELS = {
  first_registration:  'First Registration',
  ownership_transfer:  'Ownership Transfer',
  parcel_subdivision:  'Parcel Subdivision',
  parcel_merge:        'Parcel Merge',
  boundary_correction: 'Boundary Correction',
  certificate_request: 'Certificate Request',
}

export const PRIORITY_CONFIG = {
  low:    { label: 'Low',    color: '#627d98', bg: '#f0f4f8' },
  normal: { label: 'Normal', color: '#486581', bg: '#d9e2ec' },
  high:   { label: 'High',   color: '#b45309', bg: '#fffbeb' },
  urgent: { label: 'Urgent', color: '#be123c', bg: '#fff1f2' },
}

// ── Formatters ────────────────────────────────────────────────────────
export function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function formatRelative(iso) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(mins / 60)
  const days = Math.floor(hrs / 24)
  if (days > 7) return formatDate(iso)
  if (days > 0) return `${days}d ago`
  if (hrs > 0) return `${hrs}h ago`
  if (mins > 0) return `${mins}m ago`
  return 'just now'
}

// ── Generate idempotency key ──────────────────────────────────────────
export function generateIdempotencyKey() {
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// ── Applicant type labels ─────────────────────────────────────────────
export const APPLICANT_TYPE_LABELS = {
  citizen:                  'Citizen',
  lawyer:                   'Lawyer',
  company:                  'Company',
  surveyor:                 'Surveyor',
  authorized_representative: 'Authorized Representative',
}

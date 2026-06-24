import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Filter, ChevronDown, X, ArrowRight, Ban, PauseCircle, Award } from 'lucide-react'
import toast from 'react-hot-toast'
import { Card, Button, Input, Select, StatusBadge, PriorityBadge, PageLoader, Alert, Textarea } from '../components/ui'
import { applicationsApi, staffApi } from '../lib/api'
import { formatDateTime, APP_TYPE_LABELS, STATUS_CONFIG } from '../lib/utils'

const STATUS_OPTS = [
  { value: '', label: 'All Statuses' },
  ...Object.entries(STATUS_CONFIG).map(([v, c]) => ({ value: v, label: c.label })),
]
const TYPE_OPTS = [
  { value: '', label: 'All Types' },
  ...Object.entries(APP_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l })),
]
const PRIORITY_OPTS = [
  { value: '', label: 'All Priorities' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'normal', label: 'Normal' },
  { value: 'low', label: 'Low' },
]

// Workflow next states allowed for staff to trigger manually
const MANUAL_TRANSITIONS = {
  submitted:       ['pre_checked', 'missing_documents', 'rejected'],
  pre_checked:     ['survey_required', 'legal_review', 'missing_documents', 'rejected'],
  survey_required: ['on_hold', 'rejected'],
  surveyed:        ['legal_review', 'missing_documents', 'rejected'],
  legal_review:    ['approved', 'under_objection', 'missing_documents', 'on_hold', 'rejected'],
  approved:        ['certificate_issued'],
  on_hold:         ['pre_checked', 'survey_required', 'legal_review', 'rejected'],
  missing_documents: ['pre_checked', 'survey_required', 'legal_review', 'rejected'],
  under_objection: ['legal_review', 'rejected', 'on_hold'],
}

export default function StaffApplicationsPage() {
  const [searchParams] = useSearchParams()
  const [apps, setApps] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')

  // Action modals
  const [actionModal, setActionModal] = useState(null) // { type: 'transition'|'reject'|'hold'|'note', data: {} }
  const [actionInput, setActionInput] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const LIMIT = 15

  useEffect(() => {
    fetchApps()
    // Auto-open if URL has ?id=
    const id = searchParams.get('id')
    if (id) openDetail(id)
  }, [page, statusFilter, typeFilter, priorityFilter])

  async function fetchApps() {
    setLoading(true)
    try {
      const res = await applicationsApi.list({
        page, limit: LIMIT,
        status: statusFilter || undefined,
        application_type: typeFilter || undefined,
        priority: priorityFilter || undefined,
        search: search || undefined,
      })
      setApps(res.data.items || [])
      setTotal(res.data.total || 0)
    } catch { setApps([]) }
    finally { setLoading(false) }
  }

  async function openDetail(id) {
    setDetailLoading(true)
    setSelected(null)
    try {
      const [appRes, tlRes, docsRes] = await Promise.all([
        applicationsApi.get(id),
        applicationsApi.getTimeline(id),
        applicationsApi.getDocuments(id),
      ])
      setSelected({ app: appRes.data, timeline: tlRes.data, docs: docsRes.data })
    } catch { toast.error('Could not load application details') }
    finally { setDetailLoading(false) }
  }

  async function executeAction() {
    if (!selected || !actionModal) return
    const appId = selected.app.application_id
    setActionLoading(true)
    try {
      if (actionModal.type === 'transition') {
        await applicationsApi.transition(appId, {
          target_state: actionModal.targetState,
          reason: actionInput || undefined,
          actor_id: 'staff_console',
          actor_type: 'staff',
        })
        toast.success(`Moved to ${actionModal.targetState}`)
      } else if (actionModal.type === 'reject') {
        if (!actionInput.trim() || actionInput.length < 10) {
          toast.error('Rejection reason must be at least 10 characters')
          setActionLoading(false)
          return
        }
        await applicationsApi.reject(appId, { reason: actionInput, actor_id: 'staff_console' })
        toast.success('Application rejected')
      } else if (actionModal.type === 'hold') {
        if (!actionInput.trim()) { toast.error('Hold reason is required'); setActionLoading(false); return }
        await applicationsApi.hold(appId, { reason: actionInput, actor_id: 'staff_console' })
        toast.success('Application placed on hold')
      } else if (actionModal.type === 'assign') {
        await staffApi.autoAssign(appId)
        toast.success('Surveyor auto-assigned!')
      } else if (actionModal.type === 'certificate') {
        await applicationsApi.generateCertificate(appId)
        toast.success('Certificate generated!')
      }

      setActionModal(null)
      setActionInput('')
      await openDetail(appId)
      fetchApps()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Action failed')
    } finally { setActionLoading(false) }
  }

  const handleSearch = useCallback(() => {
    setPage(1)
    fetchApps()
  }, [search, statusFilter, typeFilter, priorityFilter])

  return (
    <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 120px)' }}>
      {/* Left: Application list */}
      <div style={{ width: selected ? 380 : '100%', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14, transition: 'width 0.25s ease', minWidth: 0 }}>
        {/* Filters */}
        <Card style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <Input placeholder="Search ID, applicant, parcel..." value={search}
                onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()}
                icon={<Search size={14} />} />
            </div>
            <Select options={STATUS_OPTS} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} style={{ width: 150 }} />
            <Select options={TYPE_OPTS} value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }} style={{ width: 150 }} />
            <Select options={PRIORITY_OPTS} value={priorityFilter} onChange={e => { setPriorityFilter(e.target.value); setPage(1) }} style={{ width: 120 }} />
            <Button variant="primary" size="sm" onClick={handleSearch}>Search</Button>
          </div>
          <div style={{ marginTop: 8, fontSize: '12px', color: 'var(--color-navy-400)' }}>
            {total} application{total !== 1 ? 's' : ''} found
          </div>
        </Card>

        {/* Table */}
        <Card style={{ flex: 1, padding: 0, overflow: 'auto' }}>
          {loading ? <PageLoader /> : apps.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-navy-400)', fontSize: '14px' }}>
              No applications match your filters.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--color-navy-50)', zIndex: 1 }}>
                <tr>
                  {['Application', 'Status', 'Priority', 'Zone', 'Submitted'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--color-navy-500)', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {apps.map((app, i) => {
                  const isActive = selected?.app?.id === app.id
                  return (
                    <tr key={app.id}
                      onClick={() => openDetail(app.application_id)}
                      style={{
                        borderBottom: '1px solid var(--color-navy-50)',
                        cursor: 'pointer',
                        background: isActive ? 'var(--color-emerald-50)' : 'transparent',
                        borderLeft: isActive ? '3px solid var(--color-emerald-500)' : '3px solid transparent',
                      }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--color-navy-50)' }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                    >
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: 'var(--color-navy-700)', marginBottom: 2 }}>{app.application_id}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-navy-400)' }}>{APP_TYPE_LABELS[app.application_type]}</div>
                      </td>
                      <td style={{ padding: '11px 14px' }}><StatusBadge status={app.status} /></td>
                      <td style={{ padding: '11px 14px' }}><PriorityBadge priority={app.priority} /></td>
                      <td style={{ padding: '11px 14px', fontSize: '11px', color: 'var(--color-navy-500)' }}>{app.parcel_ref?.zone_id || '—'}</td>
                      <td style={{ padding: '11px 14px', fontSize: '11px', color: 'var(--color-navy-400)', whiteSpace: 'nowrap' }}>
                        {app.timestamps?.submitted_at ? new Date(app.timestamps.submitted_at).toLocaleDateString('en-GB') : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </Card>

        {/* Pagination */}
        {total > LIMIT && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
            <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</Button>
            <span style={{ fontSize: '12px', color: 'var(--color-navy-500)' }}>Page {page} of {Math.ceil(total / LIMIT)}</span>
            <Button variant="secondary" size="sm" disabled={page * LIMIT >= total} onClick={() => setPage(p => p + 1)}>Next →</Button>
          </div>
        )}
      </div>

      {/* Right: Detail panel */}
      {(selected || detailLoading) && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0, overflowY: 'auto' }}>
          {detailLoading ? <PageLoader /> : selected && (
            <>
              {/* Header */}
              <Card style={{ padding: '18px 22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div>
                    <code style={{ fontSize: '13px', color: 'var(--color-navy-500)' }}>{selected.app.application_id}</code>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 800, color: 'var(--color-navy-900)', margin: '4px 0 8px' }}>
                      {APP_TYPE_LABELS[selected.app.application_type]}
                    </h2>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <StatusBadge status={selected.app.status} size="lg" />
                      <PriorityBadge priority={selected.app.priority} />
                    </div>
                  </div>
                  <button onClick={() => setSelected(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-navy-400)', padding: 4 }}>
                    <X size={18} />
                  </button>
                </div>
              </Card>

              {/* Action buttons */}
              <Card style={{ padding: '14px 18px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-navy-500)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
                  Staff Actions
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {/* Workflow transitions */}
                  {(MANUAL_TRANSITIONS[selected.app.status] || [])
                    .filter(s => s !== 'rejected' && s !== 'on_hold')
                    .map(s => (
                      <Button key={s} variant="secondary" size="sm"
                        onClick={() => { setActionModal({ type: 'transition', targetState: s }); setActionInput('') }}>
                        <ArrowRight size={12} /> → {s.replace(/_/g, ' ')}
                      </Button>
                    ))
                  }

                  {/* Auto-assign */}
                  {selected.app.status === 'survey_required' && (
                    <Button variant="navy" size="sm" onClick={() => setActionModal({ type: 'assign' })}>
                      Auto-Assign Surveyor
                    </Button>
                  )}

                  {/* Certificate */}
                  {selected.app.status === 'approved' && (
                    <Button variant="primary" size="sm" onClick={() => setActionModal({ type: 'certificate' })}>
                      <Award size={12} /> Issue Certificate
                    </Button>
                  )}

                  {/* Hold */}
                  {!['closed', 'rejected', 'certificate_issued'].includes(selected.app.status) && (
                    <Button variant="ghost" size="sm" onClick={() => { setActionModal({ type: 'hold' }); setActionInput('') }}
                      style={{ color: '#92400e' }}>
                      <PauseCircle size={12} /> Hold
                    </Button>
                  )}

                  {/* Reject */}
                  {!['closed', 'rejected', 'certificate_issued'].includes(selected.app.status) && (
                    <Button variant="danger" size="sm" onClick={() => { setActionModal({ type: 'reject' }); setActionInput('') }}>
                      <Ban size={12} /> Reject
                    </Button>
                  )}
                </div>
              </Card>

              {/* Action modal inline */}
              {actionModal && (
                <Card style={{ border: '2px solid var(--color-emerald-200)', background: 'var(--color-emerald-50)', padding: '16px 20px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-navy-800)', marginBottom: 12 }}>
                    {actionModal.type === 'transition' && `Confirm: Move to "${actionModal.targetState.replace(/_/g, ' ')}"`}
                    {actionModal.type === 'reject' && 'Confirm Rejection'}
                    {actionModal.type === 'hold' && 'Place on Hold'}
                    {actionModal.type === 'assign' && 'Auto-Assign Surveyor'}
                    {actionModal.type === 'certificate' && 'Issue Certificate'}
                  </div>

                  {['transition', 'reject', 'hold'].includes(actionModal.type) && (
                    <Textarea
                      rows={3}
                      placeholder={
                        actionModal.type === 'reject' ? 'Mandatory rejection reason (min 10 chars)...' :
                        actionModal.type === 'hold' ? 'Reason for hold (required)...' :
                        'Optional note for this transition...'
                      }
                      value={actionInput}
                      onChange={e => setActionInput(e.target.value)}
                    />
                  )}
                  {['assign', 'certificate'].includes(actionModal.type) && (
                    <Alert type="info">
                      {actionModal.type === 'assign' && 'The system will select the best available surveyor based on zone, workload, and availability.'}
                      {actionModal.type === 'certificate' && 'This will generate a certificate and move the application to certificate_issued.'}
                    </Alert>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <Button variant="primary" size="sm" loading={actionLoading} onClick={executeAction}>Confirm</Button>
                    <Button variant="ghost" size="sm" onClick={() => { setActionModal(null); setActionInput('') }}>Cancel</Button>
                  </div>
                </Card>
              )}

              {/* Details grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Card style={{ padding: '16px 18px' }}>
                  <SectionLabel>Applicant</SectionLabel>
                  <InfoRow label="Name" value={selected.app.applicant_ref?.full_name} />
                  <InfoRow label="Type" value={selected.app.applicant_ref?.applicant_type} />
                </Card>
                <Card style={{ padding: '16px 18px' }}>
                  <SectionLabel>Parcel</SectionLabel>
                  <InfoRow label="Parcel" value={`P${selected.app.parcel_ref?.parcel_number}`} />
                  <InfoRow label="Block"  value={`B${selected.app.parcel_ref?.block_number}`} />
                  <InfoRow label="Zone"   value={selected.app.parcel_ref?.zone_id} />
                </Card>
              </div>

              {/* Timestamps */}
              <Card style={{ padding: '16px 18px' }}>
                <SectionLabel>Key Timestamps</SectionLabel>
                {[
                  ['Submitted',    selected.app.timestamps?.submitted_at],
                  ['Pre-Checked',  selected.app.timestamps?.pre_checked_at],
                  ['Legal Review', selected.app.timestamps?.legal_review_at],
                  ['Approved',     selected.app.timestamps?.approved_at],
                ].filter(([, v]) => v).map(([label, val]) => (
                  <InfoRow key={label} label={label} value={formatDateTime(val)} />
                ))}
              </Card>

              {/* Documents */}
              {selected.docs?.required_documents?.length > 0 && (
                <Card style={{ padding: '16px 18px' }}>
                  <SectionLabel>Required Documents</SectionLabel>
                  {selected.docs.required_documents.map((d, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--color-navy-50)' }}>
                      <span style={{ fontSize: '13px', color: 'var(--color-navy-700)', textTransform: 'capitalize' }}>
                        {d.document_type.replace(/_/g, ' ')}
                      </span>
                      <span style={{
                        fontSize: '11px', fontWeight: 700,
                        color: d.status === 'verified' ? 'var(--color-emerald-600)' : d.status === 'pending_review' ? '#92400e' : 'var(--color-coral-500)',
                      }}>
                        {d.status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </div>
                  ))}
                </Card>
              )}

              {/* Timeline */}
              {selected.timeline?.timeline?.length > 0 && (
                <Card style={{ padding: '16px 18px' }}>
                  <SectionLabel>Recent Events</SectionLabel>
                  <div style={{ marginTop: 10 }}>
                    {selected.timeline.timeline.slice(-5).reverse().map((event, i) => (
                      <div key={i} style={{
                        display: 'flex', gap: 10, paddingBottom: 12,
                        borderBottom: i < 4 ? '1px solid var(--color-navy-50)' : 'none',
                        marginBottom: 12,
                      }}>
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 4,
                          background: event.is_current ? 'var(--color-emerald-500)' : 'var(--color-navy-300)',
                        }} />
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-navy-800)' }}>{event.label}</div>
                          <div style={{ fontSize: '11px', color: 'var(--color-navy-400)' }}>{formatDateTime(event.timestamp)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Notes */}
              {selected.app.internal?.notes?.length > 0 && (
                <Card style={{ padding: '16px 18px' }}>
                  <SectionLabel>Internal Notes</SectionLabel>
                  {selected.app.internal.notes.map((n, i) => (
                    <div key={i} style={{
                      padding: '10px 12px', borderRadius: 8, background: 'var(--color-navy-50)',
                      fontSize: '12.5px', color: 'var(--color-navy-700)', marginTop: 8,
                      borderLeft: '3px solid var(--color-navy-300)',
                    }}>
                      {n}
                    </div>
                  ))}
                </Card>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-navy-500)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
      {children}
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', padding: '7px 0', borderBottom: '1px solid var(--color-navy-50)' }}>
      <div style={{ width: 90, fontSize: '11px', color: 'var(--color-navy-400)', fontWeight: 500 }}>{label}</div>
      <div style={{ flex: 1, fontSize: '12.5px', color: 'var(--color-navy-800)', fontWeight: 500 }}>{value || '—'}</div>
    </div>
  )
}

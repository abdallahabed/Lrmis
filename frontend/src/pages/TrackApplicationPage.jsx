import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Search, Clock, MapPin, FileText, AlertTriangle, ChevronRight, Upload } from 'lucide-react'
import { Card, Button, Input, StatusBadge, PriorityBadge, PageLoader, EmptyState, Alert } from '../components/ui'
import { applicationsApi } from '../lib/api'
import { formatDateTime, formatDate, APP_TYPE_LABELS } from '../lib/utils'

const STEP_LABELS = {
  submitted:          { n: 1, label: 'Submitted' },
  pre_checked:        { n: 2, label: 'Pre-Check' },
  survey_required:    { n: 3, label: 'Survey' },
  surveyed:           { n: 4, label: 'Surveyed' },
  legal_review:       { n: 5, label: 'Legal Review' },
  approved:           { n: 6, label: 'Approved' },
  certificate_issued: { n: 7, label: 'Certificate' },
  closed:             { n: 8, label: 'Closed' },
}

export default function TrackApplicationPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [searchId, setSearchId] = useState(searchParams.get('id') || '')
  const [app, setApp] = useState(null)
  const [timeline, setTimeline] = useState(null)
  const [documents, setDocuments] = useState(null)
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (searchParams.get('id')) {
      handleSearch(searchParams.get('id'))
    }
  }, [])

  async function handleSearch(id) {
    const query = (id || searchId).trim()
    if (!query) return
    setLoading(true)
    setNotFound(false)
    setApp(null)
    try {
      const [appRes, tlRes, docsRes] = await Promise.all([
        applicationsApi.get(query),
        applicationsApi.getTimeline(query),
        applicationsApi.getDocuments(query),
      ])
      setApp(appRes.data)
      setTimeline(tlRes.data)
      setDocuments(docsRes.data)
    } catch (e) {
      if (e.response?.status === 404) setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  const TABS = [
    { id: 'overview',  label: 'Overview' },
    { id: 'timeline',  label: 'Timeline' },
    { id: 'documents', label: 'Documents' },
    { id: 'notes',     label: 'Notes & Remarks' },
  ]

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Search bar */}
      <Card style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <Input
              label="Application ID"
              placeholder="e.g. LRMIS-2026-0001 or MongoDB ObjectId"
              value={searchId}
              onChange={e => setSearchId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              icon={<Search size={15} />}
            />
          </div>
          <Button variant="primary" onClick={() => handleSearch()} loading={loading} size="md">
            Search
          </Button>
        </div>
      </Card>

      {loading && <PageLoader />}

      {notFound && (
        <Alert type="error" title="Application not found">
          No application found with that ID. Please check and try again.
        </Alert>
      )}

      {app && (
        <>
          {/* Header card */}
          <Card style={{ padding: '24px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--color-navy-400)', marginBottom: 4, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Land Registration Application
                </div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 800, color: 'var(--color-navy-900)', marginBottom: 10 }}>
                  {app.application_id}
                </h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                  <StatusBadge status={app.status} size="lg" />
                  <PriorityBadge priority={app.priority} />
                  <span style={{ fontSize: '13px', color: 'var(--color-navy-500)' }}>
                    {APP_TYPE_LABELS[app.application_type] || app.application_type}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <Button variant="secondary" size="sm" onClick={() => navigate('/documents')}>
                  <Upload size={13} /> Upload Docs
                </Button>
                <Button variant="secondary" size="sm" onClick={() => navigate('/objections')}>
                  <AlertTriangle size={13} /> Objection
                </Button>
              </div>
            </div>

            {/* Progress bar */}
            {STEP_LABELS[app.status] && (
              <div style={{ marginTop: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '12px', color: 'var(--color-navy-500)' }}>Progress</span>
                  <span style={{ fontSize: '12px', color: 'var(--color-navy-500)' }}>
                    Step {STEP_LABELS[app.status]?.n || '?'} of 8
                  </span>
                </div>
                <div style={{ height: 6, background: 'var(--color-navy-100)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 3,
                    width: `${((STEP_LABELS[app.status]?.n || 1) / 8) * 100}%`,
                    background: ['rejected', 'on_hold'].includes(app.status)
                      ? 'var(--color-coral-400)'
                      : 'linear-gradient(90deg, var(--color-emerald-500), var(--color-emerald-400))',
                    transition: 'width 0.5s ease',
                  }} />
                </div>
              </div>
            )}
          </Card>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '1.5px solid var(--color-navy-100)' }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', fontSize: '13.5px', fontWeight: activeTab === tab.id ? 700 : 500,
                  color: activeTab === tab.id ? 'var(--color-navy-900)' : 'var(--color-navy-400)',
                  borderBottom: activeTab === tab.id ? '2.5px solid var(--color-emerald-500)' : '2.5px solid transparent',
                  marginBottom: -1.5,
                  transition: 'all 0.15s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab: Overview */}
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="animate-fade-in">
              <Card>
                <SectionTitle>Applicant</SectionTitle>
                <InfoRow label="Name"         value={app.applicant_ref?.full_name} />
                <InfoRow label="Type"         value={app.applicant_ref?.applicant_type} />
                <InfoRow label="Submitted"    value={formatDateTime(app.timestamps?.submitted_at)} />
                <InfoRow label="Last Updated" value={formatDateTime(app.timestamps?.updated_at)} />
              </Card>
              <Card>
                <SectionTitle>Parcel</SectionTitle>
                <InfoRow label="Parcel No."  value={`P${app.parcel_ref?.parcel_number}`} />
                <InfoRow label="Block No."   value={`B${app.parcel_ref?.block_number}`} />
                <InfoRow label="Basin No."   value={app.parcel_ref?.basin_number} />
                <InfoRow label="Zone"        value={app.parcel_ref?.zone_id} />
              </Card>
              {app.status === 'rejected' && (
                <Card style={{ gridColumn: '1/-1', borderColor: 'var(--color-coral-200)', background: 'var(--color-coral-50)' }}>
                  <SectionTitle style={{ color: 'var(--color-coral-500)' }}>Rejection Reason</SectionTitle>
                  <p style={{ fontSize: '14px', color: 'var(--color-coral-500)', marginTop: 8 }}>
                    {app.internal?.rejection_reason || 'No reason provided.'}
                  </p>
                </Card>
              )}
              {app.status === 'on_hold' && (
                <Card style={{ gridColumn: '1/-1', borderColor: 'var(--color-amber-200)', background: 'var(--color-amber-50)' }}>
                  <SectionTitle style={{ color: '#92400e' }}>Hold Reason</SectionTitle>
                  <p style={{ fontSize: '14px', color: '#92400e', marginTop: 8 }}>
                    {app.internal?.hold_reason || 'Application is on hold.'}
                  </p>
                </Card>
              )}
              <Card style={{ gridColumn: '1/-1' }}>
                <SectionTitle>Next Steps</SectionTitle>
                {(app.workflow?.allowed_next || []).length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                    {app.workflow.allowed_next.map(s => (
                      <span key={s} style={{
                        padding: '4px 12px', borderRadius: 8, fontSize: '12px',
                        background: 'var(--color-navy-50)', color: 'var(--color-navy-600)', fontWeight: 600,
                      }}>→ {s.replace(/_/g, ' ')}</span>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', color: 'var(--color-navy-400)', marginTop: 8 }}>No further transitions available.</p>
                )}
              </Card>
            </div>
          )}

          {/* Tab: Timeline */}
          {activeTab === 'timeline' && timeline && (
            <Card className="animate-fade-in">
              <SectionTitle>Application Timeline</SectionTitle>
              {timeline.timeline?.length === 0 ? (
                <p style={{ color: 'var(--color-navy-400)', fontSize: '13px', marginTop: 12 }}>No events recorded yet.</p>
              ) : (
                <div style={{ position: 'relative', paddingLeft: 28, marginTop: 20 }}>
                  <div style={{
                    position: 'absolute', left: 9, top: 8, bottom: 8,
                    width: 2, background: 'var(--color-navy-100)', borderRadius: 1,
                  }} />
                  {(timeline.timeline || []).map((event, i) => (
                    <div key={i} style={{ position: 'relative', marginBottom: 24 }}>
                      <div style={{
                        position: 'absolute', left: -28, top: 4,
                        width: 12, height: 12, borderRadius: '50%',
                        background: event.is_current ? 'var(--color-emerald-500)' : 'var(--color-navy-300)',
                        border: event.is_current ? '3px solid var(--color-emerald-100)' : '2px solid #fff',
                        zIndex: 1,
                      }} />
                      <div style={{
                        fontSize: '13.5px', fontWeight: event.is_current ? 700 : 600,
                        color: event.is_current ? 'var(--color-navy-900)' : 'var(--color-navy-700)',
                        marginBottom: 2,
                      }}>
                        {event.label}
                        {event.is_current && (
                          <span style={{
                            marginLeft: 8, fontSize: '10px', fontWeight: 700,
                            background: 'var(--color-emerald-50)', color: 'var(--color-emerald-600)',
                            padding: '2px 7px', borderRadius: 6,
                          }}>CURRENT</span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-navy-400)' }}>
                        {formatDateTime(event.timestamp)}
                      </div>
                      {event.actor && (
                        <div style={{ fontSize: '11px', color: 'var(--color-navy-400)', marginTop: 2 }}>
                          by {event.actor.actor_type} {event.actor.actor_id !== 'system' ? `(${event.actor.actor_id})` : '(system)'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Tab: Documents */}
          {activeTab === 'documents' && documents && (
            <Card className="animate-fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <SectionTitle>Required Documents</SectionTitle>
                <Button variant="secondary" size="sm" onClick={() => navigate('/documents')}>
                  <Upload size={13} /> Upload
                </Button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(documents.required_documents || []).map((doc, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', borderRadius: 10,
                    border: '1.5px solid var(--color-navy-100)',
                    background: doc.status === 'verified' ? 'var(--color-emerald-50)' : 'var(--color-surface-raised)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <FileText size={16} color={doc.status === 'verified' ? 'var(--color-emerald-500)' : 'var(--color-navy-400)'} />
                      <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-navy-700)', textTransform: 'capitalize' }}>
                        {doc.document_type.replace(/_/g, ' ')}
                      </span>
                      {doc.required && <span style={{ fontSize: '10px', color: 'var(--color-coral-500)', fontWeight: 700 }}>REQUIRED</span>}
                    </div>
                    <span style={{
                      fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: 6,
                      background: doc.status === 'verified' ? 'var(--color-emerald-100)' : doc.status === 'pending_review' ? 'var(--color-amber-50)' : 'var(--color-navy-100)',
                      color: doc.status === 'verified' ? 'var(--color-emerald-700)' : doc.status === 'pending_review' ? '#92400e' : 'var(--color-navy-500)',
                      textTransform: 'uppercase',
                    }}>
                      {doc.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
                {documents.uploaded_documents?.length > 0 && (
                  <>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-navy-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--color-navy-100)' }}>
                      Uploaded Files
                    </div>
                    {documents.uploaded_documents.map((d, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 16px', borderRadius: 10, border: '1px solid var(--color-navy-100)',
                      }}>
                        <FileText size={15} color="var(--color-navy-400)" />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-navy-700)' }}>{d.file_name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--color-navy-400)' }}>{d.document_type.replace(/_/g, ' ')} · {d.file_size_kb ? `${d.file_size_kb} KB` : ''}</div>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--color-amber-500)', fontWeight: 600 }}>{d.review_status?.replace(/_/g, ' ')}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </Card>
          )}

          {/* Tab: Notes */}
          {activeTab === 'notes' && (
            <Card className="animate-fade-in">
              <SectionTitle>Registrar Notes (Public)</SectionTitle>
              {(app.internal?.notes || []).length === 0 ? (
                <p style={{ color: 'var(--color-navy-400)', fontSize: '13px', marginTop: 12 }}>No notes available.</p>
              ) : (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {app.internal.notes.map((note, i) => (
                    <div key={i} style={{
                      padding: '12px 16px', borderRadius: 10,
                      background: 'var(--color-navy-50)', fontSize: '13.5px',
                      color: 'var(--color-navy-700)', borderLeft: '3px solid var(--color-navy-300)',
                    }}>
                      {note}
                    </div>
                  ))}
                </div>
              )}

              {app.description && (
                <div style={{ marginTop: 20 }}>
                  <SectionTitle>Application Description</SectionTitle>
                  <p style={{ marginTop: 10, fontSize: '13.5px', color: 'var(--color-navy-600)' }}>{app.description}</p>
                </div>
              )}
            </Card>
          )}
        </>
      )}

      {!app && !loading && !notFound && (
        <EmptyState
          icon="🔍"
          title="Search for your application"
          description="Enter an application ID above to view full details, timeline, and document status."
        />
      )}
    </div>
  )
}

function SectionTitle({ children, style = {} }) {
  return (
    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-navy-500)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4, ...style }}>
      {children}
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', padding: '9px 0', borderBottom: '1px solid var(--color-navy-50)' }}>
      <div style={{ width: 120, fontSize: '12px', color: 'var(--color-navy-400)', fontWeight: 500 }}>{label}</div>
      <div style={{ flex: 1, fontSize: '13px', color: 'var(--color-navy-800)', fontWeight: 500 }}>{value || '—'}</div>
    </div>
  )
}

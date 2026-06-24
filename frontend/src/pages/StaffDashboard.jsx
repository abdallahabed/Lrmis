import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Clock, AlertTriangle, CheckCircle, XCircle, ChevronRight, RefreshCw } from 'lucide-react'
import { Card, KpiCard, StatusBadge, PriorityBadge, Button, PageLoader, EmptyState } from '../components/ui'
import { applicationsApi, analyticsApi } from '../lib/api'
import { formatRelative, APP_TYPE_LABELS } from '../lib/utils'

export default function StaffDashboard() {
  const navigate = useNavigate()
  const [kpis, setKpis] = useState(null)
  const [recentApps, setRecentApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => { fetchData() }, [])

  async function fetchData(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const [kpisRes, appsRes] = await Promise.all([
        analyticsApi.kpis(),
        applicationsApi.list({ limit: 8, sort_by: 'submitted_at', sort_dir: -1 }),
      ])
      setKpis(kpisRes.data)
      setRecentApps(appsRes.data.items || [])
    } catch {
      // silently fail — show empty state
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const needsAction = recentApps.filter(a =>
    ['submitted', 'legal_review', 'missing_documents', 'under_objection'].includes(a.status)
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, color: 'var(--color-navy-900)', marginBottom: 4 }}>
            Staff Console
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--color-navy-400)' }}>
            Review and manage all land registration applications
          </p>
        </div>
        <Button variant="secondary" size="sm" loading={refreshing} onClick={() => fetchData(true)}>
          <RefreshCw size={13} /> Refresh
        </Button>
      </div>

      {loading ? <PageLoader /> : (
        <>
          {/* KPI grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14 }}>
            <KpiCard label="Total Applications"  value={kpis?.total_applications}  icon={<FileText size={18} />}    color="var(--color-navy-600)" />
            <KpiCard label="Pending"             value={kpis?.pending_applications} icon={<Clock size={18} />}       color="var(--color-amber-500)" />
            <KpiCard label="Approved"            value={kpis?.approved_applications} icon={<CheckCircle size={18} />} color="var(--color-emerald-500)" />
            <KpiCard label="Rejected"            value={kpis?.rejected_applications} icon={<XCircle size={18} />}    color="var(--color-coral-500)" />
            <KpiCard label="Under Objection"     value={kpis?.under_objection}       icon={<AlertTriangle size={18} />} color="#9d174d" />
            <KpiCard label="Certs Issued"        value={kpis?.certificates_issued}   icon={<CheckCircle size={18} />} color="var(--color-emerald-600)" />
          </div>

          {/* Needs action */}
          {needsAction.length > 0 && (
            <div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-coral-400)', animation: 'pulse 1.5s infinite' }} />
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: 'var(--color-navy-800)' }}>
                  Needs Your Action ({needsAction.length})
                </h3>
                <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {needsAction.slice(0, 4).map(app => (
                  <Card key={app.id} hover onClick={() => navigate(`/staff/applications?id=${app.application_id}`)}
                    style={{ padding: '16px 20px', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <code style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-navy-600)' }}>{app.application_id}</code>
                      <StatusBadge status={app.status} />
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-navy-800)', marginBottom: 4 }}>
                      {APP_TYPE_LABELS[app.application_type]}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-navy-400)' }}>
                      Parcel {app.parcel_ref?.parcel_number} · Zone {app.parcel_ref?.zone_id}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                      <PriorityBadge priority={app.priority} />
                      <span style={{ fontSize: '11px', color: 'var(--color-navy-400)' }}>
                        {formatRelative(app.timestamps?.submitted_at)}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* All recent */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: 'var(--color-navy-800)' }}>
                Recent Applications
              </h3>
              <Button variant="ghost" size="sm" onClick={() => navigate('/staff/applications')}>
                All applications <ChevronRight size={14} />
              </Button>
            </div>

            {recentApps.length === 0 ? (
              <EmptyState icon="📋" title="No applications yet" description="Applications will appear here once submitted." />
            ) : (
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-navy-100)', background: 'var(--color-navy-50)' }}>
                      {['ID', 'Type', 'Applicant', 'Zone', 'Status', 'Priority', 'Submitted', ''].map(h => (
                        <th key={h} style={{
                          padding: '11px 16px', textAlign: 'left',
                          fontSize: '11px', fontWeight: 700,
                          color: 'var(--color-navy-500)', letterSpacing: '0.05em', textTransform: 'uppercase',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentApps.map((app, i) => (
                      <tr key={app.id}
                        style={{
                          borderBottom: i < recentApps.length - 1 ? '1px solid var(--color-navy-50)' : 'none',
                          cursor: 'pointer',
                        }}
                        onClick={() => navigate(`/staff/applications?id=${app.application_id}`)}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-navy-50)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: 'var(--color-navy-700)' }}>
                          {app.application_id}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--color-navy-600)' }}>
                          {APP_TYPE_LABELS[app.application_type]}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--color-navy-600)' }}>
                          {app.applicant_ref?.full_name || '—'}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--color-navy-500)' }}>
                          {app.parcel_ref?.zone_id || '—'}
                        </td>
                        <td style={{ padding: '12px 16px' }}><StatusBadge status={app.status} /></td>
                        <td style={{ padding: '12px 16px' }}><PriorityBadge priority={app.priority} /></td>
                        <td style={{ padding: '12px 16px', fontSize: '11px', color: 'var(--color-navy-400)' }}>
                          {formatRelative(app.timestamps?.submitted_at)}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <ChevronRight size={14} color="var(--color-navy-300)" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FilePlus, Search, Clock, CheckCircle, XCircle, AlertTriangle, FileText, ChevronRight } from 'lucide-react'
import { Card, KpiCard, StatusBadge, Button, PageLoader, EmptyState } from '../components/ui'
import { applicationsApi } from '../lib/api'
import { formatRelative, APP_TYPE_LABELS } from '../lib/utils'

// ── Hardcoded demo applicant ID — in a real app this comes from auth context
const DEMO_APPLICANT_ID = null

export default function ApplicantDashboard() {
  const navigate = useNavigate()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 })

  useEffect(() => {
    fetchApplications()
  }, [])

  async function fetchApplications() {
    try {
      setLoading(true)
      const params = DEMO_APPLICANT_ID ? { applicant_id: DEMO_APPLICANT_ID, limit: 10 } : { limit: 10 }
      const res = await applicationsApi.list(params)
      const items = res.data.items || []
      setApplications(items)
      setStats({
        total: res.data.total || 0,
        pending: items.filter(a => ['submitted', 'pre_checked', 'survey_required', 'surveyed', 'legal_review'].includes(a.status)).length,
        approved: items.filter(a => ['approved', 'certificate_issued', 'closed'].includes(a.status)).length,
        rejected: items.filter(a => a.status === 'rejected').length,
      })
    } catch {
      setApplications([])
    } finally {
      setLoading(false)
    }
  }

  const quickActions = [
    { icon: FilePlus, label: 'Submit New Application', desc: 'Start a land registration request', color: 'var(--color-emerald-500)', to: '/submit' },
    { icon: Search,   label: 'Track Application',       desc: 'Check your application status', color: 'var(--color-navy-600)',    to: '/track' },
    { icon: FileText, label: 'Upload Documents',         desc: 'Add required supporting files',  color: '#7c3aed',                  to: '/documents' },
    { icon: AlertTriangle, label: 'File Objection',    desc: 'Dispute a land application',    color: '#c2410c',                  to: '/objections' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Welcome banner */}
      <div style={{
        background: 'linear-gradient(135deg, var(--color-navy-800) 0%, var(--color-navy-950) 100%)',
        borderRadius: 'var(--radius-card)', padding: '28px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 20, overflow: 'hidden', position: 'relative',
      }}>
        <div style={{
          position: 'absolute', right: -60, top: -60, width: 220, height: 220,
          borderRadius: '50%', background: 'rgba(16,185,129,0.08)',
        }} />
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: 6 }}>
            Welcome to LRMIS
          </h2>
          <p style={{ color: 'var(--color-navy-300)', fontSize: '14px' }}>
            Manage your land registration applications and track their progress.
          </p>
        </div>
        <Button variant="primary" onClick={() => navigate('/submit')} style={{ flexShrink: 0 }}>
          <FilePlus size={15} /> New Application
        </Button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <KpiCard label="Total Applications"   value={stats.total}    icon={<FileText size={18} />}    color="var(--color-navy-600)" />
        <KpiCard label="In Progress"          value={stats.pending}  icon={<Clock size={18} />}       color="var(--color-amber-500)" />
        <KpiCard label="Approved"             value={stats.approved} icon={<CheckCircle size={18} />} color="var(--color-emerald-500)" />
        <KpiCard label="Rejected"             value={stats.rejected} icon={<XCircle size={18} />}     color="var(--color-coral-500)" />
      </div>

      {/* Quick actions */}
      <div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--color-navy-800)', marginBottom: 16 }}>
          Quick Actions
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          {quickActions.map(action => {
            const Icon = action.icon
            return (
              <Card key={action.to} hover onClick={() => navigate(action.to)} style={{ padding: '20px 22px' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 11,
                  background: `${action.color}14`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 14,
                }}>
                  <Icon size={18} color={action.color} />
                </div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-navy-800)', marginBottom: 4 }}>
                  {action.label}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-navy-400)' }}>{action.desc}</div>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Recent applications */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--color-navy-800)' }}>
            Recent Applications
          </h3>
          <Button variant="ghost" size="sm" onClick={() => navigate('/track')}>
            View all <ChevronRight size={14} />
          </Button>
        </div>

        {loading ? <PageLoader /> : applications.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No applications yet"
            description="Start by submitting your first land registration application."
            action={<Button variant="primary" onClick={() => navigate('/submit')}>Submit Application</Button>}
          />
        ) : (
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-navy-100)' }}>
                  {['Application ID', 'Type', 'Parcel', 'Status', 'Submitted', ''].map(h => (
                    <th key={h} style={{
                      padding: '14px 20px', textAlign: 'left',
                      fontSize: '12px', fontWeight: 700,
                      color: 'var(--color-navy-500)', letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {applications.map((app, i) => (
                  <tr key={app.id}
                    style={{
                      borderBottom: i < applications.length - 1 ? '1px solid var(--color-navy-50)' : 'none',
                      cursor: 'pointer', transition: 'background 0.12s',
                    }}
                    onClick={() => navigate(`/track?id=${app.application_id}`)}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-navy-50)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '14px 20px', fontWeight: 600, fontSize: '13px', color: 'var(--color-navy-700)', fontFamily: 'monospace' }}>
                      {app.application_id}
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: '13px', color: 'var(--color-navy-600)' }}>
                      {APP_TYPE_LABELS[app.application_type] || app.application_type}
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: '13px', color: 'var(--color-navy-500)' }}>
                      P{app.parcel_ref?.parcel_number} / B{app.parcel_ref?.block_number}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <StatusBadge status={app.status} />
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: '12px', color: 'var(--color-navy-400)' }}>
                      {formatRelative(app.timestamps?.submitted_at)}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <ChevronRight size={15} color="var(--color-navy-300)" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  )
}

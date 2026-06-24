import { useEffect, useState } from 'react'
import { RefreshCw, TrendingUp, BarChart3 } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { Card, KpiCard, Button, PageLoader } from '../components/ui'
import { analyticsApi } from '../lib/api'
import { STATUS_CONFIG } from '../lib/utils'

const COLORS = ['#10b981', '#486581', '#f59e0b', '#f43f5e', '#7c3aed', '#0284c7', '#ec4899', '#374151']

export default function AnalyticsPage() {
  const [kpis, setKpis] = useState(null)
  const [byStatus, setByStatus] = useState([])
  const [byZone, setByZone] = useState([])
  const [byType, setByType] = useState([])
  const [surveyors, setSurveyors] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const [kpisRes, statusRes, zoneRes, typeRes, survRes] = await Promise.all([
        analyticsApi.kpis(),
        analyticsApi.byStatus(),
        analyticsApi.byZone(),
        analyticsApi.byType(),
        analyticsApi.surveyors(),
      ])
      setKpis(kpisRes.data)
      setByStatus(statusRes.data.map(d => ({ name: STATUS_CONFIG[d.status]?.label || d.status, value: d.count })))
      setByZone(zoneRes.data.slice(0, 10).map(d => ({ name: d.zone_id || 'Unknown', value: d.count })))
      setByType(typeRes.data.map(d => ({ name: d.application_type?.replace(/_/g, ' ') || 'Unknown', value: d.count })))
      setSurveyors(survRes.data)
    } catch {
      setKpis({ total_applications: 0, pending_applications: 0, approved_applications: 0, rejected_applications: 0, certificates_issued: 0, under_objection: 0, total_applicants: 0, active_staff: 0 })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, color: 'var(--color-navy-900)', marginBottom: 4 }}>
            Analytics Dashboard
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--color-navy-400)' }}>System-wide KPIs and operational metrics</p>
        </div>
        <Button variant="secondary" size="sm" loading={refreshing} onClick={() => fetchAll(true)}>
          <RefreshCw size={13} /> Refresh
        </Button>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        <KpiCard label="Total Applications"   value={kpis?.total_applications}   color="var(--color-navy-600)" />
        <KpiCard label="Pending"              value={kpis?.pending_applications}  color="var(--color-amber-500)" />
        <KpiCard label="Approved"             value={kpis?.approved_applications} color="var(--color-emerald-500)" />
        <KpiCard label="Rejected"             value={kpis?.rejected_applications} color="var(--color-coral-500)" />
        <KpiCard label="Certs Issued"         value={kpis?.certificates_issued}   color="var(--color-emerald-600)" />
        <KpiCard label="Under Objection"      value={kpis?.under_objection}       color="#9d174d" />
        <KpiCard label="Total Applicants"     value={kpis?.total_applicants}      color="var(--color-navy-500)" />
        <KpiCard label="Active Staff"         value={kpis?.active_staff}          color="#7c3aed" />
      </div>

      {/* Charts row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
        {/* By status bar */}
        <Card>
          <ChartTitle>Applications by Status</ChartTitle>
          {byStatus.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={byStatus} margin={{ top: 5, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-navy-100)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-navy-400)' }} angle={-25} textAnchor="end" />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-navy-400)' }} />
                <Tooltip contentStyle={{ fontFamily: 'var(--font-body)', fontSize: 12, borderRadius: 10, border: '1px solid var(--color-navy-100)' }} />
                <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>
                  {byStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* By type pie */}
        <Card>
          <ChartTitle>Applications by Type</ChartTitle>
          {byType.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={byType} cx="50%" cy="45%" outerRadius={80} dataKey="value" nameKey="name">
                  {byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontFamily: 'var(--font-body)', fontSize: 12, borderRadius: 10, border: '1px solid var(--color-navy-100)' }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Charts row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* By zone */}
        <Card>
          <ChartTitle>Applications by Zone</ChartTitle>
          {byZone.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byZone} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-navy-100)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-navy-400)' }} />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11, fill: 'var(--color-navy-500)' }} />
                <Tooltip contentStyle={{ fontFamily: 'var(--font-body)', fontSize: 12, borderRadius: 10, border: '1px solid var(--color-navy-100)' }} />
                <Bar dataKey="value" name="Count" fill="var(--color-navy-600)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Surveyor workload */}
        <Card>
          <ChartTitle>Surveyor Workload</ChartTitle>
          {surveyors.length === 0 ? (
            <EmptyChart message="No surveyors registered yet" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>
              {surveyors.slice(0, 6).map((s, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-navy-700)' }}>{s.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--color-navy-400)' }}>
                      {s.active_tasks}/{s.max_tasks} tasks
                    </span>
                  </div>
                  <div style={{ height: 6, background: 'var(--color-navy-100)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 3,
                      width: `${Math.min(100, (s.utilization_pct || 0))}%`,
                      background: s.utilization_pct > 80 ? 'var(--color-coral-400)' : s.utilization_pct > 50 ? 'var(--color-amber-400)' : 'var(--color-emerald-500)',
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--color-navy-400)', marginTop: 2 }}>
                    {(s.utilization_pct || 0).toFixed(0)}% capacity · Zones: {(s.zone_ids || []).join(', ') || 'None'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Status summary table */}
      {byStatus.length > 0 && (
        <Card>
          <ChartTitle>Status Breakdown</ChartTitle>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 10 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-navy-100)' }}>
                {['Status', 'Count', 'Share'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--color-navy-500)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {byStatus.sort((a, b) => b.value - a.value).map((row, i) => {
                const total = byStatus.reduce((s, r) => s + r.value, 0)
                const pct = total > 0 ? ((row.value / total) * 100).toFixed(1) : 0
                return (
                  <tr key={i} style={{ borderBottom: '1px solid var(--color-navy-50)' }}>
                    <td style={{ padding: '10px 16px', fontSize: '13px', fontWeight: 600, color: 'var(--color-navy-700)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
                        {row.name}
                      </div>
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: '14px', fontWeight: 700, color: 'var(--color-navy-900)' }}>{row.value}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ flex: 1, height: 5, background: 'var(--color-navy-100)', borderRadius: 3, maxWidth: 120 }}>
                          <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--color-navy-500)', minWidth: 36 }}>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}

function ChartTitle({ children }) {
  return (
    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, color: 'var(--color-navy-800)', marginBottom: 4 }}>
      {children}
    </h3>
  )
}

function EmptyChart({ message = 'No data available yet' }) {
  return (
    <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-navy-300)', fontSize: '13px' }}>
      {message}
    </div>
  )
}

import { useState } from 'react'
import { AlertTriangle, CheckCircle, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import { Card, Button, Input, Textarea, Alert, PageLoader } from '../components/ui'
import { applicationsApi } from '../lib/api'
import { formatDateTime } from '../lib/utils'

export default function ObjectionsPage() {
  const [mode, setMode] = useState('submit') // 'submit' | 'view'
  const [form, setForm] = useState({
    application_id: '',
    applicant_id: '',
    objection_reason: '',
    supporting_evidence: '',
    contact_info: '',
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(null)
  const [errors, setErrors] = useState({})

  // View mode
  const [viewId, setViewId] = useState('')
  const [objections, setObjections] = useState(null)
  const [viewLoading, setViewLoading] = useState(false)

  function setF(k, v) {
    setForm(p => ({ ...p, [k]: v }))
    setErrors(p => ({ ...p, [k]: undefined }))
  }

  function validate() {
    const errs = {}
    if (!form.application_id.trim()) errs.application_id = 'Application ID is required'
    if (!form.applicant_id.trim()) errs.applicant_id = 'Your applicant ID is required'
    if (form.objection_reason.length < 20) errs.objection_reason = 'Objection reason must be at least 20 characters'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    setLoading(true)
    try {
      const res = await applicationsApi.submitObjection(form.application_id.trim(), {
        applicant_id: form.applicant_id.trim(),
        objection_reason: form.objection_reason,
        supporting_evidence: form.supporting_evidence || null,
        contact_info: form.contact_info || null,
      })
      setSubmitted(res.data)
      toast.success('Objection submitted. Application moved to under_objection.')
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to submit objection.')
    } finally {
      setLoading(false)
    }
  }

  async function handleView() {
    if (!viewId.trim()) return
    setViewLoading(true)
    try {
      const res = await applicationsApi.getObjections(viewId.trim())
      setObjections(res.data)
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Application not found.')
    } finally {
      setViewLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 0, background: 'var(--color-navy-100)', borderRadius: 12, padding: 4, width: 'fit-content' }}>
        {[{ id: 'submit', label: 'File Objection' }, { id: 'view', label: 'View Objections' }].map(m => (
          <button key={m.id} onClick={() => { setMode(m.id); setSubmitted(null); setObjections(null) }}
            style={{
              padding: '8px 20px', borderRadius: 9, border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600,
              background: mode === m.id ? 'var(--color-surface-raised)' : 'transparent',
              color: mode === m.id ? 'var(--color-navy-900)' : 'var(--color-navy-500)',
              boxShadow: mode === m.id ? 'var(--shadow-card)' : 'none',
              transition: 'all 0.15s',
            }}>
            {m.label}
          </button>
        ))}
      </div>

      {/* Submit mode */}
      {mode === 'submit' && !submitted && (
        <Card className="animate-fade-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 11,
              background: 'var(--color-coral-50)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AlertTriangle size={18} color="var(--color-coral-500)" />
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: 'var(--color-navy-800)' }}>
                File an Objection
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--color-navy-400)' }}>
                Object to a pending land registration application
              </p>
            </div>
          </div>

          <Alert type="warning" title="Important">
            Filing an objection will pause the application process and move it to review.
            Provide accurate and detailed information to support your case.
          </Alert>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 20 }}>
            <Input
              label="Application ID (being objected)"
              required
              placeholder="e.g. LRMIS-2026-0001"
              value={form.application_id}
              onChange={e => setF('application_id', e.target.value)}
              error={errors.application_id}
            />
            <Input
              label="Your Applicant ID (MongoDB ID)"
              required
              placeholder="Your applicant ObjectId from your profile"
              value={form.applicant_id}
              onChange={e => setF('applicant_id', e.target.value)}
              error={errors.applicant_id}
              hint="This was provided when you registered as an applicant"
            />
            <Textarea
              label="Objection Reason"
              required
              rows={5}
              placeholder="Provide a detailed explanation of your objection. Minimum 20 characters. Include dates, ownership claims, or boundary disputes..."
              value={form.objection_reason}
              onChange={e => setF('objection_reason', e.target.value)}
              error={errors.objection_reason}
            />
            <Input
              label="Supporting Evidence Reference (optional)"
              placeholder="e.g. Court case number, deed reference, survey report ID"
              value={form.supporting_evidence}
              onChange={e => setF('supporting_evidence', e.target.value)}
            />
            <Input
              label="Contact Information"
              placeholder="Phone or email for follow-up"
              value={form.contact_info}
              onChange={e => setF('contact_info', e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
            <Button variant="danger" loading={loading} onClick={handleSubmit}>
              <AlertTriangle size={14} /> Submit Objection
            </Button>
          </div>
        </Card>
      )}

      {/* Success state */}
      {mode === 'submit' && submitted && (
        <Card className="animate-fade-up" style={{ textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', background: 'var(--color-emerald-50)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
          }}>
            <CheckCircle size={30} color="var(--color-emerald-500)" />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, color: 'var(--color-navy-800)', marginBottom: 8 }}>
            Objection Filed Successfully
          </h2>
          <p style={{ color: 'var(--color-navy-500)', fontSize: '14px', marginBottom: 24 }}>
            The application has been moved to <strong>under_objection</strong> status.
            A registrar will review your objection and contact you.
          </p>

          <div style={{ display: 'inline-block', background: 'var(--color-navy-50)', borderRadius: 12, padding: '16px 24px', marginBottom: 24, textAlign: 'left' }}>
            <div style={{ fontSize: '12px', color: 'var(--color-navy-400)', marginBottom: 4 }}>Objection ID</div>
            <div style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-navy-800)', fontSize: '14px' }}>
              {submitted._id || submitted.id || 'Recorded'}
            </div>
          </div>

          <div>
            <Button variant="secondary" onClick={() => { setSubmitted(null); setForm({ application_id: '', applicant_id: '', objection_reason: '', supporting_evidence: '', contact_info: '' }) }}>
              File Another Objection
            </Button>
          </div>
        </Card>
      )}

      {/* View mode */}
      {mode === 'view' && (
        <Card className="animate-fade-in">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: 'var(--color-navy-800)', marginBottom: 20 }}>
            View Application Objections
          </h2>
          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            <Input
              placeholder="Application ID..."
              value={viewId}
              onChange={e => setViewId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleView()}
              style={{ flex: 1 }}
            />
            <Button variant="primary" onClick={handleView} loading={viewLoading}>
              <Eye size={14} /> View
            </Button>
          </div>

          {viewLoading && <PageLoader />}

          {objections && (
            <div>
              <div style={{ marginBottom: 16, fontSize: '13px', color: 'var(--color-navy-500)' }}>
                {objections.objections?.length || 0} objection(s) for {objections.application_id}
              </div>
              {objections.objections?.length === 0 ? (
                <Alert type="success">No objections have been filed for this application.</Alert>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {objections.objections.map((obj, i) => (
                    <div key={i} style={{
                      padding: '16px', borderRadius: 12,
                      border: '1.5px solid var(--color-coral-200)',
                      background: 'var(--color-coral-50)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-coral-500)', textTransform: 'uppercase' }}>
                          Objection #{i + 1}
                        </span>
                        <span style={{
                          fontSize: '11px', padding: '2px 9px', borderRadius: 6, fontWeight: 700,
                          background: obj.status === 'pending' ? 'var(--color-amber-50)' : 'var(--color-emerald-50)',
                          color: obj.status === 'pending' ? '#92400e' : 'var(--color-emerald-700)',
                          textTransform: 'uppercase',
                        }}>
                          {obj.status}
                        </span>
                      </div>
                      <p style={{ fontSize: '13.5px', color: 'var(--color-navy-700)', marginBottom: 8, lineHeight: 1.6 }}>
                        {obj.objection_reason}
                      </p>
                      {obj.supporting_evidence && (
                        <p style={{ fontSize: '12px', color: 'var(--color-navy-500)' }}>
                          Evidence: {obj.supporting_evidence}
                        </p>
                      )}
                      <p style={{ fontSize: '11px', color: 'var(--color-navy-400)', marginTop: 8 }}>
                        Filed {formatDateTime(obj.submitted_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

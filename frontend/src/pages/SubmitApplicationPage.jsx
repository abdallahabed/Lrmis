import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { CheckCircle, MapPin, FileText, User, ChevronRight, ChevronLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { Card, Button, Input, Select, Textarea, Alert } from '../components/ui'
import { applicantsApi, applicationsApi } from '../lib/api'
import { generateIdempotencyKey, APP_TYPE_LABELS } from '../lib/utils'

// Fix leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const STEPS = [
  { id: 1, label: 'Applicant Info',  icon: User },
  { id: 2, label: 'Parcel Details',  icon: MapPin },
  { id: 3, label: 'Application',     icon: FileText },
  { id: 4, label: 'Confirmation',    icon: CheckCircle },
]

const APP_TYPE_OPTIONS = [
  { value: '', label: 'Select application type...' },
  ...Object.entries(APP_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l })),
]

const APPLICANT_TYPE_OPTIONS = [
  { value: 'citizen', label: 'Citizen' },
  { value: 'lawyer', label: 'Lawyer' },
  { value: 'company', label: 'Company / Organization' },
  { value: 'authorized_representative', label: 'Authorized Representative' },
]

const PRIORITY_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'high',   label: 'High' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'low',    label: 'Low' },
]

function LocationPicker({ value, onChange }) {
  useMapEvents({
    click(e) {
      onChange([e.latlng.lng, e.latlng.lat])
    },
  })
  return value ? <Marker position={[value[1], value[0]]} /> : null
}

export default function SubmitApplicationPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [errors, setErrors] = useState({})

  const [applicantForm, setApplicantForm] = useState({
    full_name: '', national_id: '', email: '', phone: '',
    applicant_type: 'citizen', city: '', neighborhood: '', zone_id: '',
  })

  const [parcelForm, setParcelForm] = useState({
    parcel_number: '', block_number: '', basin_number: '', zone_id: '',
    location: null,
  })

  const [appForm, setAppForm] = useState({
    application_type: '', priority: 'normal', description: '',
  })

  // Field setters
  const setA = (k, v) => { setApplicantForm(p => ({ ...p, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })) }
  const setP = (k, v) => { setParcelForm(p => ({ ...p, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })) }
  const setApp = (k, v) => { setAppForm(p => ({ ...p, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })) }

  function validateStep(s) {
    const errs = {}
    if (s === 1) {
      if (!applicantForm.full_name.trim()) errs.full_name = 'Full name is required'
      if (!applicantForm.national_id.trim()) errs.national_id = 'National ID is required'
      if (!applicantForm.email.trim()) errs.email = 'Email is required'
      if (!applicantForm.phone.trim()) errs.phone = 'Phone is required'
      if (!applicantForm.city.trim()) errs.city = 'City is required'
    }
    if (s === 2) {
      if (!parcelForm.parcel_number.trim()) errs.parcel_number = 'Parcel number is required'
      if (!parcelForm.block_number.trim()) errs.block_number = 'Block number is required'
      if (!parcelForm.basin_number.trim()) errs.basin_number = 'Basin number is required'
      if (!parcelForm.zone_id.trim()) errs.zone_id = 'Zone ID is required'
    }
    if (s === 3) {
      if (!appForm.application_type) errs.application_type = 'Application type is required'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function next() {
    if (validateStep(step)) setStep(s => s + 1)
  }

  async function handleSubmit() {
    setLoading(true)
    try {
      // 1. Create or find applicant
      let applicantId
      try {
        const aRes = await applicantsApi.create({
          full_name: applicantForm.full_name,
          applicant_type: applicantForm.applicant_type,
          identity: { national_id: applicantForm.national_id },
          contacts: { email: applicantForm.email, phone: applicantForm.phone },
          address: { city: applicantForm.city, neighborhood: applicantForm.neighborhood, zone_id: parcelForm.zone_id },
        })
        applicantId = aRes.data.id
      } catch (e) {
        // If 409 conflict (already exists), try to search by national ID
        if (e.response?.status === 409) {
          // For demo: just use a dummy ID flow — in real app fetch by national_id
          toast.error('Applicant already exists. Please use Track Application to find your existing profile.')
          setLoading(false)
          return
        }
        throw e
      }

      // 2. Create application
      const idempKey = generateIdempotencyKey()
      const appRes = await applicationsApi.create({
        application_type: appForm.application_type,
        applicant_id: applicantId,
        parcel_ref: {
          parcel_number: parcelForm.parcel_number,
          block_number:  parcelForm.block_number,
          basin_number:  parcelForm.basin_number,
          zone_id:       parcelForm.zone_id,
          location: parcelForm.location ? { type: 'Point', coordinates: parcelForm.location } : null,
        },
        description: appForm.description || null,
        priority: appForm.priority,
      }, idempKey)

      setResult(appRes.data)
      setStep(4)
      toast.success('Application submitted successfully!')
    } catch (e) {
      const msg = e.response?.data?.detail || 'Submission failed. Please try again.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      {/* Stepper */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 36, gap: 0 }}>
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const done = step > s.id
          const active = step === s.id
          return (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : undefined }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: done ? 'var(--color-emerald-500)' : active ? 'var(--color-navy-800)' : 'var(--color-navy-100)',
                  border: active ? '2.5px solid var(--color-emerald-500)' : '2.5px solid transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                }}>
                  {done
                    ? <CheckCircle size={16} color="#fff" />
                    : <Icon size={16} color={active ? 'var(--color-emerald-400)' : 'var(--color-navy-400)'} />
                  }
                </div>
                <span style={{
                  fontSize: '11px', fontWeight: active ? 700 : 500,
                  color: active ? 'var(--color-navy-800)' : 'var(--color-navy-400)',
                  whiteSpace: 'nowrap',
                }}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{
                  flex: 1, height: 2, margin: '0 8px', marginBottom: 24,
                  background: step > s.id ? 'var(--color-emerald-400)' : 'var(--color-navy-100)',
                  transition: 'background 0.3s',
                }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Step 1: Applicant Info */}
      {step === 1 && (
        <Card className="animate-fade-up">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--color-navy-800)', marginBottom: 24 }}>
            Applicant Information
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <Input label="Full Name" required placeholder="e.g. Nour Ahmad"
                value={applicantForm.full_name} onChange={e => setA('full_name', e.target.value)} error={errors.full_name} />
            </div>
            <Select label="Applicant Type" required options={APPLICANT_TYPE_OPTIONS}
              value={applicantForm.applicant_type} onChange={e => setA('applicant_type', e.target.value)} />
            <Input label="National ID / Registration No." required placeholder="e.g. 400000001"
              value={applicantForm.national_id} onChange={e => setA('national_id', e.target.value)} error={errors.national_id} />
            <Input label="Email Address" required type="email" placeholder="you@example.com"
              value={applicantForm.email} onChange={e => setA('email', e.target.value)} error={errors.email} />
            <Input label="Phone Number" required placeholder="+970 59 000 0000"
              value={applicantForm.phone} onChange={e => setA('phone', e.target.value)} error={errors.phone} />
            <Input label="City" required placeholder="e.g. Ramallah"
              value={applicantForm.city} onChange={e => setA('city', e.target.value)} error={errors.city} />
            <Input label="Neighborhood / Street" placeholder="e.g. Al Tireh"
              value={applicantForm.neighborhood} onChange={e => setA('neighborhood', e.target.value)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 28 }}>
            <Button variant="primary" onClick={next}>Next Step <ChevronRight size={15} /></Button>
          </div>
        </Card>
      )}

      {/* Step 2: Parcel Details */}
      {step === 2 && (
        <Card className="animate-fade-up">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--color-navy-800)', marginBottom: 24 }}>
            Parcel Details
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 24 }}>
            <Input label="Parcel Number" required placeholder="e.g. 145"
              value={parcelForm.parcel_number} onChange={e => setP('parcel_number', e.target.value)} error={errors.parcel_number} />
            <Input label="Block Number" required placeholder="e.g. 12"
              value={parcelForm.block_number} onChange={e => setP('block_number', e.target.value)} error={errors.block_number} />
            <Input label="Basin Number" required placeholder="e.g. 3"
              value={parcelForm.basin_number} onChange={e => setP('basin_number', e.target.value)} error={errors.basin_number} />
            <Input label="Zone ID" required placeholder="e.g. ZONE-RM-01"
              value={parcelForm.zone_id} onChange={e => setP('zone_id', e.target.value)} error={errors.zone_id} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-navy-700)', marginBottom: 8 }}>
              Parcel Location <span style={{ color: 'var(--color-navy-400)', fontWeight: 400 }}>(click on map to place marker)</span>
            </label>
            <div style={{ borderRadius: 'var(--radius-card)', overflow: 'hidden', border: '1.5px solid var(--color-navy-200)', height: 320 }}>
              <MapContainer
                center={[31.9, 35.2]}
                zoom={12}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='© OpenStreetMap contributors'
                />
                <LocationPicker value={parcelForm.location} onChange={v => setP('location', v)} />
              </MapContainer>
            </div>
            {parcelForm.location && (
              <div style={{
                marginTop: 8, padding: '8px 12px', borderRadius: 8,
                background: 'var(--color-emerald-50)', color: 'var(--color-emerald-700)',
                fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <MapPin size={12} />
                Selected: {parcelForm.location[1].toFixed(5)}, {parcelForm.location[0].toFixed(5)}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
            <Button variant="secondary" onClick={() => setStep(1)}><ChevronLeft size={15} /> Back</Button>
            <Button variant="primary" onClick={next}>Next Step <ChevronRight size={15} /></Button>
          </div>
        </Card>
      )}

      {/* Step 3: Application Details */}
      {step === 3 && (
        <Card className="animate-fade-up">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--color-navy-800)', marginBottom: 24 }}>
            Application Details
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Select label="Application Type" required options={APP_TYPE_OPTIONS}
              value={appForm.application_type} onChange={e => setApp('application_type', e.target.value)} error={errors.application_type} />
            <Select label="Priority" options={PRIORITY_OPTIONS}
              value={appForm.priority} onChange={e => setApp('priority', e.target.value)} />
            <Textarea label="Description" rows={4}
              placeholder="Briefly describe the purpose and context of this application..."
              value={appForm.description} onChange={e => setApp('description', e.target.value)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
            <Button variant="secondary" onClick={() => setStep(2)}><ChevronLeft size={15} /> Back</Button>
            <Button variant="primary" onClick={next}>Review <ChevronRight size={15} /></Button>
          </div>
        </Card>
      )}

      {/* Step 3.5: Review before submit */}
      {step === 3.5 && null}

      {/* Step 4: Confirmation or Review */}
      {step === 4 && !result && (
        <Card className="animate-fade-up">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--color-navy-800)', marginBottom: 8 }}>
            Review & Submit
          </h2>
          <p style={{ color: 'var(--color-navy-500)', fontSize: '14px', marginBottom: 24 }}>Please verify your information before submitting.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <ReviewSection title="Applicant">
              <ReviewRow label="Full Name" value={applicantForm.full_name} />
              <ReviewRow label="National ID" value={applicantForm.national_id} />
              <ReviewRow label="Email" value={applicantForm.email} />
              <ReviewRow label="Phone" value={applicantForm.phone} />
              <ReviewRow label="City" value={applicantForm.city} />
            </ReviewSection>
            <ReviewSection title="Parcel">
              <ReviewRow label="Parcel No." value={parcelForm.parcel_number} />
              <ReviewRow label="Block No." value={parcelForm.block_number} />
              <ReviewRow label="Basin No." value={parcelForm.basin_number} />
              <ReviewRow label="Zone" value={parcelForm.zone_id} />
              <ReviewRow label="Location" value={parcelForm.location ? `${parcelForm.location[1].toFixed(5)}, ${parcelForm.location[0].toFixed(5)}` : 'Not selected'} />
            </ReviewSection>
            <ReviewSection title="Application">
              <ReviewRow label="Type" value={APP_TYPE_LABELS[appForm.application_type] || '—'} />
              <ReviewRow label="Priority" value={appForm.priority} />
              {appForm.description && <ReviewRow label="Description" value={appForm.description} />}
            </ReviewSection>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
            <Button variant="secondary" onClick={() => setStep(3)}><ChevronLeft size={15} /> Back</Button>
            <Button variant="primary" loading={loading} onClick={handleSubmit}>
              Submit Application
            </Button>
          </div>
        </Card>
      )}

      {/* Step 4: Success */}
      {step === 4 && result && (
        <Card className="animate-fade-up" style={{ textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'var(--color-emerald-50)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <CheckCircle size={34} color="var(--color-emerald-500)" />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 800, color: 'var(--color-navy-800)', marginBottom: 8 }}>
            Application Submitted!
          </h2>
          <p style={{ color: 'var(--color-navy-500)', fontSize: '14px', marginBottom: 28 }}>
            Your application has been received and is now under review.
          </p>

          <div style={{
            background: 'var(--color-navy-50)', borderRadius: 12, padding: '20px 28px',
            display: 'inline-block', marginBottom: 28, textAlign: 'left', minWidth: 280,
          }}>
            <div style={{ fontSize: '12px', color: 'var(--color-navy-500)', marginBottom: 6 }}>Application ID</div>
            <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '18px', color: 'var(--color-navy-800)', marginBottom: 14 }}>
              {result.application_id}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-navy-500)', marginBottom: 4 }}>Status</div>
            <div style={{ fontWeight: 600, color: 'var(--color-emerald-600)', fontSize: '14px' }}>Submitted — Awaiting pre-check</div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button variant="primary" onClick={() => navigate(`/track?id=${result.application_id}`)}>
              Track Application
            </Button>
            <Button variant="secondary" onClick={() => navigate('/documents')}>
              Upload Documents
            </Button>
            <Button variant="ghost" onClick={() => { setStep(1); setResult(null) }}>
              Submit Another
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}

function ReviewSection({ title, children }) {
  return (
    <div style={{ border: '1px solid var(--color-navy-100)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{
        padding: '10px 16px', background: 'var(--color-navy-50)',
        fontSize: '12px', fontWeight: 700, color: 'var(--color-navy-600)',
        letterSpacing: '0.05em', textTransform: 'uppercase',
      }}>
        {title}
      </div>
      <div style={{ padding: '4px 0' }}>{children}</div>
    </div>
  )
}

function ReviewRow({ label, value }) {
  return (
    <div style={{
      display: 'flex', padding: '10px 16px',
      borderBottom: '1px solid var(--color-navy-50)',
    }}>
      <div style={{ width: 140, fontSize: '13px', color: 'var(--color-navy-400)', fontWeight: 500 }}>{label}</div>
      <div style={{ flex: 1, fontSize: '13px', color: 'var(--color-navy-800)', fontWeight: 500 }}>{value || '—'}</div>
    </div>
  )
}

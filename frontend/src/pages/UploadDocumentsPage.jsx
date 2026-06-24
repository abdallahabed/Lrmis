import { useState } from 'react'
import { Upload, FileText, CheckCircle, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { Card, Button, Input, Select, Alert } from '../components/ui'
import { applicationsApi } from '../lib/api'

const DOC_TYPE_OPTIONS = [
  { value: '',                   label: 'Select document type...' },
  { value: 'ownership_deed',     label: 'Ownership Deed' },
  { value: 'id_copy',            label: 'National ID Copy' },
  { value: 'sale_contract',      label: 'Sale Contract' },
  { value: 'survey_plan',        label: 'Survey Plan' },
  { value: 'subdivision_plan',   label: 'Subdivision Plan' },
  { value: 'merge_plan',         label: 'Merge Plan' },
  { value: 'boundary_survey',    label: 'Boundary Survey' },
  { value: 'previous_certificate', label: 'Previous Certificate' },
  { value: 'power_of_attorney',  label: 'Power of Attorney' },
  { value: 'other',              label: 'Other Document' },
]

export default function UploadDocumentsPage() {
  const [applicationId, setApplicationId] = useState('')
  const [uploaderName, setUploaderName] = useState('')
  const [docType, setDocType] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [uploaded, setUploaded] = useState([])
  const [errors, setErrors] = useState({})

  function handleFileDrop(e) {
    e.preventDefault()
    const f = e.dataTransfer?.files[0] || e.target.files[0]
    if (f) setFile(f)
  }

  function validate() {
    const errs = {}
    if (!applicationId.trim()) errs.applicationId = 'Application ID is required'
    if (!uploaderName.trim()) errs.uploaderName = 'Your name is required'
    if (!docType) errs.docType = 'Document type is required'
    if (!file) errs.file = 'Please select a file'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleUpload() {
    if (!validate()) return
    setLoading(true)
    try {
      await applicationsApi.addDocument(applicationId.trim(), {
        document_type: docType,
        file_name: file.name,
        file_size_kb: parseFloat((file.size / 1024).toFixed(1)),
        mime_type: file.type,
        description: description || null,
        uploaded_by: uploaderName,
      })

      setUploaded(prev => [...prev, { name: file.name, type: docType, size: `${(file.size / 1024).toFixed(1)} KB` }])
      toast.success('Document registered successfully!')
      setFile(null)
      setDocType('')
      setDescription('')
      setErrors({})
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Upload failed. Check the application ID.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Info alert */}
      <Alert type="info" title="Document Upload">
        Files are registered as metadata. In production, attach actual file storage (S3, MinIO, etc.).
        For this system, provide the file name and type — this is sufficient for workflow validation.
      </Alert>

      <Card>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--color-navy-800)', marginBottom: 24 }}>
          Register Supporting Document
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Input
            label="Application ID"
            required
            placeholder="e.g. LRMIS-2026-0001"
            value={applicationId}
            onChange={e => { setApplicationId(e.target.value); setErrors(p => ({ ...p, applicationId: undefined })) }}
            error={errors.applicationId}
          />
          <Input
            label="Your Full Name"
            required
            placeholder="Name of person uploading"
            value={uploaderName}
            onChange={e => { setUploaderName(e.target.value); setErrors(p => ({ ...p, uploaderName: undefined })) }}
            error={errors.uploaderName}
          />
          <Select
            label="Document Type"
            required
            options={DOC_TYPE_OPTIONS}
            value={docType}
            onChange={e => { setDocType(e.target.value); setErrors(p => ({ ...p, docType: undefined })) }}
            error={errors.docType}
          />

          {/* File drop zone */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-navy-700)', display: 'block', marginBottom: 8 }}>
              File <span style={{ color: 'var(--color-coral-500)' }}>*</span>
            </label>
            <label
              onDragOver={e => e.preventDefault()}
              onDrop={handleFileDrop}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 12, padding: '32px',
                border: `2px dashed ${errors.file ? 'var(--color-coral-400)' : file ? 'var(--color-emerald-400)' : 'var(--color-navy-200)'}`,
                borderRadius: 'var(--radius-card)',
                background: file ? 'var(--color-emerald-50)' : 'var(--color-surface)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <input type="file" onChange={handleFileDrop} style={{ display: 'none' }}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
              {file ? (
                <>
                  <CheckCircle size={28} color="var(--color-emerald-500)" />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, color: 'var(--color-emerald-700)', fontSize: '14px' }}>{file.name}</div>
                    <div style={{ color: 'var(--color-navy-400)', fontSize: '12px', marginTop: 2 }}>
                      {(file.size / 1024).toFixed(1)} KB · {file.type || 'unknown type'}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={e => { e.preventDefault(); setFile(null) }}>
                    <X size={13} /> Remove
                  </Button>
                </>
              ) : (
                <>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12, background: 'var(--color-navy-100)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Upload size={20} color="var(--color-navy-400)" />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-navy-600)', fontSize: '14px' }}>
                      Drag & drop or click to select
                    </div>
                    <div style={{ color: 'var(--color-navy-400)', fontSize: '12px', marginTop: 2 }}>
                      PDF, DOC, DOCX, JPG, PNG · Max 10 MB
                    </div>
                  </div>
                </>
              )}
            </label>
            {errors.file && <span style={{ fontSize: '12px', color: 'var(--color-coral-500)', marginTop: 4, display: 'block' }}>{errors.file}</span>}
          </div>

          <Input
            label="Description (optional)"
            placeholder="Brief note about this document..."
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
          <Button variant="primary" loading={loading} onClick={handleUpload}>
            <Upload size={14} /> Register Document
          </Button>
        </div>
      </Card>

      {/* Uploaded this session */}
      {uploaded.length > 0 && (
        <Card>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: 'var(--color-navy-800)', marginBottom: 16 }}>
            Registered This Session
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {uploaded.map((d, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                border: '1px solid var(--color-emerald-200)', borderRadius: 10,
                background: 'var(--color-emerald-50)',
              }}>
                <FileText size={16} color="var(--color-emerald-500)" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-navy-700)' }}>{d.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-navy-400)' }}>
                    {d.type.replace(/_/g, ' ')} · {d.size}
                  </div>
                </div>
                <CheckCircle size={16} color="var(--color-emerald-500)" />
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

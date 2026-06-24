import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Applicants ──────────────────────────────────────────────────────
export const applicantsApi = {
  create: (data) => api.post('/applicants/', data),
  get: (id) => api.get(`/applicants/${id}`),
  update: (id, data) => api.patch(`/applicants/${id}`, data),
  list: (params) => api.get('/applicants/', { params }),
  getApplications: (id, params) => api.get(`/applicants/${id}/applications`, { params }),
}

// ── Applications ─────────────────────────────────────────────────────
export const applicationsApi = {
  create: (data, idempotencyKey) =>
    api.post('/applications/', data, {
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    }),
  get: (id) => api.get(`/applications/${id}`),
  list: (params) => api.get('/applications/', { params }),
  transition: (id, data) => api.patch(`/applications/${id}/transition`, data),
  hold: (id, data) => api.post(`/applications/${id}/hold`, data),
  reject: (id, data) => api.post(`/applications/${id}/reject`, data),
  addDocument: (id, data) => api.post(`/applications/${id}/documents`, data),
  getDocuments: (id) => api.get(`/applications/${id}/documents`),
  addComment: (id, data) => api.post(`/applications/${id}/comments`, data),
  submitObjection: (id, data) => api.post(`/applications/${id}/objections`, data),
  getObjections: (id) => api.get(`/applications/${id}/objections`),
  getTimeline: (id) => api.get(`/applications/${id}/timeline`),
  generateCertificate: (id) => api.post(`/applications/${id}/certificate`),
}

// ── Staff ─────────────────────────────────────────────────────────────
export const staffApi = {
  create: (data) => api.post('/staff/', data),
  get: (id) => api.get(`/staff/${id}`),
  list: (params) => api.get('/staff/', { params }),
  autoAssign: (appId) => api.post(`/applications/${appId}/auto-assign-surveyor`),
  addMilestone: (appId, data) => api.patch(`/applications/${appId}/survey-milestone`, data),
  uploadReport: (appId, data) => api.post(`/applications/${appId}/survey-report`, data),
  registrarReview: (appId, data) => api.patch(`/applications/${appId}/registrar-review`, data),
}

// ── Analytics ─────────────────────────────────────────────────────────
export const analyticsApi = {
  kpis: () => api.get('/analytics/kpis'),
  byStatus: () => api.get('/analytics/applications-by-status'),
  byZone: () => api.get('/analytics/applications-by-zone'),
  byType: () => api.get('/analytics/applications-by-type'),
  processingTime: () => api.get('/analytics/processing-time'),
  surveyors: () => api.get('/analytics/surveyors'),
  parcelGeofeed: () => api.get('/analytics/geofeeds/parcels'),
  pendingHeatmap: () => api.get('/analytics/geofeeds/pending-heatmap'),
}

export default api

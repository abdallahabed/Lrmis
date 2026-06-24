import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import AppLayout from './components/layout/AppLayout'
import LoginPage from './pages/LoginPage'
import ApplicantDashboard from './pages/ApplicantDashboard'
import SubmitApplicationPage from './pages/SubmitApplicationPage'
import TrackApplicationPage from './pages/TrackApplicationPage'
import UploadDocumentsPage from './pages/UploadDocumentsPage'
import ObjectionsPage from './pages/ObjectionsPage'
import StaffDashboard from './pages/StaffDashboard'
import StaffApplicationsPage from './pages/StaffApplicationsPage'
import MapPage from './pages/MapPage'
import AnalyticsPage from './pages/AnalyticsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            fontFamily: 'var(--font-body)',
            fontSize: '13px',
            borderRadius: '12px',
            boxShadow: 'var(--shadow-float)',
          },
          success: { iconTheme: { primary: 'var(--color-emerald-500)', secondary: '#fff' } },
          error: { iconTheme: { primary: 'var(--color-coral-500)', secondary: '#fff' } },
        }}
      />
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route element={<AppLayout />}>
          {/* Applicant Portal */}
          <Route path="/dashboard"  element={<ApplicantDashboard />} />
          <Route path="/submit"     element={<SubmitApplicationPage />} />
          <Route path="/track"      element={<TrackApplicationPage />} />
          <Route path="/documents"  element={<UploadDocumentsPage />} />
          <Route path="/objections" element={<ObjectionsPage />} />
          {/* Staff Console */}
          <Route path="/staff/dashboard"    element={<StaffDashboard />} />
          <Route path="/staff/applications" element={<StaffApplicationsPage />} />
          {/* Insights */}
          <Route path="/map"       element={<MapPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

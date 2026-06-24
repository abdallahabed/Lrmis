import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import { Layers, Filter, RefreshCw } from 'lucide-react'
import { Card, Button, Select, StatusBadge } from '../components/ui'
import { analyticsApi, applicationsApi } from '../lib/api'
import { STATUS_CONFIG } from '../lib/utils'
import L from 'leaflet'

const STATUS_FILTER_OPTS = [
  { value: '', label: 'All Applications' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'survey_required', label: 'Survey Required' },
  { value: 'under_objection', label: 'Under Objection' },
  { value: 'approved', label: 'Approved' },
]

export default function MapPage() {
  const [parcels, setParcels] = useState(null)
  const [heatmap, setHeatmap] = useState(null)
  const [applications, setApplications] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [showParcels, setShowParcels] = useState(true)
  const [showApps, setShowApps] = useState(true)
  const [loading, setLoading] = useState(true)
  const [selectedFeature, setSelectedFeature] = useState(null)

  useEffect(() => { fetchData() }, [statusFilter])

  async function fetchData() {
    setLoading(true)
    try {
      const [parcelRes, heatRes, appsRes] = await Promise.all([
        analyticsApi.parcelGeofeed(),
        analyticsApi.pendingHeatmap(),
        applicationsApi.list({
          limit: 200,
          status: statusFilter || undefined,
        }),
      ])
      setParcels(parcelRes.data)
      setHeatmap(heatRes.data)
      setApplications(appsRes.data.items || [])
    } catch {
      setParcels({ type: 'FeatureCollection', features: [] })
      setHeatmap({ type: 'FeatureCollection', features: [] })
    } finally {
      setLoading(false)
    }
  }

  function parcelStyle(feature) {
    const status = feature.properties?.registration_status
    const dispute = feature.properties?.dispute_state
    return {
      fillColor: dispute !== 'none' ? '#f43f5e' : status === 'registered' ? '#10b981' : '#627d98',
      fillOpacity: 0.2,
      color: dispute !== 'none' ? '#f43f5e' : '#334e68',
      weight: 2,
    }
  }

  function onEachParcel(feature, layer) {
    layer.on('click', () => {
      setSelectedFeature({
        type: 'parcel',
        data: feature.properties,
      })
    })
    layer.bindTooltip(`Parcel ${feature.properties?.parcel_code || ''}`, { sticky: true })
  }

  // Get apps with location
  const appsWithLocation = applications.filter(a => a.parcel_ref?.location?.coordinates)

  const statusCounts = applications.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1
    return acc
  }, {})

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: 'calc(100vh - 120px)' }}>
      {/* Controls bar */}
      <Card style={{ padding: '12px 18px' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={15} color="var(--color-navy-500)" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-navy-700)' }}>Layers:</span>
          </div>
          <LayerToggle active={showParcels} onClick={() => setShowParcels(p => !p)} color="var(--color-emerald-500)">
            Parcel Boundaries
          </LayerToggle>
          <LayerToggle active={showApps} onClick={() => setShowApps(p => !p)} color="var(--color-coral-400)">
            Applications
          </LayerToggle>

          <div style={{ height: 20, width: 1, background: 'var(--color-navy-200)' }} />

          <Select
            options={STATUS_FILTER_OPTS}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          />

          <Button variant="secondary" size="sm" loading={loading} onClick={fetchData}>
            <RefreshCw size={12} /> Refresh
          </Button>

          <div style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--color-navy-400)' }}>
            {applications.length} app{applications.length !== 1 ? 's' : ''} · {appsWithLocation.length} mapped
          </div>
        </div>
      </Card>

      <div style={{ flex: 1, display: 'flex', gap: 14, minHeight: 0 }}>
        {/* Map */}
        <div style={{ flex: 1, borderRadius: 'var(--radius-card)', overflow: 'hidden', border: '1px solid var(--color-navy-100)' }}>
          <MapContainer
            center={[31.9, 35.2]}
            zoom={11}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='© OpenStreetMap contributors'
            />

            {/* Parcel boundaries */}
            {showParcels && parcels && parcels.features?.length > 0 && (
              <GeoJSON
                key={JSON.stringify(parcels)}
                data={parcels}
                style={parcelStyle}
                onEachFeature={onEachParcel}
              />
            )}

            {/* Application markers */}
            {showApps && appsWithLocation.map((app, i) => {
              const [lng, lat] = app.parcel_ref.location.coordinates
              const cfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.submitted
              return (
                <CircleMarker
                  key={app.id || i}
                  center={[lat, lng]}
                  radius={8}
                  pathOptions={{
                    fillColor: cfg.dot,
                    fillOpacity: 0.85,
                    color: '#fff',
                    weight: 2,
                  }}
                  eventHandlers={{
                    click: () => setSelectedFeature({ type: 'application', data: app }),
                  }}
                >
                  <Tooltip>{app.application_id} · {cfg.label}</Tooltip>
                </CircleMarker>
              )
            })}
          </MapContainer>
        </div>

        {/* Right sidebar */}
        <div style={{ width: 260, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
          {/* Legend */}
          <Card style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-navy-500)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
              Legend
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <LegendItem color="var(--color-emerald-500)" label="Registered Parcel" />
              <LegendItem color="var(--color-coral-500)" label="Disputed Parcel" />
              <LegendItem color="var(--color-navy-500)" label="Unregistered Parcel" />
            </div>
            <div style={{ height: 1, background: 'var(--color-navy-100)', margin: '12px 0' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {Object.entries(statusCounts).map(([status, count]) => {
                const cfg = STATUS_CONFIG[status]
                if (!cfg) return null
                return (
                  <div key={status} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.dot }} />
                      <span style={{ fontSize: '12px', color: 'var(--color-navy-600)' }}>{cfg.label}</span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-navy-700)' }}>{count}</span>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Selected feature info */}
          {selectedFeature && (
            <Card style={{ padding: '14px 16px' }} className="animate-fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-navy-500)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {selectedFeature.type === 'parcel' ? 'Parcel Info' : 'Application'}
                </div>
                <button onClick={() => setSelectedFeature(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-navy-400)', fontSize: 16 }}>×</button>
              </div>

              {selectedFeature.type === 'parcel' && (
                <>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-navy-800)', marginBottom: 8 }}>
                    {selectedFeature.data.parcel_code}
                  </div>
                  <InfoRow label="Zone" value={selectedFeature.data.zone_id} />
                  <InfoRow label="Status" value={selectedFeature.data.registration_status} />
                  <InfoRow label="Dispute" value={selectedFeature.data.dispute_state} />
                </>
              )}

              {selectedFeature.type === 'application' && (
                <>
                  <code style={{ fontSize: '12px', color: 'var(--color-navy-600)', display: 'block', marginBottom: 6 }}>
                    {selectedFeature.data.application_id}
                  </code>
                  <StatusBadge status={selectedFeature.data.status} />
                  <div style={{ marginTop: 8 }}>
                    <InfoRow label="Type" value={selectedFeature.data.application_type?.replace(/_/g, ' ')} />
                    <InfoRow label="Parcel" value={`P${selectedFeature.data.parcel_ref?.parcel_number}`} />
                    <InfoRow label="Zone" value={selectedFeature.data.parcel_ref?.zone_id} />
                    <InfoRow label="Priority" value={selectedFeature.data.priority} />
                  </div>
                </>
              )}
            </Card>
          )}

          {/* Summary counts */}
          <Card style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-navy-500)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
              Map Summary
            </div>
            <InfoRow label="Total Parcels" value={parcels?.features?.length || 0} />
            <InfoRow label="Apps Mapped" value={appsWithLocation.length} />
            <InfoRow label="Total Apps" value={applications.length} />
          </Card>
        </div>
      </div>
    </div>
  )
}

function LayerToggle({ children, active, onClick, color }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
      borderRadius: 8, border: `1.5px solid ${active ? color : 'var(--color-navy-200)'}`,
      background: active ? `${color}12` : 'transparent',
      cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '12px',
      fontWeight: 600, color: active ? color : 'var(--color-navy-400)',
      transition: 'all 0.15s',
    }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: active ? color : 'var(--color-navy-300)' }} />
      {children}
    </button>
  )
}

function LegendItem({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 14, height: 14, borderRadius: 3, background: color, opacity: 0.75, flexShrink: 0 }} />
      <span style={{ fontSize: '12px', color: 'var(--color-navy-600)' }}>{label}</span>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-navy-50)' }}>
      <span style={{ fontSize: '11px', color: 'var(--color-navy-400)' }}>{label}</span>
      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-navy-700)' }}>{value ?? '—'}</span>
    </div>
  )
}

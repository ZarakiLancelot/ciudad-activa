import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../lib/supabase'
import type { Report, ReportCategory } from '../types'

const SAN_JOSE_PINULA = { lat: 14.5386, lng: -90.4125 }

const CATEGORY_COLORS: Record<ReportCategory, string> = {
  pothole: '#f97316',
  accident: '#ef4444',
  lighting: '#eab308',
  water: '#3b82f6',
  trash: '#22c55e',
  other: '#8b5cf6',
}

const CATEGORY_LABELS: Record<ReportCategory, string> = {
  pothole: 'Bache',
  accident: 'Accidente',
  lighting: 'Alumbrado',
  water: 'Agua',
  trash: 'Basura',
  other: 'Otro',
}

function MapPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchReports() {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) setReports(data)
      setLoading(false)
    }

    fetchReports()
  }, [])

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      {/* Header */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'white',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#16a34a' }}>
            CiudadActiva
          </h1>
          <p style={{ fontSize: '12px', color: '#6b7280' }}>San José Pinula</p>
        </div>
        <span style={{ fontSize: '13px', color: '#6b7280' }}>
          {loading ? 'Cargando...' : `${reports.length} reporte${reports.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Map */}
      <MapContainer
        center={[SAN_JOSE_PINULA.lat, SAN_JOSE_PINULA.lng]}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {reports.map((report) => (
          <CircleMarker
            key={report.id}
            center={[report.lat, report.lng]}
            radius={10}
            pathOptions={{
              color: CATEGORY_COLORS[report.category],
              fillColor: CATEGORY_COLORS[report.category],
              fillOpacity: 0.8,
            }}
          >
            <Popup>
              <div style={{ minWidth: '160px' }}>
                <span style={{
                  display: 'inline-block',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'white',
                  background: CATEGORY_COLORS[report.category],
                  borderRadius: '4px',
                  padding: '2px 6px',
                  marginBottom: '6px',
                }}>
                  {CATEGORY_LABELS[report.category]}
                </span>
                <p style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
                  {report.title}
                </p>
                {report.address && (
                  <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                    {report.address}
                  </p>
                )}
                <button
                  onClick={() => navigate(`/report/${report.id}`)}
                  style={{
                    width: '100%',
                    padding: '6px',
                    background: '#16a34a',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Ver detalle
                </button>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* FAB - Nuevo reporte */}
      <button
        onClick={() => navigate('/new')}
        style={{
          position: 'absolute',
          bottom: '24px',
          right: '24px',
          zIndex: 1000,
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: '#16a34a',
          color: 'white',
          border: 'none',
          fontSize: '28px',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title="Nuevo reporte"
      >
        +
      </button>
    </div>
  )
}

export default MapPage

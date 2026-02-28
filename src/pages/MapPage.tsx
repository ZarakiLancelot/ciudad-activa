import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../lib/supabase'
import type { Report, ReportCategory } from '../types'
import type { User } from '@supabase/supabase-js'
import sjpLogo from '../assets/sjp.webp'
import mixcoLogo from '../assets/mixco.png'
import guatemalaLogo from '../assets/guatemala.png'

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

const MUNICIPALITY_CONFIG = [
  { slug: 'san-jose-pinula', name: 'San José Pinula', lat: 14.5386, lng: -90.4125, logo: sjpLogo },
  { slug: 'mixco',           name: 'Mixco',           lat: 14.6335, lng: -90.6064, logo: mixcoLogo },
  { slug: 'guatemala',       name: 'Guatemala',       lat: 14.6349, lng: -90.5069, logo: guatemalaLogo },
]

function MapController({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, map.getZoom())
  }, [center, map])
  return null
}

function MapPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [switching, setSwitching] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedSlug, setSelectedSlug] = useState(
    () => localStorage.getItem('selectedMunicipality') ?? 'san-jose-pinula'
  )
  const [municipalityIds, setMunicipalityIds] = useState<Record<string, string>>({})
  const navigate = useNavigate()

  const selectedConfig = MUNICIPALITY_CONFIG.find((m) => m.slug === selectedSlug) ?? MUNICIPALITY_CONFIG[0]

  useEffect(() => {
    async function fetchMunicipalities() {
      const { data } = await supabase.from('municipalities').select('id, slug')
      if (data) {
        const map: Record<string, string> = {}
        data.forEach((m) => { map[m.slug] = m.id })
        setMunicipalityIds(map)
      }
    }

    async function fetchReports() {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) setReports(data)
      setLoading(false)
    }

    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single()
        setIsAdmin(profile?.is_admin ?? false)
      }
    }

    fetchMunicipalities()
    fetchReports()
    fetchUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  function handleMunicipalityChange(slug: string) {
    setSwitching(true)
    setSelectedSlug(slug)
    localStorage.setItem('selectedMunicipality', slug)
    setTimeout(() => setSwitching(false), 900)
  }

  const selectedMunicipalityId = municipalityIds[selectedSlug]
  const filteredReports = selectedMunicipalityId
    ? reports.filter((r) => r.municipality_id === selectedMunicipalityId)
    : reports

  return (
    <div className="map-page">
      {/* Loading overlay */}
      {(loading || switching) && (
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 2000,
          background: 'white',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
        }}>
          <img
            src={selectedConfig.logo}
            alt={selectedConfig.name}
            className="logo-pulse"
            style={{ width: '120px', height: '120px', objectFit: 'contain' }}
          />
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '18px', fontWeight: 700, color: '#16a34a' }}>CiudadActiva</p>
            <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '4px' }}>Cargando reportes...</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'white',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}>
        {/* Spacer izquierdo */}
        <div style={{ flex: 1 }} />

        {/* Título + selector centrado */}
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#16a34a', lineHeight: 1.2 }}>
            CiudadActiva
          </h1>
          <select
            value={selectedSlug}
            onChange={(e) => handleMunicipalityChange(e.target.value)}
            style={{
              marginTop: '4px',
              fontSize: '12px',
              color: '#374151',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              padding: '2px 6px',
              background: 'white',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {MUNICIPALITY_CONFIG.map((m) => (
              <option key={m.slug} value={m.slug}>{m.name}</option>
            ))}
          </select>
        </div>

        {/* Acciones derecha */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
          {user && !user.is_anonymous ? (
            <>
              {isAdmin && (
                <button
                  onClick={() => navigate('/admin')}
                  style={{
                    padding: '6px 12px',
                    background: '#1e40af',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'white',
                    cursor: 'pointer',
                  }}
                >
                  Panel
                </button>
              )}
              <button
                onClick={async () => { await supabase.auth.signOut(); navigate('/auth') }}
                style={{
                  padding: '6px 12px',
                  background: 'none',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#6b7280',
                  cursor: 'pointer',
                }}
              >
                Salir
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate('/auth')}
              style={{
                padding: '6px 12px',
                background: '#16a34a',
                border: 'none',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                color: 'white',
                cursor: 'pointer',
              }}
            >
              Ingresar
            </button>
          )}
        </div>
      </div>

      {/* Map */}
      <MapContainer
        center={[selectedConfig.lat, selectedConfig.lng]}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController center={[selectedConfig.lat, selectedConfig.lng]} />
        {filteredReports.map((report) => (
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

      {/* FAB - Nuevo reporte estilo Waze */}
      <div style={{ position: 'absolute', bottom: '40px', right: '40px', zIndex: 1000, width: '56px', height: '56px' }}>
        <div className="fab-ping" />
        <button
          onClick={() => navigate('/new', { state: { lat: selectedConfig.lat, lng: selectedConfig.lng, municipalitySlug: selectedSlug } })}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: '#111827',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Nuevo reporte"
        >
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <polygon points="16,2 31,29 1,29" fill="#F59E0B" />
            <line x1="16" y1="12" x2="16" y2="24" stroke="#111827" strokeWidth="2.8" strokeLinecap="round" />
            <line x1="10" y1="18" x2="22" y2="18" stroke="#111827" strokeWidth="2.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default MapPage

import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router'
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../lib/supabase'
import type { Report, ReportCategory, ReportStatus } from '../types'

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

const STATUS_LABELS: Record<ReportStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En proceso',
  resolved: 'Resuelto',
}

const STATUS_COLORS: Record<ReportStatus, { bg: string; color: string }> = {
  pending: { bg: '#fef3c7', color: '#92400e' },
  in_progress: { bg: '#dbeafe', color: '#1e40af' },
  resolved: { bg: '#dcfce7', color: '#166534' },
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-GT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ReportDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const backTo: string = (location.state as { from?: string })?.from ?? '/'
  const [report, setReport] = useState<Report | null>(null)
  const [affectedCount, setAffectedCount] = useState(0)
  const [hasVoted, setHasVoted] = useState(false)
  const [votingLoading, setVotingLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!id) return

    async function fetchReport() {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) {
        navigate('/')
        return
      }

      setReport(data)

      // Fetch affected count
      const { count } = await supabase
        .from('affected')
        .select('*', { count: 'exact', head: true })
        .eq('report_id', id)

      setAffectedCount(count ?? 0)

      // Check if current user voted
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { data: vote } = await supabase
          .from('affected')
          .select('id')
          .eq('report_id', id)
          .eq('user_id', session.user.id)
          .maybeSingle()

        setHasVoted(!!vote)
      }

      setLoading(false)
    }

    fetchReport()
  }, [id, navigate])

  async function handleVote() {
    if (!report || votingLoading) return
    setVotingLoading(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      await supabase.auth.signInAnonymously()
    }

    const { data: { session: currentSession } } = await supabase.auth.getSession()
    if (!currentSession) { setVotingLoading(false); return }

    if (hasVoted) {
      const { error } = await supabase
        .from('affected')
        .delete()
        .eq('report_id', report.id)
        .eq('user_id', currentSession.user.id)

      if (!error) {
        setAffectedCount((c) => c - 1)
        setHasVoted(false)
      }
    } else {
      const { error } = await supabase
        .from('affected')
        .insert({ report_id: report.id, user_id: currentSession.user.id })

      if (!error) {
        setAffectedCount((c) => c + 1)
        setHasVoted(true)
      }
    }

    setVotingLoading(false)
  }

  async function handleShare() {
    const url = window.location.href
    const text = `🚨 ${report?.title} — reportado en CiudadActiva San José Pinula`

    if (navigator.share) {
      await navigator.share({ title: report?.title, text, url })
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const isVideo = report?.photo_url?.match(/\.(mp4|mov|webm|avi)$/i)

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <p style={{ color: '#6b7280' }}>Cargando reporte...</p>
      </div>
    )
  }

  if (!report) return null

  const categoryColor = CATEGORY_COLORS[report.category]
  const statusStyle = STATUS_COLORS[report.status]

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#f9fafb' }}>
      {/* Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'white',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}>
        <button
          onClick={() => navigate(backTo)}
          style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '4px' }}
        >
          ←
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 700, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {report.title}
        </h1>
      </div>

      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        {/* Media */}
        {report.photo_url && (
          isVideo ? (
            <video
              src={report.photo_url}
              controls
              style={{ width: '100%', maxHeight: '280px', background: '#000', display: 'block' }}
            />
          ) : (
            <img
              src={report.photo_url}
              alt={report.title}
              style={{ width: '100%', maxHeight: '280px', objectFit: 'cover', display: 'block' }}
            />
          )
        )}

        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Badges */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{
              padding: '4px 10px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 700,
              color: 'white',
              background: categoryColor,
            }}>
              {CATEGORY_LABELS[report.category]}
            </span>
            <span style={{
              padding: '4px 10px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 600,
              background: statusStyle.bg,
              color: statusStyle.color,
            }}>
              {STATUS_LABELS[report.status]}
            </span>
          </div>

          {/* Title + description */}
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>{report.title}</h2>
            {report.description && (
              <p style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.6' }}>{report.description}</p>
            )}
          </div>

          {/* Date */}
          <p style={{ fontSize: '12px', color: '#9ca3af' }}>
            Reportado el {formatDate(report.created_at)}
          </p>

          {/* Location map */}
          <div>
            <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Ubicación</p>
            {report.address && (
              <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>📍 {report.address}</p>
            )}
            <div style={{ height: '160px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
              <MapContainer
                center={[report.lat, report.lng]}
                zoom={16}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
                dragging={false}
                scrollWheelZoom={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <CircleMarker
                  center={[report.lat, report.lng]}
                  radius={10}
                  pathOptions={{ color: categoryColor, fillColor: categoryColor, fillOpacity: 0.8 }}
                />
              </MapContainer>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {/* Me afecta también */}
            <button
              onClick={handleVote}
              disabled={votingLoading}
              style={{
                padding: '12px',
                border: `2px solid ${hasVoted ? '#dc2626' : '#e5e7eb'}`,
                borderRadius: '10px',
                background: hasVoted ? '#fef2f2' : 'white',
                color: hasVoted ? '#dc2626' : '#374151',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span style={{ fontSize: '22px' }}>{hasVoted ? '❤️' : '🤍'}</span>
              <span>Me afecta también</span>
              <span style={{ fontSize: '18px', fontWeight: 700 }}>{affectedCount}</span>
            </button>

            {/* Compartir */}
            <button
              onClick={handleShare}
              style={{
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                background: copied ? '#f0fdf4' : 'white',
                color: copied ? '#16a34a' : '#374151',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span style={{ fontSize: '22px' }}>🔗</span>
              <span>{copied ? '¡Enlace copiado!' : 'Compartir'}</span>
              <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 400 }}>
                redes sociales
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReportDetailPage

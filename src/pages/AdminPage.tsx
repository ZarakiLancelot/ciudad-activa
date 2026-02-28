import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { supabase } from '../lib/supabase'
import type { Report, ReportCategory, ReportStatus } from '../types'

const CATEGORY_LABELS: Record<ReportCategory, string> = {
  pothole: 'Bache',
  accident: 'Accidente',
  lighting: 'Alumbrado',
  water: 'Agua',
  trash: 'Basura',
  other: 'Otro',
}

const CATEGORY_COLORS: Record<ReportCategory, string> = {
  pothole: '#f97316',
  accident: '#ef4444',
  lighting: '#eab308',
  water: '#3b82f6',
  trash: '#22c55e',
  other: '#8b5cf6',
}

const STATUS_OPTIONS: { value: ReportStatus; label: string; bg: string; color: string }[] = [
  { value: 'pending', label: 'Pendiente', bg: '#fef3c7', color: '#92400e' },
  { value: 'in_progress', label: 'En proceso', bg: '#dbeafe', color: '#1e40af' },
  { value: 'resolved', label: 'Resuelto', bg: '#dcfce7', color: '#166534' },
]

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-GT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function AdminPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [unauthorized, setUnauthorized] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<ReportStatus | 'all'>('all')
  const navigate = useNavigate()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setUnauthorized(true); setLoading(false); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (!profile?.is_admin) { setUnauthorized(true); setLoading(false); return }

      fetchReports()
    }

    async function fetchReports() {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) setReports(data)
      setLoading(false)
    }

    init()
  }, [])

  async function handleStatusChange(reportId: string, newStatus: ReportStatus) {
    setUpdatingId(reportId)
    const { error } = await supabase
      .from('reports')
      .update({ status: newStatus })
      .eq('id', reportId)

    if (!error) {
      setReports((prev) =>
        prev.map((r) => r.id === reportId ? { ...r, status: newStatus } : r)
      )
    }
    setUpdatingId(null)
  }

  const filtered = filterStatus === 'all'
    ? reports
    : reports.filter((r) => r.status === filterStatus)

  const counts = {
    all: reports.length,
    pending: reports.filter((r) => r.status === 'pending').length,
    in_progress: reports.filter((r) => r.status === 'in_progress').length,
    resolved: reports.filter((r) => r.status === 'resolved').length,
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <p style={{ color: '#6b7280' }}>Cargando...</p>
      </div>
    )
  }

  if (unauthorized) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px' }}>
        <p style={{ fontSize: '48px' }}>🔒</p>
        <p style={{ fontWeight: 700, fontSize: '18px' }}>Acceso restringido</p>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>No tienes permisos para ver esta página.</p>
        <button
          onClick={() => navigate('/')}
          style={{ padding: '10px 20px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
        >
          Volver al mapa
        </button>
      </div>
    )
  }

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
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '4px' }}
        >
          ←
        </button>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 700 }}>Panel Municipal</h1>
          <p style={{ fontSize: '12px', color: '#6b7280' }}>San José Pinula</p>
        </div>
      </div>

      <div style={{ padding: '16px', maxWidth: '800px', margin: '0 auto' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
          {[
            { key: 'all', label: 'Total', bg: '#f3f4f6', color: '#111827' },
            { key: 'pending', label: 'Pendientes', bg: '#fef3c7', color: '#92400e' },
            { key: 'in_progress', label: 'En proceso', bg: '#dbeafe', color: '#1e40af' },
            { key: 'resolved', label: 'Resueltos', bg: '#dcfce7', color: '#166534' },
          ].map((stat) => (
            <button
              key={stat.key}
              onClick={() => setFilterStatus(stat.key as ReportStatus | 'all')}
              style={{
                padding: '12px 8px',
                borderRadius: '10px',
                background: filterStatus === stat.key ? stat.bg : 'white',
                border: `2px solid ${filterStatus === stat.key ? stat.color : '#e5e7eb'}`,
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: '22px', fontWeight: 800, color: stat.color }}>
                {counts[stat.key as keyof typeof counts]}
              </p>
              <p style={{ fontSize: '11px', color: stat.color, fontWeight: 600 }}>{stat.label}</p>
            </button>
          ))}
        </div>

        {/* Reports list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.length === 0 && (
            <p style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0' }}>
              No hay reportes en esta categoría.
            </p>
          )}
          {filtered.map((report) => {
            const statusOption = STATUS_OPTIONS.find((s) => s.value === report.status)!
            return (
              <div key={report.id} style={{
                background: 'white',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                border: '1px solid #f3f4f6',
              }}>
                <div style={{ display: 'flex', gap: '12px', padding: '14px' }}>
                  {/* Foto */}
                  {report.photo_url && (
                    <img
                      src={report.photo_url}
                      alt={report.title}
                      style={{ width: '72px', height: '72px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }}
                    />
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Badges */}
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '11px', fontWeight: 700, color: 'white',
                        background: CATEGORY_COLORS[report.category],
                        padding: '2px 8px', borderRadius: '999px',
                      }}>
                        {CATEGORY_LABELS[report.category]}
                      </span>
                      <span style={{
                        fontSize: '11px', fontWeight: 600,
                        background: statusOption.bg, color: statusOption.color,
                        padding: '2px 8px', borderRadius: '999px',
                      }}>
                        {statusOption.label}
                      </span>
                    </div>

                    <p style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {report.title}
                    </p>
                    {report.address && (
                      <p style={{ fontSize: '12px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        📍 {report.address}
                      </p>
                    )}
                    <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                      {formatDate(report.created_at)}
                    </p>
                  </div>
                </div>

                {/* Status actions */}
                <div style={{
                  borderTop: '1px solid #f3f4f6',
                  padding: '10px 14px',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: '12px', color: '#6b7280', marginRight: '4px' }}>Cambiar estado:</span>
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleStatusChange(report.id, opt.value)}
                      disabled={report.status === opt.value || updatingId === report.id}
                      style={{
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        borderRadius: '6px',
                        border: 'none',
                        cursor: report.status === opt.value ? 'default' : 'pointer',
                        background: report.status === opt.value ? opt.bg : '#f3f4f6',
                        color: report.status === opt.value ? opt.color : '#6b7280',
                        opacity: updatingId === report.id && report.status !== opt.value ? 0.5 : 1,
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                  <button
                    onClick={() => navigate(`/report/${report.id}`, { state: { from: '/admin' } })}
                    style={{
                      marginLeft: 'auto',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: '1px solid #e5e7eb',
                      background: 'white',
                      color: '#374151',
                      cursor: 'pointer',
                    }}
                  >
                    Ver detalle
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default AdminPage

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import type { Report, ReportCategory, ReportStatus } from '../types'
import LanguageToggle from '../components/LanguageToggle'

const CATEGORY_COLORS: Record<ReportCategory, string> = {
  pothole: '#f97316',
  accident: '#ef4444',
  lighting: '#eab308',
  water: '#3b82f6',
  trash: '#22c55e',
  other: '#8b5cf6',
}

const CATEGORIES: ReportCategory[] = ['pothole', 'accident', 'lighting', 'water', 'trash', 'other']

const STATUS_OPTIONS: { value: ReportStatus; bg: string; color: string }[] = [
  { value: 'pending',     bg: '#fef3c7', color: '#92400e' },
  { value: 'in_progress', bg: '#dbeafe', color: '#1e40af' },
  { value: 'resolved',    bg: '#dcfce7', color: '#166534' },
]

const STATUS_DONUT_COLORS: Record<ReportStatus, string> = {
  pending:     '#fbbf24',
  in_progress: '#60a5fa',
  resolved:    '#4ade80',
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-GT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function AdminPage() {
  const { t } = useTranslation()
  const [reports, setReports] = useState<Report[]>([])
  const [municipalities, setMunicipalities] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [unauthorized, setUnauthorized] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [filterMunicipality, setFilterMunicipality] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<ReportStatus | 'all'>('all')
  const [showAnalytics, setShowAnalytics] = useState(false)
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

      const [reportsRes, municipalitiesRes] = await Promise.all([
        supabase.from('reports').select('*').order('created_at', { ascending: false }),
        supabase.from('municipalities').select('id, name').order('name'),
      ])

      if (!reportsRes.error && reportsRes.data) setReports(reportsRes.data)
      if (!municipalitiesRes.error && municipalitiesRes.data) setMunicipalities(municipalitiesRes.data)
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

  const byMunicipality = filterMunicipality === 'all'
    ? reports
    : reports.filter((r) => r.municipality_id === filterMunicipality)

  const filtered = filterStatus === 'all'
    ? byMunicipality
    : byMunicipality.filter((r) => r.status === filterStatus)

  const counts = {
    all:         byMunicipality.length,
    pending:     byMunicipality.filter((r) => r.status === 'pending').length,
    in_progress: byMunicipality.filter((r) => r.status === 'in_progress').length,
    resolved:    byMunicipality.filter((r) => r.status === 'resolved').length,
  }

  // ── Analytics ──────────────────────────────────────────────────────────────
  const analyticsTotal = byMunicipality.length
  const pendingDeg    = analyticsTotal > 0 ? (counts.pending     / analyticsTotal) * 360 : 0
  const inProgressDeg = analyticsTotal > 0 ? (counts.in_progress / analyticsTotal) * 360 : 0

  const last7days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const dayStr = d.toISOString().split('T')[0]
    const label  = d.toLocaleDateString('es-GT', { weekday: 'short' }).slice(0, 2)
    const count  = byMunicipality.filter((r) => r.created_at.startsWith(dayStr)).length
    return { day: dayStr, label, count }
  })
  const maxDayCount = Math.max(...last7days.map((d) => d.count), 1)
  // ───────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <p style={{ color: '#6b7280' }}>{t('admin.loading')}</p>
      </div>
    )
  }

  if (unauthorized) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px' }}>
        <p style={{ fontSize: '48px' }}>🔒</p>
        <p style={{ fontWeight: 700, fontSize: '18px' }}>{t('admin.unauthorized')}</p>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>{t('admin.unauthorizedMsg')}</p>
        <button
          onClick={() => navigate('/')}
          style={{ padding: '10px 20px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
        >
          {t('admin.backToMap')}
        </button>
      </div>
    )
  }

  return (
    <main style={{ height: '100%', overflowY: 'auto', background: '#f9fafb' }}>
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
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '18px', fontWeight: 700 }}>{t('admin.pageTitle')}</h1>
          <p style={{ fontSize: '12px', color: '#6b7280' }}>{t('admin.subtitle')}</p>
        </div>
        <LanguageToggle />
      </div>

      <div style={{ padding: '16px', maxWidth: '800px', margin: '0 auto' }}>
        {/* Municipality filter */}
        <select
          aria-label={t('admin.allMunicipalities')}
          value={filterMunicipality}
          onChange={(e) => { setFilterMunicipality(e.target.value); setFilterStatus('all') }}
          style={{
            width: '100%',
            padding: '10px 12px',
            marginBottom: '14px',
            border: '1px solid #e5e7eb',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 600,
            color: '#374151',
            background: 'white',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="all">{t('admin.allMunicipalities')}</option>
          {municipalities.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '14px' }}>
          {[
            { key: 'all', label: t('admin.total'), bg: '#f3f4f6', color: '#111827' },
            { key: 'pending', label: t('status.pending'), bg: '#fef3c7', color: '#92400e' },
            { key: 'in_progress', label: t('status.in_progress'), bg: '#dbeafe', color: '#1e40af' },
            { key: 'resolved', label: t('status.resolved'), bg: '#dcfce7', color: '#166534' },
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

        {/* ── Analytics ──────────────────────────────────────────────────── */}
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={() => setShowAnalytics((v) => !v)}
            style={{
              width: '100%',
              padding: '11px 16px',
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: showAnalytics ? '10px 10px 0 0' : '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              color: '#374151',
            }}
          >
            <span>📊 {t('admin.analytics')}</span>
            <span style={{ fontSize: '11px', color: '#9ca3af' }}>{showAnalytics ? '▲' : '▼'}</span>
          </button>

          {showAnalytics && (
            <div style={{
              background: 'white',
              border: '1px solid #e5e7eb',
              borderTop: 'none',
              borderRadius: '0 0 10px 10px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
            }}>

              {/* Barras por categoría + Dona de estado */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

                {/* Barras por categoría */}
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                    {t('admin.byCategory')}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                    {CATEGORIES.map((cat) => {
                      const count = byMunicipality.filter((r) => r.category === cat).length
                      const pct   = analyticsTotal > 0 ? (count / analyticsTotal) * 100 : 0
                      return (
                        <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11px', color: '#374151', width: '62px', flexShrink: 0 }}>
                            {t(`categories.${cat}`)}
                          </span>
                          <div style={{ flex: 1, height: '8px', background: '#f3f4f6', borderRadius: '999px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${pct}%`,
                              height: '100%',
                              background: CATEGORY_COLORS[cat],
                              borderRadius: '999px',
                              transition: 'width 0.5s ease',
                              minWidth: count > 0 ? '6px' : '0',
                            }} />
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#374151', minWidth: '16px', textAlign: 'right' }}>
                            {count}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Dona de estado */}
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                    {t('admin.byStatus')}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {analyticsTotal === 0 ? (
                      <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#f3f4f6', flexShrink: 0 }} />
                    ) : (
                      <div style={{
                        width: '72px',
                        height: '72px',
                        borderRadius: '50%',
                        background: `conic-gradient(
                          ${STATUS_DONUT_COLORS.pending}     0deg ${pendingDeg}deg,
                          ${STATUS_DONUT_COLORS.in_progress} ${pendingDeg}deg ${pendingDeg + inProgressDeg}deg,
                          ${STATUS_DONUT_COLORS.resolved}    ${pendingDeg + inProgressDeg}deg 360deg
                        )`,
                        WebkitMaskImage: 'radial-gradient(transparent 26px, black 27px)',
                        maskImage:       'radial-gradient(transparent 26px, black 27px)',
                        flexShrink: 0,
                      }} />
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                      {STATUS_OPTIONS.map((opt) => (
                        <div key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{
                            width: '9px', height: '9px', borderRadius: '50%',
                            background: STATUS_DONUT_COLORS[opt.value], flexShrink: 0,
                          }} />
                          <span style={{ fontSize: '11px', color: '#374151', flex: 1 }}>
                            {t(`status.${opt.value}`)}
                          </span>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#111827' }}>
                            {counts[opt.value]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Barras — últimos 7 días */}
              <div>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                  {t('admin.last7days')}
                </p>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '80px' }}>
                  {last7days.map(({ day, label, count }) => {
                    const barHeight = count > 0 ? Math.max((count / maxDayCount) * 56, 4) : 0
                    return (
                      <div
                        key={day}
                        style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}
                      >
                        <span style={{
                          fontSize: '10px', fontWeight: 700, color: '#374151', lineHeight: 1,
                          visibility: count > 0 ? 'visible' : 'hidden',
                        }}>
                          {count}
                        </span>
                        <div style={{
                          width: '100%',
                          height: `${barHeight}px`,
                          background: '#16a34a',
                          borderRadius: '3px 3px 0 0',
                          opacity: count > 0 ? 1 : 0,
                          transition: 'height 0.4s ease',
                        }} />
                        <div style={{ width: '100%', height: '2px', background: '#e5e7eb', borderRadius: '1px' }} />
                        <span style={{ fontSize: '10px', color: '#9ca3af' }}>{label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>
          )}
        </div>
        {/* ─────────────────────────────────────────────────────────────────── */}

        {/* Lista de reportes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.length === 0 && (
            <p style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0' }}>
              {t('admin.noReports')}
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
                        {t(`categories.${report.category}`)}
                      </span>
                      <span style={{
                        fontSize: '11px', fontWeight: 600,
                        background: statusOption.bg, color: statusOption.color,
                        padding: '2px 8px', borderRadius: '999px',
                      }}>
                        {t(`status.${statusOption.value}`)}
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
                  <span style={{ fontSize: '12px', color: '#6b7280', marginRight: '4px' }}>{t('admin.changeStatus')}</span>
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
                      {t(`status.${opt.value}`)}
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
                    {t('admin.viewDetail')}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}

export default AdminPage

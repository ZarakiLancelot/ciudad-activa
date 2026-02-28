import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../lib/supabase'
import type { ReportCategory } from '../types'

// Fix Leaflet default marker icons with Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow })

const SAN_JOSE_PINULA = { lat: 14.5386, lng: -90.4125 }

const CATEGORIES: { value: ReportCategory; label: string; color: string }[] = [
  { value: 'pothole', label: 'Bache', color: '#f97316' },
  { value: 'accident', label: 'Accidente', color: '#ef4444' },
  { value: 'lighting', label: 'Alumbrado', color: '#eab308' },
  { value: 'water', label: 'Agua', color: '#3b82f6' },
  { value: 'trash', label: 'Basura', color: '#22c55e' },
  { value: 'other', label: 'Otro', color: '#8b5cf6' },
]

interface LatLng { lat: number; lng: number }

function LocationPicker({ onSelect }: { onSelect: (latlng: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onSelect({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return null
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'es' } }
    )
    const data = await res.json()
    return data.display_name ?? ''
  } catch {
    return ''
  }
}

function NewReportPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<ReportCategory | ''>('')
  const [media, setMedia] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [location, setLocation] = useState<LatLng | null>(null)
  const [address, setAddress] = useState('')
  const [gpsLoading, setGpsLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [municipalityId, setMunicipalityId] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    supabase
      .from('municipalities')
      .select('id')
      .eq('slug', 'san-jose-pinula')
      .single()
      .then(({ data }) => {
        if (data) setMunicipalityId(data.id)
      })
  }, [])

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setMedia(file)
    setMediaPreview(URL.createObjectURL(file))
    setMediaType(file.type.startsWith('video/') ? 'video' : 'image')
  }

  async function handleGpsLocation() {
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latlng = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setLocation(latlng)
        const addr = await reverseGeocode(latlng.lat, latlng.lng)
        setAddress(addr)
        setGpsLoading(false)
      },
      () => {
        setError('No se pudo obtener tu ubicación. Selecciónala en el mapa.')
        setGpsLoading(false)
      }
    )
  }

  async function handleLocationSelect(latlng: LatLng) {
    setLocation(latlng)
    const addr = await reverseGeocode(latlng.lat, latlng.lng)
    setAddress(addr)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!category || !location || !municipalityId) {
      setError('Selecciona una categoría y una ubicación en el mapa.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // Ensure anonymous session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        await supabase.auth.signInAnonymously()
      }

      // Upload media if provided
      let photoUrl: string | null = null
      if (media) {
        const ext = media.name.split('.').pop()
        const fileName = `${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('report-photos')
          .upload(fileName, media)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('report-photos')
          .getPublicUrl(fileName)

        photoUrl = urlData.publicUrl
      }

      // Insert report
      const { data: report, error: insertError } = await supabase
        .from('reports')
        .insert({
          title,
          description: description || null,
          category,
          photo_url: photoUrl,
          lat: location.lat,
          lng: location.lng,
          address: address || null,
          municipality_id: municipalityId,
        })
        .select()
        .single()

      if (insertError) throw insertError

      navigate(`/report/${report.id}`)
    } catch (err) {
      setError('Ocurrió un error al enviar el reporte. Intenta de nuevo.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
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
        <h1 style={{ fontSize: '18px', fontWeight: 700 }}>Nuevo reporte</h1>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '600px', margin: '0 auto' }}>

        {/* Category */}
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>
            Categoría *
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                style={{
                  padding: '10px 8px',
                  border: `2px solid ${category === cat.value ? cat.color : '#e5e7eb'}`,
                  borderRadius: '8px',
                  background: category === cat.value ? `${cat.color}18` : 'white',
                  color: category === cat.value ? cat.color : '#374151',
                  fontWeight: category === cat.value ? 700 : 400,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>
            Título *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Bache grande en calle principal"
            required
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
            }}
          />
        </div>

        {/* Description */}
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>
            Descripción <span style={{ fontWeight: 400, color: '#9ca3af' }}>(opcional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe el problema con más detalle..."
            rows={3}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              resize: 'vertical',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Photo */}
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>
            Foto <span style={{ fontWeight: 400, color: '#9ca3af' }}>(opcional)</span>
          </label>
          {mediaPreview ? (
            <div style={{ position: 'relative' }}>
              {mediaType === 'video' ? (
                <video
                  src={mediaPreview}
                  controls
                  style={{ width: '100%', maxHeight: '200px', borderRadius: '8px', background: '#000' }}
                />
              ) : (
                <img
                  src={mediaPreview}
                  alt="Vista previa"
                  style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px' }}
                />
              )}
              <button
                type="button"
                onClick={() => { setMedia(null); setMediaPreview(null); setMediaType(null) }}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'rgba(0,0,0,0.6)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  cursor: 'pointer',
                  fontSize: '16px',
                }}
              >
                ×
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {/* Hidden inputs */}
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handlePhotoChange}
                style={{ display: 'none' }}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoChange}
                style={{ display: 'none' }}
              />

              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '20px 12px',
                  border: '2px dashed #d1d5db',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  fontSize: '13px',
                  background: 'white',
                }}
              >
                <span style={{ fontSize: '24px' }}>📁</span>
                Subir archivo
              </button>

              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '20px 12px',
                  border: '2px dashed #d1d5db',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  fontSize: '13px',
                  background: 'white',
                }}
              >
                <span style={{ fontSize: '24px' }}>📷</span>
                Usar cámara
              </button>
            </div>
          )}
        </div>

        {/* Location */}
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>
            Ubicación *
          </label>
          <button
            type="button"
            onClick={handleGpsLocation}
            disabled={gpsLoading}
            style={{
              width: '100%',
              padding: '10px',
              marginBottom: '10px',
              background: '#eff6ff',
              color: '#2563eb',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {gpsLoading ? 'Obteniendo ubicación...' : '📍 Usar mi ubicación'}
          </button>
          <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', textAlign: 'center' }}>
            o toca el mapa para marcar el punto exacto
          </p>
          <div style={{ height: '220px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
            <MapContainer
              center={location ? [location.lat, location.lng] : [SAN_JOSE_PINULA.lat, SAN_JOSE_PINULA.lng]}
              zoom={15}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LocationPicker onSelect={handleLocationSelect} />
              {location && <Marker position={[location.lat, location.lng]} />}
            </MapContainer>
          </div>
          {address && (
            <p style={{ fontSize: '12px', color: '#4b5563', marginTop: '6px' }}>
              📍 {address}
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: '10px 14px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#dc2626',
            fontSize: '14px',
          }}>
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || !title || !category || !location}
          style={{
            padding: '14px',
            background: submitting || !title || !category || !location ? '#9ca3af' : '#16a34a',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '16px',
            fontWeight: 700,
            cursor: submitting || !title || !category || !location ? 'not-allowed' : 'pointer',
            marginBottom: '32px',
          }}
        >
          {submitting ? 'Enviando...' : 'Enviar reporte'}
        </button>
      </form>
    </div>
  )
}

export default NewReportPage

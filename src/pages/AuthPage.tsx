import { useState } from 'react'
import { useNavigate } from 'react-router'
import { supabase } from '../lib/supabase'

type AuthMode = 'login' | 'register'

function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [anonLoading, setAnonLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const navigate = useNavigate()

  function switchMode(newMode: AuthMode) {
    setMode(newMode)
    setError(null)
    setSuccessMessage(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (mode === 'register') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(translateError(error.message))
      } else {
        setSuccessMessage('¡Cuenta creada! Revisa tu correo para confirmar tu registro.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(translateError(error.message))
      } else {
        navigate('/')
      }
    }

    setLoading(false)
  }

  async function handleAnonymous() {
    setAnonLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInAnonymously()
    if (error) {
      setError('No se pudo continuar de forma anónima. Intenta de nuevo.')
    } else {
      navigate('/')
    }
    setAnonLoading(false)
  }

  function translateError(msg: string): string {
    if (msg.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos.'
    if (msg.includes('Email not confirmed')) return 'Debes confirmar tu correo antes de iniciar sesión.'
    if (msg.includes('User already registered')) return 'Ya existe una cuenta con ese correo.'
    if (msg.includes('Password should be at least')) return 'La contraseña debe tener al menos 6 caracteres.'
    if (msg.includes('Unable to validate email address')) return 'El correo ingresado no es válido.'
    return 'Ocurrió un error. Intenta de nuevo.'
  }

  return (
    <div style={{
      minHeight: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f9fafb',
      padding: '24px 16px',
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#16a34a', marginBottom: '4px' }}>
          CiudadActiva
        </h1>
        <p style={{ fontSize: '14px', color: '#6b7280' }}>San José Pinula</p>
      </div>

      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}>
        {/* Mode toggle */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          background: '#f3f4f6',
          borderRadius: '10px',
          padding: '4px',
          marginBottom: '24px',
        }}>
          {(['login', 'register'] as AuthMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              style={{
                padding: '8px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                background: mode === m ? 'white' : 'transparent',
                color: mode === m ? '#111827' : '#6b7280',
                boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {m === 'login' ? 'Iniciar sesión' : 'Registrarse'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#374151' }}>
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
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

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#374151' }}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
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

          {error && (
            <div style={{
              padding: '10px 14px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#dc2626',
              fontSize: '13px',
            }}>
              {error}
            </div>
          )}

          {successMessage && (
            <div style={{
              padding: '10px 14px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              color: '#166534',
              fontSize: '13px',
            }}>
              {successMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '12px',
              background: loading ? '#9ca3af' : '#16a34a',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '4px',
            }}
          >
            {loading
              ? 'Cargando...'
              : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'
            }
          </button>
        </form>

        {/* Divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          margin: '20px 0',
          color: '#9ca3af',
          fontSize: '13px',
        }}>
          <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
          o
          <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
        </div>

        {/* Anonymous */}
        <button
          type="button"
          onClick={handleAnonymous}
          disabled={anonLoading}
          style={{
            width: '100%',
            padding: '12px',
            background: 'white',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: anonLoading ? 'not-allowed' : 'pointer',
          }}
        >
          {anonLoading ? 'Cargando...' : '👤 Continuar sin cuenta'}
        </button>

        <p style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', marginTop: '12px' }}>
          Sin cuenta puedes ver y reportar problemas, pero no podrás acceder a tu historial.
        </p>
      </div>

      {/* Back to map */}
      <button
        onClick={() => navigate('/')}
        style={{
          marginTop: '20px',
          background: 'none',
          border: 'none',
          color: '#6b7280',
          fontSize: '14px',
          cursor: 'pointer',
          textDecoration: 'underline',
        }}
      >
        ← Volver al mapa
      </button>
    </div>
  )
}

export default AuthPage

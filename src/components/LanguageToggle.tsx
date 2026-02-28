import { useTranslation } from 'react-i18next'

interface LanguageToggleProps {
  style?: React.CSSProperties
}

function LanguageToggle({ style }: LanguageToggleProps) {
  const { i18n } = useTranslation()
  const isES = i18n.language.startsWith('es')

  return (
    <button
      onClick={() => i18n.changeLanguage(isES ? 'en' : 'es')}
      title={isES ? 'Switch to English' : 'Cambiar a Español'}
      style={{
        padding: '4px 10px',
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        fontSize: '12px',
        fontWeight: 700,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        color: '#374151',
        flexShrink: 0,
        ...style,
      }}
    >
      {isES ? '🇺🇸 EN' : '🇬🇹 ES'}
    </button>
  )
}

export default LanguageToggle

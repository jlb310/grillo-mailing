import React from 'react'
import Logo from './logo'

// Wordmarks de Grillo. Copiado de grillo-saas (src/components/Brand.tsx),
// recortado a las dos variantes que esta app usa.

/** Ícono + "Grillo" en Instrument Serif itálica. Para pantallas de marca (login). */
export const GrilloWordmark = ({
  size = 28,
  color = 'currentColor',
  showMark = true,
  variant = 'light',
  className,
}: {
  size?: number
  color?: string
  showMark?: boolean
  variant?: 'light' | 'dark' | 'favicon' | 'onDark'
  className?: string
}) => (
  <div className={`inline-flex items-center ${className ?? ''}`} style={{ color, gap: size * 0.35 }}>
    {showMark && <Logo variant={variant} size={size * 1.5} />}
    <span
      style={{
        fontFamily: 'var(--font-instrument-serif), serif',
        fontSize: size * 1.2,
        letterSpacing: '-0.02em',
        fontWeight: 400,
        lineHeight: 1,
        fontStyle: 'italic',
      }}
    >
      Grillo
    </span>
  </div>
)

/** Ícono + "Grillo" en Geist bold. Para el sidebar y headers. */
export const GrilloWordmarkBold = ({
  size = 22,
  color = 'currentColor',
  className,
  variant = 'light',
}: {
  size?: number
  color?: string
  className?: string
  variant?: 'light' | 'dark' | 'favicon'
}) => (
  <div className={`inline-flex items-center ${className ?? ''}`} style={{ color, gap: size * 0.35 }}>
    <Logo variant={variant} size={size * 1.3} />
    <span
      style={{
        fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
        fontSize: size,
        letterSpacing: '-0.03em',
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      Grillo
    </span>
  </div>
)

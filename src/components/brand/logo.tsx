import React from 'react'

// Mascota Grillo. Copiado de grillo-saas (src/components/Logo.tsx) para que
// las dos apps usen exactamente la misma marca. Los colores son literales a
// propósito: son la paleta de la mascota, no tokens de tema — el grillo se ve
// igual en light y en dark.
const MASCOT = {
  outline: '#0f3a1d',   // verde muy oscuro para contornos
  primary: '#3fa844',   // verde grillo primario
  highlight: '#7ed957', // verde claro para luces
  eye: '#ffffff',
  pupil: '#0f3a1d',
}

interface LogoProps {
  /**
   * - `light` / `favicon`: contorno oscuro, sin fondo. Para fondos claros.
   * - `dark`: contorno claro sobre un cuadrado oscuro propio.
   * - `onDark`: contorno claro y sin fondo. Añadido respecto de grillo-saas:
   *   hace falta para fondos oscuros de marca (el panel del login), donde el
   *   contorno oscuro de `light` se pierde y el cuadrado de `dark` no aporta.
   */
  variant?: 'light' | 'dark' | 'favicon' | 'onDark'
  size?: number
  className?: string
}

export const Logo: React.FC<LogoProps> = ({ variant = 'light', size = 32, className = '' }) => {
  const isDark = variant === 'dark'
  const lightStroke = isDark || variant === 'onDark'

  const strokeColor = lightStroke ? MASCOT.highlight : MASCOT.outline

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {isDark && <rect width="128" height="128" rx="28" fill={MASCOT.outline} />}

      {/* Antenas */}
      <path d="M 64 34 Q 56 18 46 10" stroke={strokeColor} strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M 74 34 Q 88 22 102 16" stroke={strokeColor} strokeWidth="5" strokeLinecap="round" fill="none" />

      {/* Cabeza */}
      <circle cx="68" cy="70" r="38" fill={MASCOT.primary} stroke={strokeColor} strokeWidth="5" />

      {/* Reflejo de luz */}
      <path d="M 50 52 Q 40 65 44 82" stroke={MASCOT.highlight} strokeWidth="10" strokeLinecap="round" fill="none" opacity="0.6" />

      {/* Ojo */}
      <circle cx="82" cy="62" r="12" fill={MASCOT.eye} stroke={strokeColor} strokeWidth="3.5" />
      <circle cx="85" cy="64" r="6" fill={MASCOT.pupil} />
      <circle cx="87" cy="61" r="2.5" fill={MASCOT.eye} />

      {/* Sonrisa */}
      <path d="M 84 86 Q 93 92 102 86" stroke={strokeColor} strokeWidth="3.5" strokeLinecap="round" fill="none" />
    </svg>
  )
}

export default Logo

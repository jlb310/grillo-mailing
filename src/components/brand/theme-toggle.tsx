"use client"

// Toggle de tema con el mismo aspecto que el de grillo-saas.
//
// A diferencia de aquel, este no espeja el tema en estado de React: el único
// dueño del tema es el atributo data-theme en <html>, y el aspecto del switch
// sale de CSS que reacciona a ese atributo (ver .theme-switch en globals.css).
// Así no hay setState en un efecto, ni desajuste entre server y cliente en el
// primer render — el script inline del layout ya dejó el atributo puesto.
export function ThemeToggle() {
  const toggleTheme = () => {
    const root = document.documentElement
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark"
    root.setAttribute("data-theme", next)
    try {
      localStorage.setItem("grillo-theme", next)
    } catch {
      // Modo privado o storage lleno: el tema igual se aplica en esta sesión.
    }
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-switch relative w-14 h-7 rounded-full bg-background-sunken border border-border p-1 flex items-center transition-all duration-500 hover:border-primary/50"
      aria-label="Cambiar entre tema claro y oscuro"
    >
      <span className="theme-switch-pill absolute h-5 w-5 rounded-full bg-primary shadow-lg shadow-primary/20 transition-transform duration-500" />

      <span className="flex w-full justify-between px-1 z-10 pointer-events-none">
        {/* Sol */}
        <svg
          className="theme-switch-sun transition-all duration-500"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M19.78 4.22l-1.42 1.42" />
        </svg>

        {/* Luna */}
        <svg
          className="theme-switch-moon transition-all duration-500"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          aria-hidden="true"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </span>
    </button>
  )
}

export default ThemeToggle

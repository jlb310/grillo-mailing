/**
 * Script inline que corre durante el parseo del HTML, antes del primer paint.
 *
 * Patrón tomado de la guía de Next 16 "Preventing flash before hydration"
 * (node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md).
 *
 * El truco del `type`: en el server sale como `text/javascript` y el browser lo
 * ejecuta al parsear; en el cliente sale como `text/plain` para que React no
 * avise por renderizar tags <script>. `suppressHydrationWarning` cubre esa
 * diferencia de atributo.
 *
 * El `html` que reciba debe ser siempre un literal del código, nunca algo
 * derivado de datos de usuario.
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

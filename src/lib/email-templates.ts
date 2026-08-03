import { EmailBlock } from "@/components/email-builder"

export interface TemplatePreset {
  id: string
  name: string
  description: string
  icon: string
  blocks: EmailBlock[]
}

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: "newsletter",
    name: "Newsletter",
    description: "Header, texto, imagen, botón y footer",
    icon: "📰",
    blocks: [
      {
        id: "h1",
        type: "header",
        content: {
          logoUrl: "",
          logoText: "{{organizationName}}",
          logoAlign: "center",
          bgColor: "#ffffff",
          padding: 30,
        },
      },
      {
        id: "t1",
        type: "text",
        content: {
          text: "¡Hola {{firstName}}!\n\nBienvenido a nuestro newsletter mensual. Aquí encontrarás las últimas novedades, promociones exclusivas y contenido de valor para ti.",
          align: "left",
          fontSize: 16,
          color: "#1a1a1a",
          padding: 30,
          lineHeight: 1.6,
        },
      },
      {
        id: "i1",
        type: "image",
        content: {
          src: "",
          alt: "Imagen destacada",
          align: "center",
          width: "100%",
          padding: 0,
          borderRadius: 0,
        },
      },
      {
        id: "b1",
        type: "button",
        content: {
          text: "Ver más",
          url: "https://",
          align: "center",
          bgColor: "#3fa844",
          textColor: "#ffffff",
          fontSize: 16,
          padding: 14,
          borderRadius: 8,
          fullWidth: false,
        },
      },
      {
        id: "d1",
        type: "divider",
        content: {
          color: "#e5e5e5",
          height: 1,
          width: "100%",
          padding: 20,
        },
      },
      {
        id: "f1",
        type: "footer",
        content: {
          text: "© 2026 {{organizationName}}. Todos los derechos reservados.",
          align: "center",
          fontSize: 12,
          color: "#a3a3a3",
          padding: 30,
          bgColor: "#f5f5f5",
          showUnsubscribe: true,
          unsubscribeText: "Darse de baja",
        },
      },
    ],
  },
  {
    id: "promotion",
    name: "Promoción",
    description: "Oferta destacada con imagen grande y CTA",
    icon: "🛍️",
    blocks: [
      {
        id: "h1",
        type: "header",
        content: {
          logoUrl: "",
          logoText: "{{organizationName}}",
          logoAlign: "center",
          bgColor: "#ffffff",
          padding: 20,
        },
      },
      {
        id: "i1",
        type: "image",
        content: {
          src: "",
          alt: "Oferta especial",
          align: "center",
          width: "100%",
          padding: 0,
          borderRadius: 0,
        },
      },
      {
        id: "t1",
        type: "text",
        content: {
          text: "¡OFERTA ESPECIAL!\n\nAprovecha un 20% de descuento en tu próxima compra. Solo por tiempo limitado.",
          align: "center",
          fontSize: 20,
          color: "#1a1a1a",
          padding: 30,
          lineHeight: 1.5,
        },
      },
      {
        id: "b1",
        type: "button",
        content: {
          text: "Aprovechar ahora",
          url: "https://",
          align: "center",
          bgColor: "#ef4444",
          textColor: "#ffffff",
          fontSize: 18,
          padding: 16,
          borderRadius: 8,
          fullWidth: true,
        },
      },
      {
        id: "f1",
        type: "footer",
        content: {
          text: "© 2026 {{organizationName}}. Todos los derechos reservados.",
          align: "center",
          fontSize: 12,
          color: "#a3a3a3",
          padding: 30,
          bgColor: "#f5f5f5",
          showUnsubscribe: true,
          unsubscribeText: "Darse de baja",
        },
      },
    ],
  },
  {
    id: "welcome",
    name: "Bienvenida",
    description: "Email de onboarding para nuevos suscriptores",
    icon: "👋",
    blocks: [
      {
        id: "h1",
        type: "header",
        content: {
          logoUrl: "",
          logoText: "{{organizationName}}",
          logoAlign: "center",
          bgColor: "#ffffff",
          padding: 30,
        },
      },
      {
        id: "t1",
        type: "text",
        content: {
          text: "¡Bienvenido {{firstName}}!\n\nGracias por unirte a nuestra comunidad. Estamos emocionados de tenerte con nosotros.",
          align: "center",
          fontSize: 18,
          color: "#1a1a1a",
          padding: 30,
          lineHeight: 1.6,
        },
      },
      {
        id: "b1",
        type: "button",
        content: {
          text: "Completar mi perfil",
          url: "https://",
          align: "center",
          bgColor: "#3b82f6",
          textColor: "#ffffff",
          fontSize: 16,
          padding: 14,
          borderRadius: 8,
          fullWidth: false,
        },
      },
      {
        id: "t2",
        type: "text",
        content: {
          text: "¿Tienes preguntas? Escríbenos a soporte@grillo.click y te ayudamos en todo.",
          align: "center",
          fontSize: 14,
          color: "#737373",
          padding: 20,
          lineHeight: 1.5,
        },
      },
      {
        id: "f1",
        type: "footer",
        content: {
          text: "© 2026 {{organizationName}}. Todos los derechos reservados.",
          align: "center",
          fontSize: 12,
          color: "#a3a3a3",
          padding: 30,
          bgColor: "#f5f5f5",
          showUnsubscribe: true,
          unsubscribeText: "Darse de baja",
        },
      },
    ],
  },
  {
    id: "simple",
    name: "Simple",
    description: "Texto + botón, sin complicaciones",
    icon: "✉️",
    blocks: [
      {
        id: "t1",
        type: "text",
        content: {
          text: "Hola {{firstName}},\n\nQueremos compartir contigo esta información importante. Haz clic en el botón de abajo para saber más.",
          align: "left",
          fontSize: 16,
          color: "#1a1a1a",
          padding: 40,
          lineHeight: 1.6,
        },
      },
      {
        id: "b1",
        type: "button",
        content: {
          text: "Saber más",
          url: "https://",
          align: "center",
          bgColor: "#3fa844",
          textColor: "#ffffff",
          fontSize: 16,
          padding: 14,
          borderRadius: 8,
          fullWidth: false,
        },
      },
      {
        id: "f1",
        type: "footer",
        content: {
          text: "© 2026 {{organizationName}}. Todos los derechos reservados.",
          align: "center",
          fontSize: 12,
          color: "#a3a3a3",
          padding: 30,
          bgColor: "#f5f5f5",
          showUnsubscribe: true,
          unsubscribeText: "Darse de baja",
        },
      },
    ],
  },
]

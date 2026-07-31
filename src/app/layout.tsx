import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { InlineScript } from "@/components/inline-script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Titulares. Misma tipografía de marca que grillo-saas.
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
});

const TITLE = "Grillo Mailing — Plataforma de Email Marketing"
const DESCRIPTION = "Gestiona campañas de email para tus clientes con Grillo Mailing"

// Base para resolver las URLs absolutas que exigen Open Graph y Twitter. Se
// parsea con tolerancia a propósito: si la env viene mal escrita preferimos
// perder las tarjetas sociales antes que romper el layout al importarlo
// (mismo criterio que lib/prisma con DATABASE_URL).
function resolveSiteUrl(): URL {
  // NEXTAUTH_URL es la única URL pública que ya declara el proyecto (ver
  // .env.example y los envíos de campañas), así que no inventamos otra.
  const raw = process.env.NEXTAUTH_URL
  try {
    if (raw) return new URL(raw)
  } catch {
    // URL inválida: caemos al default de desarrollo.
  }
  return new URL("http://localhost:3000")
}

// Las imágenes (og/twitter) y los íconos no se declaran aquí: los aportan los
// archivos de convención vecinos — icon.svg, favicon.ico, apple-icon.png,
// opengraph-image.png y twitter-image.png.
export const metadata: Metadata = {
  metadataBase: resolveSiteUrl(),
  title: {
    default: TITLE,
    template: "%s · Grillo Mailing",
  },
  description: DESCRIPTION,
  applicationName: "Grillo Mailing",
  openGraph: {
    type: "website",
    siteName: "Grillo Mailing",
    locale: "es_CL",
    url: "/",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      data-theme="light"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <head>
        {/*
          Aplica el tema guardado antes del primer paint. Sin esto la app
          arranca en light y salta a dark, que es el flash clásico. Corre
          inline en el <head> justamente para adelantarse al render.
        */}
        <InlineScript
          html={`(function(){try{var t=localStorage.getItem('grillo-theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}})();`}
        />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}

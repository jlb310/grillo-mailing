import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://correo.grillo.click"),
  title: "Grillo Mailing",
  description: "Plataforma de email marketing de Grillo: campañas, contactos y métricas en un solo lugar.",
  icons: {
    icon: [{ url: "/grillo-mark.png", sizes: "256x256", type: "image/png" }],
    apple: [{ url: "/grillo-mark.png", sizes: "256x256" }],
  },
  openGraph: {
    title: "Grillo Mailing",
    description: "Plataforma de email marketing de Grillo: campañas, contactos y métricas en un solo lugar.",
    url: "https://correo.grillo.click",
    siteName: "Grillo Mailing",
    locale: "es_CL",
    type: "website",
    images: [{ url: "/grillo-mark.png", width: 256, height: 256, alt: "Grillo" }],
  },
  twitter: {
    card: "summary",
    title: "Grillo Mailing",
    description: "Plataforma de email marketing de Grillo: campañas, contactos y métricas en un solo lugar.",
    images: ["/grillo-mark.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geist.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}

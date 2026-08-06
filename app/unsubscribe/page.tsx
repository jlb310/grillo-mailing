import { Suspense } from "react";
import { redirect } from "next/navigation";
import { GrilloMark } from "@/components/grillo-logo";

function UnsubscribePage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  return (
    <Suspense>
      <UnsubscribeContent searchParams={searchParams} />
    </Suspense>
  );
}

async function UnsubscribeContent({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const params = await searchParams;

  if (!params.ok && !params.error) redirect("/");

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#fafbf5", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-sans), Arial, sans-serif" }}>
      <div style={{ backgroundColor: "#ffffff", borderRadius: "16px", padding: "48px 40px", maxWidth: "480px", width: "100%", textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", border: "1px solid #dddfd7" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", marginBottom: "32px", color: "#020802" }}>
          <GrilloMark size={30} />
          <span style={{ fontWeight: 700, fontSize: "20px", letterSpacing: "-0.03em" }}>Grillo</span>
        </div>

        {params.ok ? (
          <>
            <div style={{ width: "56px", height: "56px", backgroundColor: "#daefd6", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#207029" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h1 style={{ fontSize: "20px", fontWeight: "bold", color: "#1f2937", margin: "0 0 12px" }}>Te has dado de baja</h1>
            <p style={{ fontSize: "14px", color: "#6b7280", lineHeight: "1.6", margin: "0" }}>
              Tu dirección de correo ha sido removida de nuestra lista de envíos. No recibirás más comunicaciones por este medio.
            </p>
          </>
        ) : (
          <>
            <div style={{ width: "56px", height: "56px", backgroundColor: "#fef2f2", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h1 style={{ fontSize: "20px", fontWeight: "bold", color: "#1f2937", margin: "0 0 12px" }}>Enlace inválido</h1>
            <p style={{ fontSize: "14px", color: "#6b7280", lineHeight: "1.6", margin: "0" }}>
              El enlace de baja no es válido o ya fue utilizado. Si crees que es un error, contáctanos en <a href="mailto:hola@grillo.click" style={{ color: "#207029" }}>hola@grillo.click</a>.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default UnsubscribePage;

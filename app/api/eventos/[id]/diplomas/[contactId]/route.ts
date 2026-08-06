import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generatePdf } from "@/lib/pdf";
import { BASE_URL } from "@/lib/base-url";

// ── Image assets (absolute URLs so puppeteer can load them) ─────────────────
const GRILLO_MARK  = `${BASE_URL}/grillo-mark.png`;

const MONTHS_ES = [
  "enero","febrero","marzo","abril","mayo","junio",
  "julio","agosto","septiembre","octubre","noviembre","diciembre",
];

function formatDateEs(date: Date): string {
  const d = date.getDate();
  const m = MONTHS_ES[date.getMonth()];
  const y = date.getFullYear();
  return `${d} de ${m} de ${y}`;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildDiplomaHtml(opts: {
  contactName: string;
  eventTitle: string;
  eventDate: Date;
  horasLectivas: number;
  firmante?: string | null;
  firmanteTitle?: string | null;
}): string {
  const { contactName, eventTitle, eventDate, horasLectivas, firmante, firmanteTitle } = opts;
  const dateStr = formatDateEs(eventDate);

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<style>
  @page { size: A4 portrait; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    width: 210mm;
    min-height: 297mm;
    padding: 14mm 18mm 10mm;
    display: flex;
    flex-direction: column;
    background: #ffffff;
    color: #333333;
  }

  /* ── Header ─────────────────────────────── */
  .header {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 4mm;
    margin-bottom: 10mm;
  }
  .header img { height: 52px; display: block; }
  .header .wordmark {
    font-size: 20pt;
    font-weight: bold;
    color: #0f3a1d;
    letter-spacing: -0.5px;
  }

  /* ── Body ───────────────────────────────── */
  .body {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .event-title {
    font-size: 19pt;
    font-weight: bold;
    color: #333333;
    text-align: center;
    text-transform: uppercase;
    line-height: 1.3;
    margin-bottom: 5mm;
  }
  .event-date {
    font-size: 11.5pt;
    font-weight: bold;
    text-align: center;
    color: #333333;
    margin-bottom: 4mm;
  }
  .sep {
    width: 100%;
    border: none;
    border-top: 2px solid #207029;
    margin-bottom: 7mm;
  }
  .certifica {
    font-size: 10.5pt;
    color: #555555;
    text-align: center;
    margin-bottom: 5mm;
  }
  .recipient {
    font-size: 22pt;
    font-weight: bold;
    color: #222222;
    text-align: center;
    text-transform: uppercase;
    margin-bottom: 5mm;
    letter-spacing: 0.5px;
  }
  .rol-label {
    font-size: 10.5pt;
    color: #555555;
    text-align: center;
    margin-bottom: 3mm;
  }
  .rol-value {
    font-size: 12pt;
    color: #444444;
    text-align: center;
    font-style: italic;
  }

  /* ── Signatures ─────────────────────────── */
  .signatures {
    display: flex;
    justify-content: space-around;
    align-items: flex-end;
    width: 100%;
    margin-top: auto;
    padding-top: 8mm;
    margin-bottom: 7mm;
  }
  .sig-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 44%;
  }
  .sig-block img {
    height: 22mm;
    max-width: 60mm;
    display: block;
    margin-bottom: 2mm;
    object-fit: contain;
  }
  .sig-name {
    font-size: 10pt;
    font-weight: bold;
    color: #222222;
    text-align: center;
    margin-bottom: 1.5mm;
  }
  .sig-title {
    font-size: 8.5pt;
    color: #555555;
    text-align: center;
    line-height: 1.4;
  }

  /* ── Footer ─────────────────────────────── */
  .footer-sep {
    width: 100%;
    border: none;
    border-top: 2px solid #207029;
    margin-bottom: 3mm;
  }
  .horas {
    font-size: 9.5pt;
    color: #555555;
    text-align: center;
  }
</style>
</head>
<body>

  <!-- Header -->
  <div class="header">
    <img src="${GRILLO_MARK}" alt="Grillo" />
    <span class="wordmark">Grillo</span>
  </div>

  <!-- Body -->
  <div class="body">
    <div class="event-title">${eventTitle}</div>
    <div class="event-date">${dateStr}</div>
    <hr class="sep" />
    <div class="certifica">Se otorga el presente certificado a:</div>
    <div class="recipient">${contactName}</div>
    <div class="rol-label">Quien ha participado como:</div>
    <div class="rol-value">Asistente</div>
  </div>

  <!-- Signature (opcional, se configura por evento) -->
  ${firmante ? `
  <div class="signatures">
    <div class="sig-block">
      <div class="sig-name">${firmante}</div>
      ${firmanteTitle ? `<div class="sig-title">${firmanteTitle}</div>` : ""}
    </div>
  </div>` : ""}

  <!-- Footer -->
  <hr class="footer-sep" />
  <div class="horas">Horas lectivas: &nbsp;${horasLectivas}</div>

</body>
</html>`;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId, contactId } = await params;

  const [contact, event] = await Promise.all([
    prisma.contact.findFirst({ where: { id: contactId, eventId } }),
    prisma.event.findUnique({ where: { id: eventId } }),
  ]);

  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  if (!event)   return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const html = buildDiplomaHtml({
    contactName: contact.name,
    eventTitle: event.title,
    eventDate: event.date,
    horasLectivas: event.horasLectivas,
    firmante: event.firmante,
    firmanteTitle: event.firmanteTitle,
  });

  const pdfBuffer = await generatePdf(html, { landscape: false });
  const filename = `diploma-${slugify(contact.name)}.pdf`;

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

// Landscape A4 certificate (diploma) HTML, rendered to PDF via lib/pdf.ts.
// Content is fully driven by the uploaded CSV row (activity title, date,
// recipient name, role, hours). Branding: Grillo (grillo.click).

import { BASE_URL } from "@/lib/base-url";

const GRILLO_MARK = `${BASE_URL}/grillo-mark.png`;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Branded HTML email body that carries the certificate PDF: dark header band
// with the Grillo mark, the message, and a closing bar. Table-based + inline
// styles for Outlook. All interpolated values are escaped (CSV-supplied data).
const EMAIL_DARK = "#070d08";
const LINKEDIN_BLUE = "#0a66c2";

// Organization name as it appears on LinkedIn (so "Add to profile" resolves to
// the correct company page). Configurable per deployment.
const LINKEDIN_ORG = process.env.LINKEDIN_ORG_NAME ?? "Grillo";

const MESES: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10,
  noviembre: 11, diciembre: 12,
};

// Extracts issue month/year from the free-text Spanish date (e.g.
// "23 de junio de 2026"). Both are optional in the LinkedIn URL, so anything we
// fail to parse is simply omitted.
function parseIssueDate(activityDate: string): { year?: number; month?: number } {
  const lower = activityDate.toLowerCase();
  const yearMatch = lower.match(/\b(20\d{2})\b/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : undefined;
  let month: number | undefined;
  for (const [name, num] of Object.entries(MESES)) {
    if (lower.includes(name)) { month = num; break; }
  }
  return { year, month };
}

// LinkedIn "Add to profile" deep link: opens the member's Licenses &
// Certifications form pre-filled with this certificate. No public cert URL is
// required — name + organization + issue date are enough.
export function buildLinkedInAddUrl(data: CertificateEmailData): string {
  const params = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: data.activityTitle,
    organizationName: LINKEDIN_ORG,
  });
  const { year, month } = parseIssueDate(data.activityDate);
  if (year) params.set("issueYear", String(year));
  if (month) params.set("issueMonth", String(month));
  return `https://www.linkedin.com/profile/add?${params.toString()}`;
}

export interface CertificateEmailData {
  recipientName: string;
  activityTitle: string;
  activityDate: string;
  role: string;
}

export function buildCertificateEmailHtml(data: CertificateEmailData): string {
  const name = escapeHtml(data.recipientName);
  const title = escapeHtml(data.activityTitle);
  const date = escapeHtml(data.activityDate);
  const role = escapeHtml(data.role);
  const linkedinUrl = escapeHtml(buildLinkedInAddUrl(data));

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f4f4f4;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f4;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:8px;overflow:hidden;">

        <!-- Dark header band -->
        <tr>
          <td align="center" bgcolor="${EMAIL_DARK}" style="background:${EMAIL_DARK};padding:26px 24px;">
            <img src="${GRILLO_MARK}" alt="Grillo" height="48" width="48" style="display:block;height:48px;width:48px;border:0;" />
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px 16px;font-family:Arial,Helvetica,sans-serif;color:#444444;text-align:center;">
            <p style="font-size:16px;margin:0 0 22px;">Estimado(a) ${name},</p>
            <p style="font-size:15px;line-height:1.7;margin:0;">
              Tenemos el agrado de adjuntar su Certificado de ${role} por su participación en la
              <strong>${title}</strong>, realizada el ${date}.
            </p>
          </td>
        </tr>

        <!-- Sign-off -->
        <tr>
          <td style="padding:18px 40px 24px;font-family:Arial,Helvetica,sans-serif;color:#555555;text-align:center;font-size:14px;line-height:1.6;">
            Cordialmente,<br />
            El equipo de Grillo
          </td>
        </tr>

        <!-- Add to LinkedIn profile -->
        <tr>
          <td align="center" style="padding:0 40px 36px;font-family:Arial,Helvetica,sans-serif;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
              <td align="center" bgcolor="${LINKEDIN_BLUE}" style="background:${LINKEDIN_BLUE};border-radius:24px;">
                <a href="${linkedinUrl}" target="_blank" style="display:inline-block;padding:12px 26px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;">
                  Agregar a mi perfil de LinkedIn
                </a>
              </td>
            </tr></table>
            <p style="font-size:12px;color:#999999;margin:12px 0 0;">Suma este certificado a tu sección de Licencias y certificaciones.</p>
          </td>
        </tr>

        <!-- Dark closing bar -->
        <tr><td bgcolor="${EMAIL_DARK}" style="background:${EMAIL_DARK};height:8px;line-height:8px;font-size:8px;">&nbsp;</td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export interface CertificateData {
  recipientName: string;
  activityTitle: string;
  activityDate: string; // free-text, rendered verbatim (e.g. "4 de mayo de 2026")
  role: string;
  horas: number | string;
}

export function buildCertificateHtml(data: CertificateData): string {
  const recipientName = escapeHtml(data.recipientName);
  const activityTitle = escapeHtml(data.activityTitle);
  const activityDate  = escapeHtml(data.activityDate);
  const role          = escapeHtml(data.role);
  const horas         = escapeHtml(String(data.horas));

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<style>
  @page { size: A4 landscape; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    width: 297mm;
    min-height: 210mm;
    padding: 12mm 20mm 9mm;
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
    margin-bottom: 8mm;
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
    font-size: 26pt;
    font-weight: bold;
    color: #333333;
    text-align: center;
    text-transform: uppercase;
    line-height: 1.25;
    margin-bottom: 6mm;
  }
  .event-date {
    font-size: 13pt;
    font-weight: bold;
    text-align: center;
    color: #333333;
    margin-bottom: 5mm;
  }
  .sep {
    width: 65%;
    border: none;
    border-top: 2px solid #207029;
    margin-bottom: 7mm;
  }
  .certifica {
    font-size: 12pt;
    color: #555555;
    text-align: center;
    margin-bottom: 5mm;
  }
  .recipient {
    font-size: 26pt;
    font-weight: bold;
    color: #222222;
    text-align: center;
    margin-bottom: 5mm;
    letter-spacing: 0.5px;
  }
  .rol-label {
    font-size: 12pt;
    color: #555555;
    text-align: center;
    margin-bottom: 3mm;
  }
  .rol-value {
    font-size: 14pt;
    color: #444444;
    text-align: center;
  }

  /* ── Footer ─────────────────────────────── */
  .footer-sep {
    width: 100%;
    border: none;
    border-top: 2px solid #207029;
    margin-bottom: 3mm;
    margin-top: auto;
    padding-top: 8mm;
  }
  .horas {
    font-size: 10pt;
    color: #555555;
    text-align: center;
  }
</style>
</head>
<body>

  <div class="header">
    <img src="${GRILLO_MARK}" alt="Grillo" />
    <span class="wordmark">Grillo</span>
  </div>

  <div class="body">
    <div class="event-title">${activityTitle}</div>
    <div class="event-date">${activityDate}</div>
    <hr class="sep" />
    <div class="certifica">Se otorga el presente certificado a:</div>
    <div class="recipient">${recipientName}</div>
    <div class="rol-label">Quien ha participado como:</div>
    <div class="rol-value">${role}</div>
  </div>

  <hr class="footer-sep" />
  <div class="horas">Horas lectivas: &nbsp;${horas}</div>

</body>
</html>`;
}

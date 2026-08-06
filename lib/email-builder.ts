import { BASE_URL } from "./base-url";

export interface CtaButton {
  id: string;
  text: string;
  url: string;
  color: string;
}

// Kept for backward compatibility
export type BlockType = "text" | "image" | "button" | "divider" | "spacer";
export interface EmailBlock {
  id: string;
  type: BlockType;
  content?: string;
  src?: string;
  alt?: string;
  width?: string;
  align?: "left" | "center" | "right";
  text?: string;
  url?: string;
  color?: string;
}

export interface EmailBuilderFields {
  logoUrl?: string;
  logoAlt?: string;
  logoHeight?: string;
  logoAlign?: "left" | "center" | "right";
  logoRightUrl?: string;
  logoRightHeight?: string;
  logoRight2Url?: string;
  logoRight2Height?: string;
  // Logo centrado entre el izquierdo y el derecho. NO es columna de Campaign:
  // solo afecta el htmlBody que se construye (mismo patrón que logoAlt).
  logoCenterUrl?: string;
  logoCenterHeight?: string;
  headerColor?: string;
  emailTitle?: string;
  emailSubtitle?: string;
  emailDate?: string;
  emailLocation?: string;
  emailBody?: string;
  ctaButtons?: CtaButton[];
  ctaText?: string;
  ctaUrl?: string;
  blocks?: EmailBlock[];
  footerText?: string;
  /** When true, prepend the Grillo corporate footer block above the standard footer. (Nombre del campo heredado.) */
  useAlemanaFooter?: boolean;
  /** When true, render date/location as round icon buttons (calendar + map pin) instead of the info box. */
  eventInfoButtons?: boolean;
  /** Free-text date shown next to a circular calendar icon (info-icons row). */
  iconDate?: string;
  /** Label for the circular document icon link, e.g. "Revisa el programa". */
  iconLinkText?: string;
  /** Destination of the circular document icon link. */
  iconLinkUrl?: string;
}

const DEFAULT_HEADER_COLOR = "#207029";
const DEFAULT_FOOTER = "Grillo Mailing — correo.grillo.click";
const DEFAULT_LOGO_TEXT = "Grillo";
const DEFAULT_LOGO_URL = `${BASE_URL}/grillo-mark.png`;
const DEFAULT_LOGO_RIGHT_URL = "";

// ── Grillo corporate footer ─────────────────────────────────────────────────
// Bloque verde oscuro (elementos blancos) sobre el footer estándar cuando
// fields.useAlemanaFooter está activo (nombre del campo heredado; hoy renderiza
// la marca Grillo). "cancelar tu suscripción" apunta al {{UNSUBSCRIBE_URL}}
// por destinatario (no hay centro de preferencias separado).
const EVENT_ICON_BASE = `${BASE_URL}/icons`;
const GRILLO_FOOTER_BG = "#070d08";
const GRILLO_LINKS = {
  site: "https://grillo.click",
  app: "https://app.grillo.click",
};

function renderGrilloFooter(): string {
  // Spacing between stacked rows uses td padding-top (not table margin-top,
  // which Outlook drops) so the title/links gap renders everywhere.
  return `
        <!-- Grillo corporate footer -->
        <tr>
          <td bgcolor="${GRILLO_FOOTER_BG}" style="padding:28px 32px;background-color:${GRILLO_FOOTER_BG};">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" valign="middle">
                  <img src="${BASE_URL}/grillo-mark.png" width="44" height="44" alt="Grillo" style="display:block;margin:0 auto;width:44px;height:44px;border:0;outline:none;text-decoration:none;" />
                  <div style="padding-top:10px;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;color:#f8f9f5;letter-spacing:-0.02em;">Grillo</div>
                </td>
              </tr>
            </table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td align="center" style="padding-top:20px;font-family:Arial,sans-serif;font-size:12px;color:#8a9288;line-height:1.7;">
                Este correo fue enviado con <strong style="font-weight:bold;color:#f8f9f5;">Grillo Mailing</strong> · <a href="${GRILLO_LINKS.site}" target="_blank" style="color:#89dd76;text-decoration:underline;">grillo.click</a><br /><br />
                Si ya no quieres recibir estos mensajes, puedes <a href="{{UNSUBSCRIBE_URL}}" target="_blank" style="color:#89dd76;text-decoration:underline;">cancelar tu suscripción</a>.
              </td></tr>
            </table>
          </td>
        </tr>`;
}

// Side-by-side circular brand-color icon badges (calendar + document). Each
// badge is a single self-contained PNG (white FontAwesome glyph on a #00A99D
// circle), so it renders identically in every email client — no SVG, no
// border-radius hacks. The date badge is display-only; the document badge links
// to iconLinkUrl. Each badge+text is a self-contained unit inside a 50%-width
// cell, so the units sit next to each other and a long date string wraps within
// its own half instead of pushing the document badge out of view. Only emitted
// when at least one of the fields is set, so older campaigns (which never had
// these fields) are unaffected.
function renderInfoIcons(fields: EmailBuilderFields): string {
  const hasDate = !!fields.iconDate;
  const hasLink = !!(fields.iconLinkText && fields.iconLinkUrl);
  if (!hasDate && !hasLink) return "";

  const textStyle = `font-family:Arial,sans-serif;font-size:15px;color:${DEFAULT_HEADER_COLOR};line-height:1.4;font-weight:bold;`;
  const badge = (file: string, alt: string) =>
    `<img src="${EVENT_ICON_BASE}/${file}" width="48" height="48" alt="${escapeAttr(alt)}" style="display:block;width:48px;height:48px;border:0;outline:none;text-decoration:none;" />`;
  // When both badges are shown they split the row in half; a lone badge sizes to
  // its content.
  const colWidth = hasDate && hasLink ? ` width="50%"` : "";
  const unit = (iconCell: string, textCell: string) =>
    `<td valign="middle" align="center"${colWidth} style="padding:0 8px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr>
          <td valign="middle" width="48" style="padding-right:12px;">${iconCell}</td>
          <td valign="middle" style="${textStyle}">${textCell}</td>
        </tr></table>
      </td>`;

  const units: string[] = [];
  if (hasDate) {
    units.push(unit(badge("circle-calendar.png", "Fecha"), escapeHtml(fields.iconDate!)));
  }
  if (hasLink) {
    const href = safeHref(fields.iconLinkUrl!);
    const label = escapeHtml(fields.iconLinkText!);
    units.push(unit(
      `<a href="${href}" target="_blank" style="text-decoration:none;">${badge("circle-file.png", fields.iconLinkText!)}</a>`,
      `<a href="${href}" target="_blank" style="color:${DEFAULT_HEADER_COLOR};text-decoration:underline;font-weight:bold;">${label}</a>`,
    ));
  }

  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0 24px;">
  <tr>
    ${units.join("")}
  </tr>
</table>`;
}

// Escape a value for safe interpolation into an HTML attribute (notably the
// `&` in URL query strings, which is otherwise invalid HTML and can truncate
// hrefs in stricter parsers).
function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Escape a value for safe interpolation into HTML text content.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Allow only http/https/mailto hrefs; anything else (notably javascript:) is
// neutralised to "#" to prevent script injection via the link field.
function safeHref(url: string): string {
  try {
    const u = new URL(url);
    if (u.protocol === "https:" || u.protocol === "http:" || u.protocol === "mailto:") {
      return escapeAttr(url);
    }
  } catch {
    /* not an absolute URL — fall through */
  }
  return "#";
}

// Forward-safe button: plain <td bgcolor> + padded <a>, NO VML and NO mso
// conditional comments. Outlook renders and re-serializes this as real HTML, so
// the link survives when the email is forwarded from Outlook (the previous VML
// roundrect was stripped on forward, leaving no clickable link). Rounded corners
// via border-radius degrade to square corners in desktop Outlook only.
export function renderButton(text: string, url: string, color: string): string {
  const href = escapeAttr(url);
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:12px auto;">
  <tr>
    <td align="center" bgcolor="${color}" style="border-radius:999px;mso-padding-alt:13px 32px;">
      <a href="${href}" target="_blank"
        style="display:inline-block;padding:13px 32px;background:${color};color:#ffffff;text-decoration:none;border-radius:999px;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;"><span style="color:#ffffff;text-decoration:none;">${text}</span></a>
    </td>
  </tr>
</table>`;
}

// Inline styles for TipTap-generated HTML tags so Outlook renders them correctly
// Images: width="536" = 600px container minus 32px padding each side
function normalizeBodyHtml(html: string): string {
  return html
    .replace(/<h2/g, '<h2 style="font-family:Arial,sans-serif;font-size:20px;font-weight:bold;color:#1f2937;margin:24px 0 8px;"')
    .replace(/<h3/g, '<h3 style="font-family:Arial,sans-serif;font-size:17px;font-weight:bold;color:#374151;margin:20px 0 6px;"')
    .replace(/<p/g,  '<p style="font-family:Arial,sans-serif;font-size:15px;color:#333333;line-height:1.7;margin:0 0 14px;"')
    .replace(/<ul/g, '<ul style="font-family:Arial,sans-serif;font-size:15px;color:#333333;line-height:1.7;margin:0 0 14px;padding-left:20px;"')
    .replace(/<ol/g, '<ol style="font-family:Arial,sans-serif;font-size:15px;color:#333333;line-height:1.7;margin:0 0 14px;padding-left:20px;"')
    .replace(/<li/g, '<li style="margin-bottom:4px;"')
    .replace(/<strong/g, '<strong style="font-weight:bold;"')
    .replace(/<em/g,     '<em style="font-style:italic;"')
    .replace(/<u>/g,     '<u style="text-decoration:underline;">')
    .replace(/<img /g,   '<img width="536" style="display:block;width:100%;max-width:536px;height:auto;" ');
}

export function buildEmailHtml(fields: EmailBuilderFields): string {
  const headerColor     = fields.headerColor    ?? DEFAULT_HEADER_COLOR;
  const footerText      = fields.footerText     ?? DEFAULT_FOOTER;
  const logoUrl         = fields.logoUrl        || DEFAULT_LOGO_URL;
  const logoHeight      = parseInt(fields.logoHeight ?? "48");
  const logoAlign       = fields.logoAlign      ?? "left";
  const tdAlign         = logoAlign === "center" ? "center" : logoAlign === "right" ? "right" : "left";
  const logoRightUrl    = fields.logoRightUrl   || DEFAULT_LOGO_RIGHT_URL;
  const logoRightHeight = parseInt(fields.logoRightHeight ?? "48");
  const logoRight2Url    = fields.logoRight2Url || "";
  const logoRight2Height = parseInt(fields.logoRight2Height ?? "48");
  const logoCenterUrl    = fields.logoCenterUrl || "";
  const logoCenterHeight = parseInt(fields.logoCenterHeight ?? "48");

  // ── Header — left logo + 1 or 2 logos on the right (opcionales) ──────────
  const rightLogos = !logoRightUrl
    ? ""
    : logoRight2Url
    ? `<img src="${logoRightUrl}" alt="" height="${logoRightHeight}" style="display:inline-block;height:${logoRightHeight}px;max-height:${logoRightHeight}px;border:0;outline:none;text-decoration:none;vertical-align:top;" /><span style="display:inline-block;width:12px;">&nbsp;</span><img src="${logoRight2Url}" alt="" height="${logoRight2Height}" style="display:inline-block;height:${logoRight2Height}px;max-height:${logoRight2Height}px;border:0;outline:none;text-decoration:none;vertical-align:top;" />`
    : `<img src="${logoRightUrl}" alt="" height="${logoRightHeight}" style="display:inline-block;height:${logoRightHeight}px;max-height:${logoRightHeight}px;border:0;outline:none;text-decoration:none;vertical-align:top;" />`;

  // Celda central opcional entre ambos logos; con widths fijos para que el
  // logo del medio quede realmente centrado y no dependa del ancho de los otros.
  const centerCell = logoCenterUrl
    ? `
    <td align="center" valign="top" width="34%">
      <img src="${logoCenterUrl}" alt="" height="${logoCenterHeight}" style="display:inline-block;height:${logoCenterHeight}px;max-height:${logoCenterHeight}px;border:0;outline:none;text-decoration:none;vertical-align:top;" />
    </td>`
    : "";
  const sideWidth = logoCenterUrl ? ` width="33%"` : "";

  const headerContent = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="left" valign="top"${sideWidth}>
      <img src="${logoUrl}" alt="${fields.logoAlt ?? DEFAULT_LOGO_TEXT}" height="${logoHeight}" style="display:inline-block;height:${logoHeight}px;max-height:${logoHeight}px;border:0;outline:none;text-decoration:none;vertical-align:top;" />
    </td>${centerCell}
    <td align="right" valign="top"${sideWidth}>
      ${rightLogos}
    </td>
  </tr>
</table>`;

  // ── Body ─────────────────────────────────────────────────────────────────
  let bodyHtml = "";

  if (fields.emailSubtitle)
    bodyHtml += `<p style="font-family:Arial,sans-serif;font-size:16px;color:#555555;margin:0 0 20px;">${fields.emailSubtitle}</p>`;

  if (fields.emailDate || fields.emailLocation) {
    if (fields.eventInfoButtons) {
      // Round icon buttons (calendar = date, map pin = location), icon on top
      // and text below, shown side by side. Display-only (no links).
      const infoBtn = (icon: string, label: string, value: string) =>
        `<td align="center" valign="top" style="padding:0 10px;">
          <img src="${EVENT_ICON_BASE}/${icon}" width="64" height="64" alt="${label}" style="display:block;margin:0 auto 8px;width:64px;height:64px;border:0;outline:none;text-decoration:none;" />
          <div style="font-family:Arial,sans-serif;font-size:14px;color:#333333;line-height:1.5;">${value}</div>
        </td>`;
      const cells = [
        fields.emailDate ? infoBtn("btn-fecha.png", "Fecha", fields.emailDate) : "",
        fields.emailLocation ? infoBtn("btn-lugar.png", "Lugar", fields.emailLocation) : "",
      ].filter(Boolean);
      bodyHtml += `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:24px;">
  <tr>
    ${cells.join("")}
  </tr>
</table>`;
    } else {
      bodyHtml += `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:24px;">
  <tr>
    <td style="background:#eef4ea;border-left:4px solid ${headerColor};padding:12px 16px;border-radius:4px;">
      ${fields.emailDate     ? `<p style="font-family:Arial,sans-serif;font-size:14px;color:#333333;margin:4px 0;">&#128197; <strong>Fecha:</strong> ${fields.emailDate}</p>` : ""}
      ${fields.emailLocation ? `<p style="font-family:Arial,sans-serif;font-size:14px;color:#333333;margin:4px 0;">&#128205; <strong>Lugar:</strong> ${fields.emailLocation}</p>` : ""}
    </td>
  </tr>
</table>`;
    }
  }

  if (fields.emailBody)
    bodyHtml += normalizeBodyHtml(fields.emailBody);

  // Circular calendar + document icon badges — rendered after the graphic/body
  // and before the CTA button: gráfica → iconos con información → inscripción.
  bodyHtml += renderInfoIcons(fields);

  // CTA buttons
  const buttons: { text: string; url: string; color: string }[] = [];
  if (fields.ctaButtons && fields.ctaButtons.length > 0) {
    buttons.push(...fields.ctaButtons);
  } else if (fields.ctaText && fields.ctaUrl) {
    buttons.push({ text: fields.ctaText, url: fields.ctaUrl, color: headerColor });
  } else if (fields.blocks) {
    for (const b of fields.blocks) {
      if (b.type === "button" && b.text && b.url)
        buttons.push({ text: b.text, url: b.url, color: b.color ?? headerColor });
      if (b.type === "text" && b.content)
        bodyHtml += normalizeBodyHtml(b.content);
    }
  }

  const buttonsHtml = buttons.length > 0
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:28px;"><tr><td align="center" style="padding-top:19px;padding-bottom:4px;">${buttons.map((b) => renderButton(b.text, b.url, b.color)).join('<div style="line-height:10px;font-size:10px;">&nbsp;</div>')}</td></tr></table>`
    : "";

  // ── Full template ─────────────────────────────────────────────────────────
  return `<!DOCTYPE html>
<html lang="es" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
    img { -ms-interpolation-mode:bicubic; border:0; outline:none; text-decoration:none; }
    body { margin:0 !important; padding:0 !important; background-color:#f4f4f4; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f4">
  <tr>
    <td align="center" bgcolor="#f4f4f4" style="padding:20px 10px;background-color:#f4f4f4;">

      <!--[if (gte mso 9)|(IE)]><table width="600" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->

      <!-- Container -->
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="max-width:600px;width:100%;background-color:#ffffff;">

        <!-- Header — always white; the brand green (headerColor) is used for CTA buttons, not the header bg -->
        <tr>
          <td bgcolor="#ffffff" style="padding-top:14px;padding-bottom:14px;padding-left:32px;padding-right:32px;background-color:#ffffff;border-bottom:1px solid #eeeeee;">
            ${headerContent}
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td bgcolor="#ffffff" style="padding:32px;background-color:#ffffff;">
            ${bodyHtml}
            ${buttonsHtml}
          </td>
        </tr>

        ${fields.useAlemanaFooter === false ? "" : renderGrilloFooter()}

        <!-- Footer -->
        <tr>
          <td align="center" bgcolor="#f9f9f9" style="padding-top:20px;padding-bottom:16px;padding-left:32px;padding-right:32px;background-color:#f9f9f9;border-top:1px solid #eeeeee;">
            <img src="${logoUrl}" alt="${fields.logoAlt ?? DEFAULT_LOGO_TEXT}" height="28" width="auto" style="display:block;margin:0 auto 10px;height:28px;border:0;outline:none;text-decoration:none;" />
            <p style="font-family:Arial,sans-serif;font-size:12px;color:#999999;line-height:1.5;margin:0 0 10px;">${footerText}</p>
            <p style="font-family:Arial,sans-serif;font-size:10px;color:#cccccc;margin:0 0 8px;">Enviado con <a href="https://grillo.click" target="_blank" style="color:#cccccc;text-decoration:underline;font-family:Arial,sans-serif;font-size:10px;">Grillo Mailing</a>.</p>
            <p style="font-family:Arial,sans-serif;font-size:11px;color:#bbbbbb;line-height:1.6;margin:0;">
              <a href="https://grillo.click" style="color:#bbbbbb;text-decoration:underline;font-family:Arial,sans-serif;font-size:11px;" target="_blank">Políticas de privacidad</a>
              &nbsp;&nbsp;·&nbsp;&nbsp;
              <a href="{{UNSUBSCRIBE_URL}}" style="color:#bbbbbb;text-decoration:underline;font-family:Arial,sans-serif;font-size:11px;" target="_blank">Darse de baja</a>
              &nbsp;&nbsp;·&nbsp;&nbsp;
              <a href="{{VIEW_URL}}" style="color:#bbbbbb;text-decoration:underline;font-family:Arial,sans-serif;font-size:11px;" target="_blank">Ver en el navegador</a>
            </p>
          </td>
        </tr>

      </table>
      <!-- /Container -->

      <!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->

    </td>
  </tr>
</table>

</body>
</html>`;
}

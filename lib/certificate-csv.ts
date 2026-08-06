import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";
import { isValidEmail } from "@/lib/csv";

// Parses the self-contained certificate CSV/XLSX. Expected columns (header
// matching is accent-insensitive and fuzzy, like lib/csv.ts):
//   NOMBRE RECEPTOR, EMAIL, CATEGORÍA PARTICIPACIÓN, HORAS ACADÉMICAS,
//   TÍTULO DE LA ACTIVIDAD (or TITULO), FECHA
export interface CertificateRow {
  recipientName: string;
  recipientEmail: string;
  role: string;
  horas: number;
  activityTitle: string;
  activityDate: string;
  /** false when the email is missing/malformed — kept for the preview, not generated. */
  valid: boolean;
}

export interface ParsedCertificates {
  rows: CertificateRow[];
  /** Most common activity title across valid rows — used as the default batch name. */
  suggestedName: string;
}

function normalizeKey(key: string): string {
  return key.normalize("NFD").replace(/[^\x00-\x7f]/g, "").toLowerCase().trim();
}

function pickField(row: Record<string, string>, needles: string[]): string {
  for (const [key, value] of Object.entries(row)) {
    const norm = normalizeKey(key);
    if (needles.some((n) => norm.includes(n))) {
      const v = (value ?? "").toString().trim();
      if (v) return v;
    }
  }
  return "";
}

function normalizeRows(records: Record<string, string>[]): ParsedCertificates {
  const rows: CertificateRow[] = [];
  const titleCounts = new Map<string, number>();

  for (const r of records) {
    const recipientName = pickField(r, ["nombre receptor", "receptor", "nombre", "name"]);
    const recipientEmail = pickField(r, ["email", "mail", "correo"]).toLowerCase();

    // Skip fully blank rows (no name and no email).
    if (!recipientName && !recipientEmail) continue;

    const role = pickField(r, ["categoria", "participacion", "rol", "role"]) || "Asistente";
    const horasRaw = pickField(r, ["horas"]);
    const horas = parseInt(horasRaw.replace(/[^0-9]/g, ""), 10) || 0;
    // Prefer the display title ("TÍTULO DE LA ACTIVIDAD") but fall back to "TITULO".
    const activityTitle =
      pickField(r, ["titulo de la actividad", "actividad", "titulo", "title", "evento"]);
    const activityDate = pickField(r, ["fecha", "date"]);

    if (activityTitle) titleCounts.set(activityTitle, (titleCounts.get(activityTitle) ?? 0) + 1);

    rows.push({
      recipientName: recipientName || recipientEmail.split("@")[0],
      recipientEmail,
      role,
      horas,
      activityTitle,
      activityDate,
      valid: isValidEmail(recipientEmail),
    });
  }

  let suggestedName = "";
  let max = 0;
  for (const [title, count] of titleCounts) {
    if (count > max) { max = count; suggestedName = title; }
  }

  return { rows, suggestedName };
}

export function parseCertificates(buffer: Buffer, filename: string): ParsedCertificates {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "xlsx" || ext === "xls") {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const records = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });
    return normalizeRows(records);
  }
  const records = parse(buffer, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[];
  return normalizeRows(records);
}

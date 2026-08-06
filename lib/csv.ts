import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";

export interface ContactRow {
  email: string;
  name: string;
}

export interface ParsedContacts {
  contacts: ContactRow[];
  /** Rows that had an email value but it was malformed / non-ASCII (blank rows are not counted). */
  invalid: number;
}

/**
 * Mirrors (slightly stricter than) the validation applied at send time in
 * lib/send-campaign.ts: ASCII only + basic addr-spec shape. Keeping import in
 * sync with send means malformed rows never reach the contact list, so the
 * send log stays clean and the imported count is honest.
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  if (!/^[\x20-\x7E]+$/.test(email)) return false; // ASCII only (Resend rejects non-ASCII)
  return /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/.test(email);
}

function normalizeKey(key: string): string {
  // Lowercase + strip accents so "Correo Electrónico", "CORREO", "E-mail" etc.
  // all resolve the same way regardless of header styling.
  // NFD splits accented letters into base + combining mark; dropping every
  // non-ASCII codepoint then leaves the plain base letters ("ó" -> "o").
  return key.normalize("NFD").replace(/[^\x00-\x7f]/g, "").toLowerCase().trim();
}

/**
 * Pick a column value by fuzzy header matching: the first column whose
 * normalized name contains any of the given needles. This tolerates real-world
 * headers like "Correo Electrónico", "E-mail", or "Nombre completo" instead of
 * requiring an exact "email"/"correo" column.
 */
function pickField(row: Record<string, string>, needles: string[]): string {
  for (const [key, value] of Object.entries(row)) {
    const norm = normalizeKey(key);
    if (needles.some((n) => norm.includes(n))) {
      const v = (value ?? "").trim();
      if (v) return v;
    }
  }
  return "";
}

function normalizeRows(records: Record<string, string>[]): ParsedContacts {
  const contacts: ContactRow[] = [];
  let invalid = 0;

  for (const r of records) {
    const email = pickField(r, ["email", "mail", "correo"]).toLowerCase().trim();

    if (!email) continue; // blank row — not counted as invalid

    if (!isValidEmail(email)) {
      invalid++;
      continue;
    }

    const name = pickField(r, ["nombre", "name"]) || email.split("@")[0];

    contacts.push({ email, name });
  }

  return { contacts, invalid };
}

export function parseContactsCsv(buffer: Buffer): ParsedContacts {
  const records = parse(buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  return normalizeRows(records);
}

export function parseContactsExcel(buffer: Buffer): ParsedContacts {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  // Use first sheet
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const records = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });
  return normalizeRows(records);
}

export function parseContacts(buffer: Buffer, filename: string): ParsedContacts {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "xlsx" || ext === "xls") return parseContactsExcel(buffer);
  return parseContactsCsv(buffer);
}

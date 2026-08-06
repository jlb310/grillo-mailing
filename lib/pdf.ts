import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import type { Browser } from "puppeteer-core";

// Flags required to run Chromium inside a container (no sandbox, small /dev/shm).
const PROD_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
];

// Resolve the system Chromium installed by the Docker image (Alpine's package).
// The binary name varies across Alpine releases, so probe the known paths and
// allow an explicit override via PUPPETEER_EXECUTABLE_PATH.
function prodChromiumPath(): string {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean) as string[];
  return candidates.find((p) => existsSync(p)) ?? candidates[candidates.length - 1];
}

// Launch a browser: system Chromium in prod, bundled puppeteer Chromium in dev.
async function launchBrowser(): Promise<Browser> {
  if (process.env.NODE_ENV === "production") {
    const puppeteer = await import("puppeteer-core");
    return puppeteer.default.launch({
      args: PROD_ARGS,
      executablePath: prodChromiumPath(),
      headless: true,
    }) as unknown as Promise<Browser>;
  }
  const puppeteer = await import("puppeteer");
  return puppeteer.default.launch({ headless: true }) as unknown as Promise<Browser>;
}

export async function generatePdf(html: string, opts?: { landscape?: boolean }): Promise<Buffer> {
  const pdfOpts = { format: "A4" as const, landscape: opts?.landscape ?? false, printBackground: true };
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf(pdfOpts);
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

// Render many HTML documents to PDF reusing a SINGLE browser instance. Launching
// Chromium once per document (as generatePdf does) is far too slow for a batch of
// hundreds of certificates, so the batch path amortizes the launch cost. Each
// item is mapped via `render` so callers keep their own ids alongside the result.
export async function generatePdfBatch<T>(
  items: T[],
  render: (item: T) => string,
  opts?: { landscape?: boolean }
): Promise<{ item: T; pdf: Buffer | null; error?: string }[]> {
  const pdfOpts = { format: "A4" as const, landscape: opts?.landscape ?? false, printBackground: true };
  const browser = await launchBrowser();

  const results: { item: T; pdf: Buffer | null; error?: string }[] = [];
  try {
    for (const item of items) {
      try {
        const page = await browser.newPage();
        await page.setContent(render(item), { waitUntil: "load" });
        const pdf = await page.pdf(pdfOpts);
        await page.close();
        results.push({ item, pdf: Buffer.from(pdf) });
      } catch (err) {
        results.push({ item, pdf: null, error: err instanceof Error ? err.message : String(err) });
      }
    }
  } finally {
    await browser.close();
  }
  return results;
}

export async function savePdf(buffer: Buffer, certId: string): Promise<string> {
  const dir = process.env.CERTIFICATES_PATH ?? "./public/certificates";
  await fs.mkdir(dir, { recursive: true });
  const filename = `${certId}.pdf`;
  const filepath = path.join(dir, filename);
  await fs.writeFile(filepath, buffer);
  return filepath;
}

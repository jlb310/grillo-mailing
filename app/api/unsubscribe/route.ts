import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { BASE_URL } from "@/lib/base-url";

function redirectTo(sub: string): NextResponse {
  // Redirect against the public BASE_URL, not req.url: behind Dokploy's proxy
  // the Host header is lost and req.url resolves to the container (0.0.0.0:3000).
  const url = new URL(`/unsubscribe${sub}`, `${BASE_URL}/`);
  return NextResponse.redirect(url, 302);
}

// Marks the contact behind `token` as unsubscribed. Returns false when the
// token is missing, unreadable or points at a send that no longer exists.
//
// The token is the sendLog id encrypted with ENCRYPTION_KEY, so a leaked id
// alone (admin UI, logs) can't be used to unsubscribe someone else's contact.
async function unsubscribeByToken(token: string | null): Promise<boolean> {
  if (!token) return false;

  let logId: string;
  try {
    logId = decrypt(token);
  } catch {
    return false;
  }

  const log = await prisma.sendLog.findUnique({
    where: { id: logId },
    include: { contact: true },
  });
  if (!log) return false;

  await prisma.contact.update({
    where: { id: log.contactId },
    data: { unsubscribed: true },
  });
  return true;
}

// The link inside the email body: unsubscribes and shows the confirmation page.
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  const ok = await unsubscribeByToken(token);
  return redirectTo(ok ? "?ok=1" : "?error=1");
}

// One-click unsubscribe (RFC 8058). Gmail, Yahoo and Apple Mail POST here on
// their own when the reader uses the client's unsubscribe button, driven by the
// List-Unsubscribe-Post header we set in lib/send-campaign.ts.
//
// No redirect and no HTML: the caller is a machine that only reads the status
// code. It must also stay a POST — link scanners and prefetchers follow GETs,
// and a GET-driven one-click would let them unsubscribe people who never asked.
export async function POST(req: Request) {
  // The token normally rides in the URL, but the spec allows clients to send
  // the form body instead, so accept both rather than silently failing.
  let token = new URL(req.url).searchParams.get("token");
  if (!token) {
    try {
      const form = await req.formData();
      token = form.get("token")?.toString() ?? null;
    } catch {
      // No form body — the URL token (or nothing) is all we have.
    }
  }

  const ok = await unsubscribeByToken(token);
  if (!ok) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

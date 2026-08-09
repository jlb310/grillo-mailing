import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { BASE_URL } from "@/lib/base-url";

function redirectTo(sub: string, req: Request): NextResponse {
  // Redirect against the public BASE_URL, not req.url: behind Dokploy's proxy
  // the Host header is lost and req.url resolves to the container (0.0.0.0:3000).
  const url = new URL(`/unsubscribe${sub}`, `${BASE_URL}/`);
  return NextResponse.redirect(url, 302);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return redirectTo("?error=1", req);
  }

  // The token is the sendLog id encrypted with ENCRYPTION_KEY, so a leaked id
  // alone (admin UI, logs) can't be used to unsubscribe someone else's contact.
  let logId: string;
  try {
    logId = decrypt(token);
  } catch {
    return redirectTo("?error=1", req);
  }

  const log = await prisma.sendLog.findUnique({
    where: { id: logId },
    include: { contact: true },
  });

  if (!log) {
    return redirectTo("?error=1", req);
  }

  await prisma.contact.update({
    where: { id: log.contactId },
    data: { unsubscribed: true },
  });

  return redirectTo("?ok=1", req);
}

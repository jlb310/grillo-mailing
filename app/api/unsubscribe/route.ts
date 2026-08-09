import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/unsubscribe?error=1", req.url));
  }

  // The token is the sendLog id encrypted with ENCRYPTION_KEY, so a leaked id
  // alone (admin UI, logs) can't be used to unsubscribe someone else's contact.
  let logId: string;
  try {
    logId = decrypt(token);
  } catch {
    return NextResponse.redirect(new URL("/unsubscribe?error=1", req.url));
  }

  const log = await prisma.sendLog.findUnique({
    where: { id: logId },
    include: { contact: true },
  });

  if (!log) {
    return NextResponse.redirect(new URL("/unsubscribe?error=1", req.url));
  }

  await prisma.contact.update({
    where: { id: log.contactId },
    data: { unsubscribed: true },
  });

  return NextResponse.redirect(new URL("/unsubscribe?ok=1", req.url));
}

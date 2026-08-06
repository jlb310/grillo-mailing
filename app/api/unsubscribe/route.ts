import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/unsubscribe?error=1", req.url));
  }

  const log = await prisma.sendLog.findUnique({
    where: { id: token },
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

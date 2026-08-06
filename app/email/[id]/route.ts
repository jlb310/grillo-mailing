import { prisma } from "@/lib/prisma";
import { BASE_URL } from "@/lib/base-url";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = await prisma.campaign.findUnique({ where: { id } });

  if (!campaign) {
    return new Response("Email no encontrado", { status: 404 });
  }

  const html = campaign.htmlBody
    .replace(/\{\{UNSUBSCRIBE_URL\}\}/g, "#")
    .replace(/\{\{VIEW_URL\}\}/g, `${BASE_URL}/email/${id}`);

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

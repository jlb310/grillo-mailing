import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const surveyToken = await prisma.surveyToken.findUnique({
    where: { id: token },
    include: {
      survey: { include: { questions: { orderBy: { order: "asc" } } } },
      contact: { select: { name: true, email: true } },
    },
  });

  if (!surveyToken) return NextResponse.json({ error: "Token inválido" }, { status: 404 });
  if (surveyToken.completedAt) return NextResponse.json({ error: "Encuesta ya completada" }, { status: 410 });

  await prisma.surveyToken.update({ where: { id: token }, data: { usedAt: new Date() } });

  return NextResponse.json({
    survey: surveyToken.survey,
    contact: surveyToken.contact,
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const surveyToken = await prisma.surveyToken.findUnique({
    where: { id: token },
    include: { survey: { include: { event: true } }, contact: true },
  });

  if (!surveyToken) return NextResponse.json({ error: "Token inválido" }, { status: 404 });
  if (surveyToken.completedAt) return NextResponse.json({ error: "Ya completada" }, { status: 410 });

  const body = await req.json();
  const answers: { questionId: string; value: string }[] = body.answers;

  await prisma.$transaction(async (tx) => {
    await tx.answer.createMany({
      data: answers.map((a) => ({
        surveyTokenId: token,
        questionId: a.questionId,
        value: a.value,
      })),
    });

    await tx.surveyToken.update({
      where: { id: token },
      data: { completedAt: new Date() },
    });
  });

  return NextResponse.json({ ok: true });
}

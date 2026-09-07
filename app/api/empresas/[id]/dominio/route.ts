import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessEmpresa, isSuperAdmin } from "@/lib/empresa";
import { resolveEmpresaSender } from "@/lib/resend";
import { domainFromSender } from "@/lib/sender";

// Alta y verificación del dominio de envío de una empresa EN LA CUENTA QUE
// PAGA SUS ENVÍOS. Bajo el modelo de Grillo esa cuenta es la compartida: una
// sola suscripción de Resend con el dominio de cada cliente verificado dentro,
// de modo que las campañas salen desde el remitente del cliente. Una empresa
// que todavía paga su propia cuenta (API key propia) se administra igual, pero
// contra su cuenta — resolveEmpresaSender decide cuál es, igual que el envío.
//
// Sin esto el alta era manual: entrar al panel de Resend, agregar el dominio y
// copiar los DNS a mano. "Activar seguimiento" ni siquiera arranca hasta que el
// dominio existe y está verificado, así que este era el paso que impedía dar de
// alta un cliente entero desde la plataforma.

// El subdominio de seguimiento se pide DESDE LA CREACIÓN a propósito: Resend
// solo devuelve los registros Tracking/TrackingCAA cuando hay uno configurado.
// Creando el dominio sin él, el cliente tendría que tocar su DNS dos veces
// (SPF/DKIM primero, CNAME de seguimiento después de "Activar seguimiento").
// Pidiéndolo ahora, la primera respuesta ya trae TODOS los registros juntos.
const TRACKING_SUBDOMAIN = "links";

type RecordOut = {
  record: string;
  type: string;
  name: string;
  value: string;
  ttl?: string;
  priority?: number;
  status: string;
};

interface ResendRecord {
  record: string;
  type: string;
  name: string;
  value: string;
  ttl?: string;
  priority?: number;
  status: string;
}

function mapRecords(records: readonly ResendRecord[] | undefined): RecordOut[] {
  return (records ?? []).map((r) => ({
    record: r.record,
    type: r.type,
    name: r.name,
    value: r.value,
    ttl: r.ttl,
    priority: r.priority,
    status: r.status,
  }));
}

/** Empresa + el dominio que se deduce de su remitente, o un error listo para devolver. */
async function resolveTarget(id: string) {
  const empresa = await prisma.empresa.findUnique({ where: { id } });
  if (!empresa) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) } as const;
  }
  if (!empresa.resendFromEmail) {
    return {
      error: NextResponse.json(
        { error: "Falta el email del remitente: sin él no se sabe qué dominio dar de alta." },
        { status: 400 }
      ),
    } as const;
  }
  const domainName = domainFromSender(empresa.resendFromEmail);
  if (!domainName) {
    return {
      error: NextResponse.json(
        { error: `El email del remitente "${empresa.resendFromEmail}" no tiene dominio.` },
        { status: 400 }
      ),
    } as const;
  }

  const sender = resolveEmpresaSender(empresa);
  const sharedAccount = sender.apiKey === null;
  if (sharedAccount && !process.env.RESEND_API_KEY) {
    return {
      error: NextResponse.json(
        { error: "Esta empresa envía por la cuenta compartida de Grillo, pero falta RESEND_API_KEY en el entorno." },
        { status: 400 }
      ),
    } as const;
  }

  return {
    empresa,
    sender,
    sharedAccount,
    domainName,
    accountLabel: sharedAccount ? "la cuenta de Resend de Grillo" : "la cuenta propia de esta empresa",
  } as const;
}

// Estado del dominio en la cuenta de envío. Lo puede consultar el admin de la
// empresa (no solo el super admin) porque la salida son justamente los
// registros DNS que tiene que pasarle a quien administra su zona.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!(await canAccessEmpresa(id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const target = await resolveTarget(id);
  if ("error" in target) return target.error;
  const { sender, sharedAccount, domainName, accountLabel } = target;

  try {
    const list = await sender.resend.domains.list();
    const found = (list.data?.data ?? []).find((d) => d.name.toLowerCase() === domainName);
    if (!found) {
      return NextResponse.json({
        domainName,
        sharedAccount,
        accountLabel,
        found: false,
        status: null,
        openTracking: false,
        clickTracking: false,
        trackingSubdomain: null,
        records: [],
      });
    }

    const full = await sender.resend.domains.get(found.id);
    return NextResponse.json({
      domainName,
      sharedAccount,
      accountLabel,
      found: true,
      status: full.data?.status ?? found.status,
      openTracking: full.data?.open_tracking === true,
      clickTracking: full.data?.click_tracking === true,
      trackingSubdomain: full.data?.tracking_subdomain || null,
      records: mapRecords(full.data?.records as ResendRecord[] | undefined),
    });
  } catch (err) {
    console.error("[dominio] Error consultando Resend:", err);
    return NextResponse.json({ error: "No se pudo consultar Resend en este momento." }, { status: 502 });
  }
}

// Da de alta el dominio en la cuenta de envío. Solo el super admin: agrega un
// dominio a la cuenta que Grillo paga, y el cupo de dominios depende del plan.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSuperAdmin(session)) {
    return NextResponse.json({ error: "Solo el super admin puede dar de alta dominios" }, { status: 403 });
  }

  const { id } = await params;
  const target = await resolveTarget(id);
  if ("error" in target) return target.error;
  const { sender, sharedAccount, domainName, accountLabel } = target;

  const body = await req.json().catch(() => ({}));
  const region = typeof body.region === "string" && body.region.trim() ? body.region.trim() : undefined;

  try {
    // Idempotente: si alguien ya lo agregó por el panel de Resend, no lo
    // duplicamos — devolvemos el que hay con sus registros.
    const list = await sender.resend.domains.list();
    const existing = (list.data?.data ?? []).find((d) => d.name.toLowerCase() === domainName);
    if (existing) {
      const full = await sender.resend.domains.get(existing.id);
      return NextResponse.json({
        ok: true,
        alreadyExisted: true,
        domainName,
        sharedAccount,
        accountLabel,
        status: full.data?.status ?? existing.status,
        trackingSubdomain: full.data?.tracking_subdomain || null,
        records: mapRecords(full.data?.records as ResendRecord[] | undefined),
        steps: [`El dominio "${domainName}" ya estaba dado de alta en ${accountLabel}.`],
      });
    }

    const created = await sender.resend.domains.create({
      name: domainName,
      openTracking: true,
      clickTracking: true,
      trackingSubdomain: TRACKING_SUBDOMAIN,
      ...(region ? { region: region as "us-east-1" | "eu-west-1" | "sa-east-1" | "ap-northeast-1" } : {}),
    });

    if (created.error) {
      // El tope de dominios lo fija el plan de Resend, no la app: si se acabó,
      // decirlo tal cual en vez de dejar un 502 genérico.
      return NextResponse.json(
        { error: `Resend rechazó el alta del dominio: ${created.error.message}` },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      alreadyExisted: false,
      domainName,
      sharedAccount,
      accountLabel,
      status: created.data?.status ?? "pending",
      trackingSubdomain: created.data?.tracking_subdomain || TRACKING_SUBDOMAIN,
      records: mapRecords(created.data?.records as ResendRecord[] | undefined),
      steps: [
        `Dominio "${domainName}" dado de alta en ${accountLabel}, con seguimiento de aperturas/clics y subdominio "${TRACKING_SUBDOMAIN}".`,
        "Pásale al cliente los registros DNS de abajo. Hasta que los publique y Resend los verifique, este dominio no puede enviar.",
      ],
    });
  } catch (err) {
    console.error("[dominio] Error creando el dominio en Resend:", err);
    return NextResponse.json({ error: "No se pudo dar de alta el dominio en Resend." }, { status: 502 });
  }
}

// Le pide a Resend que vuelva a leer el DNS del dominio. Resend reintenta solo,
// pero después de que el cliente publica los registros nadie quiere esperar el
// siguiente ciclo para saber si quedaron bien.
export async function PUT(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSuperAdmin(session)) {
    return NextResponse.json({ error: "Solo el super admin puede verificar dominios" }, { status: 403 });
  }

  const { id } = await params;
  const target = await resolveTarget(id);
  if ("error" in target) return target.error;
  const { sender, sharedAccount, domainName, accountLabel } = target;

  try {
    const list = await sender.resend.domains.list();
    const found = (list.data?.data ?? []).find((d) => d.name.toLowerCase() === domainName);
    if (!found) {
      return NextResponse.json(
        { error: `El dominio "${domainName}" todavía no está dado de alta en ${accountLabel}.` },
        { status: 400 }
      );
    }

    const verified = await sender.resend.domains.verify(found.id);
    if (verified.error) {
      return NextResponse.json(
        { error: `Resend rechazó la verificación: ${verified.error.message}` },
        { status: 502 }
      );
    }

    // verify() solo dispara la revisión; el estado nuevo se lee aparte.
    const full = await sender.resend.domains.get(found.id);
    const records = mapRecords(full.data?.records as ResendRecord[] | undefined);
    const pending = records.filter((r) => r.status !== "verified");

    return NextResponse.json({
      ok: true,
      domainName,
      sharedAccount,
      accountLabel,
      status: full.data?.status ?? found.status,
      openTracking: full.data?.open_tracking === true,
      clickTracking: full.data?.click_tracking === true,
      trackingSubdomain: full.data?.tracking_subdomain || null,
      records,
      steps: pending.length
        ? [`Resend revisó el DNS: quedan ${pending.length} registro(s) sin verificar.`]
        : [`Resend revisó el DNS de "${domainName}": todos los registros están verificados.`],
    });
  } catch (err) {
    console.error("[dominio] Error verificando el dominio en Resend:", err);
    return NextResponse.json({ error: "No se pudo verificar el dominio en Resend." }, { status: 502 });
  }
}

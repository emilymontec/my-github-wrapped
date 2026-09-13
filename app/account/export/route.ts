import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { inngest } from "@/lib/jobs/client";
import { enforceRateLimit } from "@/lib/ratelimit/respond";

/**
 * ⚠️ Este Route Handler NO genera el export — solo crea la fila en
 * QUEUED y encola el evento (mismo principio que /sync y
 * /wrapped: ver lib/jobs/account-export.ts para el trabajo real).
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const limited = await enforceRateLimit("accountExport", session.user.id);
  if (limited) return limited;

  const userId = session.user.id;

  const created = await prisma.dataExportRequest.create({
    data: { userId, status: "QUEUED" }
  });

  await inngest.send({
    name: "account/export.requested",
    data: { requestId: created.id, userId }
  });

  return NextResponse.json({ id: created.id, status: created.status }, { status: 201 });
}

/**
 * Polling liviano (mismo patrón que GET /sync): el frontend consulta
 * la solicitud de export MÁS RECIENTE del usuario para saber si mostrar
 * "generando" o el botón de descarga.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const latest = await prisma.dataExportRequest.findFirst({
    where: { userId: session.user.id },
    orderBy: { requestedAt: "desc" },
    select: { id: true, status: true, requestedAt: true, completedAt: true, errorMessage: true }
  });

  return NextResponse.json({ request: latest });
}

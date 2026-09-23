import { prisma } from "@/lib/db/prisma";

/**
 * ⚠️ Regla central de esta fase (sección 42, Consideraciones): una
 * comparación NUNCA es automática ni pública por default. Cada función
 * de este archivo hace cumplir una parte de esa regla:
 *
 * - `createComparisonRequest`: crea el vínculo en PENDING — ver la
 *   comparación en absoluto requiere que la otra parte lo acepte después.
 * - `respondToComparison`: solo el destinatario puede aceptar; cualquiera
 *   de las dos partes puede revocar en cualquier momento (antes o después
 *   de aceptar), lo cual mueve el estado a DECLINED y cierra el acceso.
 * - `getAcceptedComparison`: es la ÚNICA función que devuelve datos
 *   comparativos, y solo si status === ACCEPTED y el que pregunta es uno
 *   de los dos participantes — nunca un tercero, ni siquiera con el ID
 *   del vínculo en mano.
 */

export interface ComparisonSummary {
  id: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  otherUsername: string;
  direction: "sent" | "received";
  createdAt: Date;
}

export async function listComparisonsForUser(userId: string): Promise<ComparisonSummary[]> {
  const links = await prisma.comparisonLink.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
    include: {
      userA: { select: { username: true } },
      userB: { select: { username: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  return links.map(
    (link: {
      id: string;
      status: "PENDING" | "ACCEPTED" | "DECLINED";
      userAId: string;
      createdAt: Date;
      userA: { username: string | null };
      userB: { username: string | null };
    }) => {
      const isRequester = link.userAId === userId;
      return {
        id: link.id,
        status: link.status,
        otherUsername: (isRequester ? link.userB.username : link.userA.username) ?? "usuario",
        direction: isRequester ? ("sent" as const) : ("received" as const),
        createdAt: link.createdAt
      };
    }
  );
}

export type CreateComparisonError = "not_found" | "self" | "already_exists";

/**
 * Núcleo de "crear/reabrir un vínculo de comparación", extraído para que
 * tanto invitar por username (`createComparisonRequest`, abajo) como
 * invitar por email de un usuario YA existente
 * (`lib/comparisons/invites.ts::createComparisonInvite`) pasen por la
 * MISMA lógica de unicidad/reapertura -- dos caminos hacia el mismo
 * efecto no deberían poder divergir en esta regla.
 */
export async function createComparisonRequestForTargetId(
  requesterId: string,
  targetId: string
): Promise<{ id: string; createdAt: Date; reused: boolean } | { error: CreateComparisonError }> {
  if (targetId === requesterId) return { error: "self" };

  const existing = await prisma.comparisonLink.findFirst({
    where: {
      OR: [
        { userAId: requesterId, userBId: targetId },
        { userAId: targetId, userBId: requesterId }
      ]
    }
  });

  if (existing) {
    if (existing.status !== "DECLINED") return { error: "already_exists" };
    // Un vínculo previamente rechazado se puede volver a invitar —
    // reabre el mismo registro en vez de acumular filas históricas.
    const reopened = await prisma.comparisonLink.update({
      where: { id: existing.id },
      data: { status: "PENDING", createdAt: new Date(), respondedAt: null }
    });
    return { id: reopened.id, createdAt: reopened.createdAt, reused: true };
  }

  const created = await prisma.comparisonLink.create({
    data: { userAId: requesterId, userBId: targetId }
  });
  return { id: created.id, createdAt: created.createdAt, reused: false };
}

export async function createComparisonRequest(
  requesterId: string,
  targetUsername: string
): Promise<{ id: string } | { error: CreateComparisonError }> {
  const target = await prisma.user.findUnique({
    where: { username: targetUsername },
    select: { id: true }
  });
  if (!target) return { error: "not_found" };

  const result = await createComparisonRequestForTargetId(requesterId, target.id);
  if ("error" in result) return result;
  return { id: result.id };
}

export type RespondError = "not_found" | "forbidden" | "only_recipient_can_accept" | "invalid_state";
export type RespondAction = "accept" | "revoke";

export async function respondToComparison(
  userId: string,
  linkId: string,
  action: RespondAction
): Promise<{ status: "ACCEPTED" | "DECLINED" } | { error: RespondError }> {
  const link = await prisma.comparisonLink.findUnique({ where: { id: linkId } });
  if (!link) return { error: "not_found" };
  if (link.userAId !== userId && link.userBId !== userId) return { error: "forbidden" };

  if (action === "accept") {
    if (link.userBId !== userId) return { error: "only_recipient_can_accept" };
    if (link.status !== "PENDING") return { error: "invalid_state" };
    await prisma.comparisonLink.update({
      where: { id: linkId },
      data: { status: "ACCEPTED", respondedAt: new Date() }
    });
    return { status: "ACCEPTED" };
  }

  // revoke: cualquiera de las dos partes, en cualquier estado no-DECLINED.
  await prisma.comparisonLink.update({
    where: { id: linkId },
    data: { status: "DECLINED", respondedAt: new Date() }
  });
  return { status: "DECLINED" };
}

export interface AcceptedComparisonParticipant {
  id: string;
  username: string;
}

export interface AcceptedComparison {
  id: string;
  userA: AcceptedComparisonParticipant;
  userB: AcceptedComparisonParticipant;
}

export async function getAcceptedComparison(
  userId: string,
  linkId: string
): Promise<AcceptedComparison | null> {
  const link = await prisma.comparisonLink.findUnique({
    where: { id: linkId },
    include: {
      userA: { select: { id: true, username: true } },
      userB: { select: { id: true, username: true } }
    }
  });
  if (!link || link.status !== "ACCEPTED") return null;
  if (link.userAId !== userId && link.userBId !== userId) return null;
  if (!link.userA.username || !link.userB.username) return null;

  return {
    id: link.id,
    userA: { id: link.userA.id, username: link.userA.username },
    userB: { id: link.userB.id, username: link.userB.username }
  };
}

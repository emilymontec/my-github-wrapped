import { prisma } from "@/lib/db/prisma";

/**
 * ⚠️ A diferencia de exportar (lib/account/export.ts) o sincronizar
 * (lib/jobs/sync.ts), esto SÍ corre inline en el Route Handler, sin
 * pasar por Inngest — no es trabajo pesado de lectura/cómputo, es un
 * único `DELETE` que Postgres resuelve vía cascada de FKs
 * (`onDelete: Cascade` en cada relación de `User`, ver prisma/schema.prisma)
 * en una sola operación atómica. El principio "heavy work → job queue"
 * es sobre trabajo O(n) en la request (leer/serializar miles de commits,
 * llamar la API de GitHub); un DELETE con cascada no lo es.
 *
 * `AiUsageLog` es la única tabla que menciona `userId` sin FK (ver
 * comentario en el schema) — se borra explícitamente antes, en la misma
 * transacción, para que el borrado sea completo de verdad.
 */
export async function deleteAccount(userId: string): Promise<void> {
  await prisma.$transaction([
    prisma.aiUsageLog.deleteMany({ where: { userId } }),
    prisma.user.delete({ where: { id: userId } })
  ]);
}

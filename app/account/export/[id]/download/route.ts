import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

/**
 * ⚠️ `findUnique` por `id` + chequeo explícito de `userId === session.user.id`
 * en vez de confiar en que el ID sea "difícil de adivinar" -- mismo
 * principio de ownership explícito que el resto del proyecto (ver
 * `getAcceptedComparison`, `setWrappedVisibility`). Un cuid no es un
 * secreto de autorización.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const exportRequest = await prisma.dataExportRequest.findUnique({
    where: { id: params.id }
  });

  if (!exportRequest || exportRequest.userId !== session.user.id) {
    // Mismo 404 en "no existe" y "no es tuyo" -- nunca confirmar cuál de
    // los dos es (mismo principio que la página pública de Wrapped).
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  if (exportRequest.status !== "COMPLETED" || !exportRequest.data) {
    return NextResponse.json({ error: "El export todavía no está listo" }, { status: 409 });
  }

  return new NextResponse(JSON.stringify(exportRequest.data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="github-wrapped-export-${params.id}.json"`
    }
  });
}

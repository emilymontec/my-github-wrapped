import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getWrappedPageData } from "@/lib/wrapped/service";
import { enforceRateLimit } from "@/lib/ratelimit/respond";
import {
  EXPORT_DIMENSIONS,
  buildExportContent,
  getAccent,
  getGradient,
  type ExportFormat
} from "@/lib/wrapped/exportImage";

export const runtime = "nodejs";

/**
 * ⚠️ Autenticado y con alcance al propio usuario únicamente — a
 * propósito NO recibe `userId` ni `username` en la URL, siempre usa
 * `session.user.id`. Exportar la imagen de otra persona (incluso si su
 * Wrapped es público) no es parte de esta ruta; el caso "quiero la
 * imagen del Wrapped público de alguien más" queda para
 * `opengraph-image.tsx`, que sirve una versión liviana pensada para
 * crawlers, no para descarga en alta resolución.
 */
export async function GET(
  request: Request,
  { params }: { params: { year: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // ⚠️ Fase 10: renderizar un `ImageResponse` es cómputo real bajo
  // demanda (Satori + resvg) — sin límite, un script podría pedir las
  // 4 combinaciones de formato × 7 slides en loop indefinidamente.
  const limited = await enforceRateLimit("wrappedImage", session.user.id);
  if (limited) return limited;

  const year = Number(params.year);
  const { searchParams } = new URL(request.url);
  const slideKind = searchParams.get("slide");
  const format = (searchParams.get("format") ?? "story") as ExportFormat;

  if (!Number.isInteger(year) || !slideKind || !(format in EXPORT_DIMENSIONS)) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { username: true, name: true }
  });

  const data = await getWrappedPageData(session.user.id, year, user.name ?? "developer");
  if (data.status !== "ready") {
    return NextResponse.json({ error: "Wrapped no generado para ese año" }, { status: 404 });
  }

  const slide = data.slides.find((s) => s.kind === slideKind);
  if (!slide) {
    return NextResponse.json({ error: "Slide inválido" }, { status: 400 });
  }

  const { width, height } = EXPORT_DIMENSIONS[format];
  const { title, big, sub } = buildExportContent(slide);
  const bigFontSize = format === "post" ? 88 : format === "twitter" ? 76 : 96;

  return new ImageResponse(
    (
      <div
        style={{
          width,
          height,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundImage: getGradient(slide.kind),
          padding: 80,
          textAlign: "center",
          fontFamily: "sans-serif",
          position: "relative"
        }}
      >
        <div style={{ display: "flex", fontSize: 28, color: "#8b949e", marginBottom: 20 }}>
          {title}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: bigFontSize,
            fontWeight: 700,
            color: getAccent(slide.kind),
            lineHeight: 1.1
          }}
        >
          {big}
        </div>
        {sub && (
          <div
            style={{
              display: "flex",
              fontSize: 32,
              color: "#c9d1d9",
              marginTop: 28,
              maxWidth: width * 0.8,
              lineHeight: 1.4
            }}
          >
            {sub}
          </div>
        )}
        <div style={{ display: "flex", position: "absolute", bottom: 48, fontSize: 22, color: "#484f58" }}>
          GitHub Wrapped
        </div>
      </div>
    ),
    { width, height }
  );
}

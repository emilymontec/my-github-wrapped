import type { ReactNode } from "react";
import { GlassCubeField } from "@/components/wrapped/GlassCubeField";

// Un gradiente de fondo distinto por tipo de slide — es parte de lo que
// hace que un "wrapped" se sienta como un evento narrativo y no como una
// serie de tarjetas de dashboard reordenadas. Todos se mantienen dentro
// de la misma familia tonal oscura para no romper la identidad del
// producto; el campo de cubos (GlassCubeField) y el panel esmerilado van
// por encima, iguales en las 7 slides, para que lo que varíe sea el
// contenido y el tinte, no el lenguaje visual.
const GRADIENTS: Record<string, string> = {
  opening: "from-[#0d1117] via-[#0d1117] to-[#0f2942]",
  volume: "from-[#0d1117] via-[#0c2a4d] to-[#0d1117]",
  rhythm: "from-[#1a1400] via-[#2b1d00] to-[#0d1117]",
  languages: "from-[#1a0d29] via-[#2a0f3d] to-[#0d1117]",
  repos: "from-[#031f12] via-[#04331d] to-[#0d1117]",
  streak: "from-[#241400] via-[#3a1f00] to-[#0d1117]",
  closing: "from-[#0d1117] via-[#161b22] to-[#0d1117]"
};

// La densidad de cubos sube en las slides donde el "material" de commits
// es protagonista (volumen y repos) y baja en las de cierre/apertura,
// que necesitan respirar.
const DENSITY: Record<string, "normal" | "dense"> = {
  volume: "dense",
  repos: "dense"
};

interface SlideShellProps {
  kind: string;
  children: ReactNode;
}

export function SlideShell({ kind, children }: SlideShellProps) {
  return (
    <div
      className={`relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-b px-6 ${
        GRADIENTS[kind] ?? GRADIENTS.opening
      }`}
    >
      <GlassCubeField density={DENSITY[kind] ?? "normal"} />
      <div className="glass-panel flex max-w-md flex-col items-center gap-6 rounded-3xl px-8 py-10 text-center">
        {children}
      </div>
    </div>
  );
}

import type { ReactNode } from "react";
import { GlassCubeField } from "@/components/wrapped/GlassCubeField";

// Un gradiente de fondo distinto por tipo de slide — es parte de lo que
// hace que un "wrapped" se sienta como un evento narrativo y no como una
// serie de tarjetas de dashboard reordenadas. Antes esta familia mezclaba
// tonos cálidos (ámbar en rhythm/streak, verde en repos); el rediseño
// "frío" los reemplaza por variaciones dentro de la misma familia
// azul/violeta/cian, para que todo el producto (login, dashboard, wrapped)
// comparta un único lenguaje cromático — cada slide se sigue
// distinguiendo por el matiz, no por temperatura de color distinta.
const GRADIENTS: Record<string, string> = {
  opening: "from-[#0d1117] via-[#0d1117] to-[#0f2942]",
  volume: "from-[#0d1117] via-[#123a6b] to-[#0d1117]",
  rhythm: "from-[#0d1117] via-[#0a3d45] to-[#0d1117]",
  languages: "from-[#0d1117] via-[#241454] to-[#0d1117]",
  repos: "from-[#0d1117] via-[#0a4a5c] to-[#0d1117]",
  streak: "from-[#0d1117] via-[#1c1140] to-[#0d1117]",
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

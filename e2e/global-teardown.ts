import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { cleanupTestUser } from "./seed";

export default async function globalTeardown(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    await cleanupTestUser(prisma);
  } finally {
    await prisma.$disconnect();
  }

  // No es estrictamente necesario borrar el storageState (el próximo
  // `globalSetup` lo sobreescribe igual), pero dejarlo no-committeado y
  // limpio evita confusión si alguien lo abre entre corridas.
  const authFile = path.join(__dirname, ".auth", "user.json");
  if (fs.existsSync(authFile)) fs.rmSync(authFile);
}

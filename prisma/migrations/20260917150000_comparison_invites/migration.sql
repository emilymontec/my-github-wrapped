-- ⚠️ Migración escrita a mano, no generada con `prisma migrate dev`:
-- `prisma generate`/`migrate dev` requiere descargar el motor de Prisma
-- desde una CDN bloqueada en este entorno de trabajo. El SQL sigue
-- exactamente el estilo de la migración inicial (20260914194216_init)
-- para que Prisma la reconozca como ya aplicada sin diffs al correr
-- `prisma migrate deploy` en un entorno con red completa. Antes de
-- deployar: correr `npx prisma migrate dev` localmente una vez para que
-- Prisma valide que este SQL produce el mismo estado que el schema.

-- CreateEnum
CREATE TYPE "ComparisonInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateTable
CREATE TABLE "ComparisonInvite" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "inviterUserId" TEXT NOT NULL,
    "inviteeEmail" TEXT NOT NULL,
    "status" "ComparisonInviteStatus" NOT NULL DEFAULT 'PENDING',
    "comparisonLinkId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "ComparisonInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ComparisonInvite_token_key" ON "ComparisonInvite"("token");

-- CreateIndex
CREATE UNIQUE INDEX "ComparisonInvite_comparisonLinkId_key" ON "ComparisonInvite"("comparisonLinkId");

-- CreateIndex
CREATE INDEX "ComparisonInvite_inviterUserId_idx" ON "ComparisonInvite"("inviterUserId");

-- CreateIndex
CREATE INDEX "ComparisonInvite_inviteeEmail_idx" ON "ComparisonInvite"("inviteeEmail");

-- AddForeignKey
ALTER TABLE "ComparisonInvite" ADD CONSTRAINT "ComparisonInvite_inviterUserId_fkey" FOREIGN KEY ("inviterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComparisonInvite" ADD CONSTRAINT "ComparisonInvite_comparisonLinkId_fkey" FOREIGN KEY ("comparisonLinkId") REFERENCES "ComparisonLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable (NotificationPreference: nueva preferencia para "me invitaron
-- a comparar" -- default true, mismo criterio que wrappedReadyEmail y
-- streakMilestoneEmail: notificaciones activas por defecto, opt-out
-- explícito desde /settings)
ALTER TABLE "NotificationPreference" ADD COLUMN "comparisonInviteEmail" BOOLEAN NOT NULL DEFAULT true;

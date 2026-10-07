-- Migración corregida: crea NotificationPreference si no existe
-- y luego crea ComparisonInvite + agrega la columna de comparación

-- CreateEnum (si no existe)
DO $$ BEGIN
  CREATE TYPE "ComparisonInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable NotificationPreference (si no existe)
CREATE TABLE IF NOT EXISTS "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wrappedReadyEmail" BOOLEAN NOT NULL DEFAULT true,
    "streakMilestoneEmail" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex para NotificationPreference (si no existe)
CREATE UNIQUE INDEX IF NOT EXISTS "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- AddForeignKey para NotificationPreference (si no existe)
DO $$ BEGIN
  ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable ComparisonInvite
CREATE TABLE IF NOT EXISTS "ComparisonInvite" (
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

-- CreateIndex para ComparisonInvite
CREATE UNIQUE INDEX IF NOT EXISTS "ComparisonInvite_token_key" ON "ComparisonInvite"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "ComparisonInvite_comparisonLinkId_key" ON "ComparisonInvite"("comparisonLinkId");
CREATE INDEX IF NOT EXISTS "ComparisonInvite_inviterUserId_idx" ON "ComparisonInvite"("inviterUserId");
CREATE INDEX IF NOT EXISTS "ComparisonInvite_inviteeEmail_idx" ON "ComparisonInvite"("inviteeEmail");

-- AddForeignKey para ComparisonInvite
DO $$ BEGIN
  ALTER TABLE "ComparisonInvite" ADD CONSTRAINT "ComparisonInvite_inviterUserId_fkey" FOREIGN KEY ("inviterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ComparisonInvite" ADD CONSTRAINT "ComparisonInvite_comparisonLinkId_fkey" FOREIGN KEY ("comparisonLinkId") REFERENCES "ComparisonLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable NotificationPreference: agregar columna comparisonInviteEmail
DO $$ BEGIN
  ALTER TABLE "NotificationPreference" ADD COLUMN "comparisonInviteEmail" BOOLEAN NOT NULL DEFAULT true;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
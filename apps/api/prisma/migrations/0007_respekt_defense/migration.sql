-- Respekt + forsvar
ALTER TABLE "Profile"
  ADD COLUMN IF NOT EXISTS "respectSpent" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Profile"
  ADD COLUMN IF NOT EXISTS "defense" INTEGER NOT NULL DEFAULT 100;

CREATE TABLE IF NOT EXISTS "RespectUpgrade" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  cost INTEGER NOT NULL,
  "effectKey" TEXT NOT NULL,
  "levelRequired" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "RespectPurchase" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "upgradeId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RespectPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE,
  CONSTRAINT "RespectPurchase_upgradeId_fkey" FOREIGN KEY ("upgradeId") REFERENCES "RespectUpgrade"(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "RespectPurchase_user_upgrade_idx" ON "RespectPurchase"("userId", "upgradeId");
CREATE INDEX IF NOT EXISTS "RespectPurchase_user_idx" ON "RespectPurchase"("userId");

-- Cleanup + systems upgrade
ALTER TABLE "Profile"
  ADD COLUMN IF NOT EXISTS "lastGamblingAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "CityHeat" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "cityId" UUID NOT NULL UNIQUE,
  heat INTEGER NOT NULL DEFAULT 50,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CityHeat_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "PrisonInmate" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL UNIQUE,
  "cityId" UUID NOT NULL,
  "jailedUntil" TIMESTAMP(3) NOT NULL,
  reason TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PrisonInmate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE,
  CONSTRAINT "PrisonInmate_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "PrisonBreakAttempt" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "rescuerId" UUID NOT NULL,
  "inmateId" UUID NOT NULL,
  result TEXT NOT NULL,
  reward INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PrisonBreakAttempt_inmateId_fkey" FOREIGN KEY ("inmateId") REFERENCES "PrisonInmate"(id) ON DELETE CASCADE,
  CONSTRAINT "PrisonBreakAttempt_rescuerId_fkey" FOREIGN KEY ("rescuerId") REFERENCES "User"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "CityHeat_cityId_idx" ON "CityHeat"("cityId");
CREATE INDEX IF NOT EXISTS "PrisonInmate_userId_idx" ON "PrisonInmate"("userId");
CREATE INDEX IF NOT EXISTS "PrisonBreakAttempt_rescuer_idx" ON "PrisonBreakAttempt"("rescuerId");

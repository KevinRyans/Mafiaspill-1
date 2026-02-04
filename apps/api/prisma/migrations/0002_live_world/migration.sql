-- Live world + contacts + passive actions + achievements
ALTER TABLE "Profile"
  ADD COLUMN "title" TEXT NOT NULL DEFAULT 'Rookie',
  ADD COLUMN "playstyle" TEXT NOT NULL DEFAULT 'opportunist',
  ADD COLUMN "reputationTag" TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN "bio" TEXT,
  ADD COLUMN "specialization" TEXT NOT NULL DEFAULT 'balanced',
  ADD COLUMN "lastPassiveAt" TIMESTAMP(3);

ALTER TABLE "Notification"
  ADD COLUMN "category" TEXT NOT NULL DEFAULT 'system',
  ADD COLUMN "icon" TEXT,
  ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "hidden" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN "revealAt" TIMESTAMP(3);

CREATE TABLE "City" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  "controlLevel" INTEGER NOT NULL DEFAULT 50,
  "politicalPressure" INTEGER NOT NULL DEFAULT 50,
  "economicHeat" INTEGER NOT NULL DEFAULT 50,
  "riskIndex" INTEGER NOT NULL DEFAULT 50,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Contact" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  "contactType" TEXT NOT NULL,
  description TEXT NOT NULL,
  "loyaltyBase" INTEGER NOT NULL DEFAULT 40,
  "riskAffinity" INTEGER NOT NULL DEFAULT 50,
  icon TEXT,
  "cityId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Contact_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"(id) ON DELETE SET NULL
);

CREATE TABLE "UserContact" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "contactId" UUID NOT NULL,
  trust INTEGER NOT NULL DEFAULT 40,
  loyalty INTEGER NOT NULL DEFAULT 40,
  status TEXT NOT NULL DEFAULT 'active',
  "lastEventAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserContact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE,
  CONSTRAINT "UserContact_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"(id) ON DELETE CASCADE,
  CONSTRAINT "UserContact_unique" UNIQUE ("userId", "contactId")
);

CREATE TABLE "ContactEvent" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "contactId" UUID NOT NULL,
  "userId" UUID,
  "eventType" TEXT NOT NULL,
  message TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContactEvent_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"(id) ON DELETE CASCADE
);

CREATE TABLE "PassiveAction" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  "durationMinutes" INTEGER NOT NULL,
  "baseRewardFiat" INTEGER NOT NULL,
  "baseRewardToken" INTEGER NOT NULL,
  risk INTEGER NOT NULL,
  requirements JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "PassiveRun" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "actionId" UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "claimedAt" TIMESTAMP(3),
  "rewardFiat" INTEGER NOT NULL DEFAULT 0,
  "rewardToken" INTEGER NOT NULL DEFAULT 0,
  outcome TEXT NOT NULL DEFAULT 'pending',
  CONSTRAINT "PassiveRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE,
  CONSTRAINT "PassiveRun_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "PassiveAction"(id) ON DELETE CASCADE
);

CREATE TABLE "Achievement" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT,
  points INTEGER NOT NULL DEFAULT 10,
  hidden BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "UserAchievement" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "achievementId" UUID NOT NULL,
  "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE,
  CONSTRAINT "UserAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"(id) ON DELETE CASCADE,
  CONSTRAINT "UserAchievement_unique" UNIQUE ("userId", "achievementId")
);

CREATE INDEX "Notification_userId_unread_idx" ON "Notification"("userId", "readAt");
CREATE INDEX "UserContact_userId_idx" ON "UserContact"("userId");
CREATE INDEX "Contact_cityId_idx" ON "Contact"("cityId");
CREATE INDEX "PassiveRun_userId_idx" ON "PassiveRun"("userId");
CREATE INDEX "Achievement_code_idx" ON "Achievement"(code);

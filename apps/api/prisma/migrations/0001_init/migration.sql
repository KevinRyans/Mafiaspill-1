-- Initial schema for Mafiaspill
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "Role" AS ENUM ('player', 'support', 'mod', 'admin');
CREATE TYPE "CrewRank" AS ENUM ('recruit', 'associate', 'operator', 'strategist', 'captain', 'boss');
CREATE TYPE "ItemRarity" AS ENUM ('common', 'uncommon', 'rare', 'epic', 'legendary');
CREATE TYPE "Currency" AS ENUM ('fiat', 'token');
CREATE TYPE "ListingStatus" AS ENUM ('active', 'sold', 'cancelled', 'expired');
CREATE TYPE "MissionStatus" AS ENUM ('pending', 'success', 'failed');
CREATE TYPE "CombatStatus" AS ENUM ('active', 'resolved', 'abandoned');
CREATE TYPE "BanType" AS ENUM ('ban', 'mute');
CREATE TYPE "ChatChannel" AS ENUM ('global', 'crew', 'system');

CREATE TABLE "User" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  role "Role" NOT NULL DEFAULT 'player',
  "emailVerifiedAt" TIMESTAMP(3),
  "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "twoFactorSecret" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastLoginAt" TIMESTAMP(3)
);

CREATE TABLE "Profile" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL UNIQUE,
  "displayName" TEXT NOT NULL,
  "avatarUrl" TEXT,
  respect INTEGER NOT NULL DEFAULT 0,
  notoriety INTEGER NOT NULL DEFAULT 0,
  risk INTEGER NOT NULL DEFAULT 10,
  heat INTEGER NOT NULL DEFAULT 0,
  compliance INTEGER NOT NULL DEFAULT 50,
  "walletReputation" INTEGER NOT NULL DEFAULT 50,
  energy INTEGER NOT NULL DEFAULT 100,
  "energyUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fiatBalance" INTEGER NOT NULL DEFAULT 500,
  "tokenBalance" INTEGER NOT NULL DEFAULT 100,
  "lastActionAt" TIMESTAMP(3),
  "lastMissionAt" TIMESTAMP(3),
  "lastPvpAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
);

CREATE TABLE "Inventory" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL UNIQUE,
  capacity INTEGER NOT NULL DEFAULT 60,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Inventory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
);

CREATE TABLE "Item" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  rarity "ItemRarity" NOT NULL,
  "basePrice" INTEGER NOT NULL,
  "basePower" INTEGER NOT NULL DEFAULT 0,
  "provenanceBase" INTEGER NOT NULL DEFAULT 50,
  "isCraftable" BOOLEAN NOT NULL DEFAULT FALSE,
  "craftMinutes" INTEGER NOT NULL DEFAULT 0,
  metadata JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "ItemInstance" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "itemId" UUID NOT NULL,
  "inventoryId" UUID NOT NULL,
  "ownerId" UUID NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  "provenanceScore" INTEGER NOT NULL DEFAULT 50,
  durability INTEGER NOT NULL DEFAULT 100,
  equipped BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ItemInstance_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"(id) ON DELETE CASCADE,
  CONSTRAINT "ItemInstance_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"(id) ON DELETE CASCADE
);

CREATE TABLE "Crew" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  "bankFiat" INTEGER NOT NULL DEFAULT 0,
  "bankToken" INTEGER NOT NULL DEFAULT 0,
  "recruitmentOpen" BOOLEAN NOT NULL DEFAULT TRUE,
  "territoryLevel" INTEGER NOT NULL DEFAULT 1,
  "leaderId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Crew_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User"(id) ON DELETE RESTRICT
);

CREATE TABLE "CrewMember" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "crewId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  rank "CrewRank" NOT NULL DEFAULT 'recruit',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CrewMember_crewId_fkey" FOREIGN KEY ("crewId") REFERENCES "Crew"(id) ON DELETE CASCADE,
  CONSTRAINT "CrewMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE,
  CONSTRAINT "CrewMember_unique" UNIQUE ("crewId", "userId")
);

CREATE TABLE "CrewBankTransaction" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "crewId" UUID NOT NULL,
  "userId" UUID,
  type TEXT NOT NULL,
  "amountFiat" INTEGER NOT NULL DEFAULT 0,
  "amountToken" INTEGER NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CrewBankTransaction_crewId_fkey" FOREIGN KEY ("crewId") REFERENCES "Crew"(id) ON DELETE CASCADE
);

CREATE TABLE "Mission" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  tier INTEGER NOT NULL,
  "energyCost" INTEGER NOT NULL,
  "baseReward" INTEGER NOT NULL,
  "baseRisk" INTEGER NOT NULL,
  "cooldownMinutes" INTEGER NOT NULL,
  options JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "MissionRun" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "missionId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  status "MissionStatus" NOT NULL DEFAULT 'pending',
  "rewardFiat" INTEGER NOT NULL DEFAULT 0,
  "rewardToken" INTEGER NOT NULL DEFAULT 0,
  "riskDelta" INTEGER NOT NULL DEFAULT 0,
  "complianceImpact" INTEGER NOT NULL DEFAULT 0,
  "choiceId" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "MissionRun_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"(id) ON DELETE CASCADE,
  CONSTRAINT "MissionRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
);

CREATE TABLE "MissionEvent" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "missionRunId" UUID NOT NULL,
  "eventType" TEXT NOT NULL,
  message TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MissionEvent_missionRunId_fkey" FOREIGN KEY ("missionRunId") REFERENCES "MissionRun"(id) ON DELETE CASCADE
);

CREATE TABLE "MarketListing" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "itemId" UUID NOT NULL,
  "sellerId" UUID NOT NULL,
  price INTEGER NOT NULL,
  currency "Currency" NOT NULL,
  quantity INTEGER NOT NULL,
  status "ListingStatus" NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  CONSTRAINT "MarketListing_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"(id) ON DELETE CASCADE,
  CONSTRAINT "MarketListing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"(id) ON DELETE CASCADE
);

CREATE TABLE "MarketTransaction" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "listingId" UUID NOT NULL,
  "buyerId" UUID NOT NULL,
  "sellerId" UUID NOT NULL,
  price INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  currency "Currency" NOT NULL,
  "taxPaid" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketTransaction_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "MarketListing"(id) ON DELETE CASCADE,
  CONSTRAINT "MarketTransaction_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"(id) ON DELETE CASCADE,
  CONSTRAINT "MarketTransaction_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"(id) ON DELETE CASCADE
);

CREATE TABLE "Combat" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  status "CombatStatus" NOT NULL DEFAULT 'active',
  "attackerId" UUID NOT NULL,
  "defenderId" UUID NOT NULL,
  "winnerId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "Combat_attackerId_fkey" FOREIGN KEY ("attackerId") REFERENCES "User"(id) ON DELETE CASCADE,
  CONSTRAINT "Combat_defenderId_fkey" FOREIGN KEY ("defenderId") REFERENCES "User"(id) ON DELETE CASCADE
);

CREATE TABLE "CombatTurn" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "combatId" UUID NOT NULL,
  "turnNumber" INTEGER NOT NULL,
  "attackerId" UUID NOT NULL,
  "defenderId" UUID NOT NULL,
  damage INTEGER NOT NULL,
  crit BOOLEAN NOT NULL,
  evaded BOOLEAN NOT NULL,
  "defenderHp" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CombatTurn_combatId_fkey" FOREIGN KEY ("combatId") REFERENCES "Combat"(id) ON DELETE CASCADE
);

CREATE TABLE "PvpMatch" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "combatId" UUID NOT NULL UNIQUE,
  "attackerId" UUID NOT NULL,
  "defenderId" UUID NOT NULL,
  "stakeFiat" INTEGER NOT NULL DEFAULT 0,
  "stakeToken" INTEGER NOT NULL DEFAULT 0,
  "cooldownEndsAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PvpMatch_combatId_fkey" FOREIGN KEY ("combatId") REFERENCES "Combat"(id) ON DELETE CASCADE
);

CREATE TABLE "Notification" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
);

CREATE TABLE "ChatMessage" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "crewId" UUID,
  "userId" UUID NOT NULL,
  channel "ChatChannel" NOT NULL DEFAULT 'global',
  message TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatMessage_crewId_fkey" FOREIGN KEY ("crewId") REFERENCES "Crew"(id) ON DELETE SET NULL,
  CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
);

CREATE TABLE "AdminAuditLog" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "adminId" UUID NOT NULL,
  action TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT,
  metadata JSONB,
  ip TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminAuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"(id) ON DELETE CASCADE
);

CREATE TABLE "BanMute" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  type "BanType" NOT NULL,
  reason TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy" UUID NOT NULL,
  CONSTRAINT "BanMute_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
);

CREATE TABLE "WorldEvent" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  "effectType" TEXT NOT NULL,
  "impactValue" DOUBLE PRECISION NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "ScheduledJob" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  payload JSONB,
  "runAt" TIMESTAMP(3) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  "lastRunAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "RefreshToken" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "userAgent" TEXT,
  ip TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
);

CREATE TABLE "EmailVerification" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  CONSTRAINT "EmailVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
);

CREATE TABLE "PasswordReset" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  CONSTRAINT "PasswordReset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
);

CREATE INDEX "CrewMember_userId_idx" ON "CrewMember"("userId");
CREATE INDEX "MissionRun_userId_idx" ON "MissionRun"("userId");
CREATE INDEX "MarketListing_status_idx" ON "MarketListing"(status);
CREATE INDEX "MarketTransaction_buyerId_idx" ON "MarketTransaction"("buyerId");
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX "ChatMessage_channel_idx" ON "ChatMessage"(channel);
CREATE INDEX "AdminAuditLog_adminId_idx" ON "AdminAuditLog"("adminId");
CREATE INDEX "BanMute_userId_idx" ON "BanMute"("userId");
CREATE INDEX "WorldEvent_active_idx" ON "WorldEvent"(active);

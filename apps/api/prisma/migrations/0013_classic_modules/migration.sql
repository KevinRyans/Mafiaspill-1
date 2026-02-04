ALTER TABLE "Profile"
  ADD COLUMN "crimeXp" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "carTheftXp" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "houseRobberyXp" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "playerRobberyXp" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastCrimeAt" TIMESTAMP(3),
  ADD COLUMN "lastCarTheftAt" TIMESTAMP(3),
  ADD COLUMN "lastHouseRobberyAt" TIMESTAMP(3),
  ADD COLUMN "lastPlayerRobberyAt" TIMESTAMP(3),
  ADD COLUMN "lastTravelAt" TIMESTAMP(3);

ALTER TABLE "Mission"
  ADD COLUMN "requiredCarModelId" UUID;

CREATE TABLE "CarModel" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "make" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "rarity" TEXT NOT NULL,
  "class" TEXT NOT NULL,
  "baseValue" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CarModel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CarModel_make_model_key" ON "CarModel"("make", "model");

CREATE TABLE "GarageCar" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "carModelId" UUID NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'car_theft',
  "status" TEXT NOT NULL DEFAULT 'owned',
  "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GarageCar_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GarageCar_userId_idx" ON "GarageCar"("userId");

CREATE TABLE "FightClubProfile" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "style" TEXT NOT NULL DEFAULT 'judo',
  "rating" INTEGER NOT NULL DEFAULT 100,
  "judoStrength" INTEGER NOT NULL DEFAULT 10,
  "jujutsuStrength" INTEGER NOT NULL DEFAULT 10,
  "karateStrength" INTEGER NOT NULL DEFAULT 10,
  "taekwondoStrength" INTEGER NOT NULL DEFAULT 10,
  "league" TEXT NOT NULL DEFAULT 'Rookie',
  "trainingEndsAt" TIMESTAMP(3),
  "trainingType" TEXT,
  "pendingRatingGain" INTEGER NOT NULL DEFAULT 0,
  "pendingStyleGain" INTEGER NOT NULL DEFAULT 0,
  "pendingCost" INTEGER NOT NULL DEFAULT 0,
  "lastTrainingAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FightClubProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FightClubProfile_userId_key" ON "FightClubProfile"("userId");

CREATE TABLE "BankTransaction" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "counterpartyId" UUID,
  "direction" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BankTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BankTransaction_userId_idx" ON "BankTransaction"("userId");

ALTER TABLE "Mission"
  ADD CONSTRAINT "Mission_requiredCarModelId_fkey" FOREIGN KEY ("requiredCarModelId") REFERENCES "CarModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GarageCar"
  ADD CONSTRAINT "GarageCar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GarageCar"
  ADD CONSTRAINT "GarageCar_carModelId_fkey" FOREIGN KEY ("carModelId") REFERENCES "CarModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FightClubProfile"
  ADD CONSTRAINT "FightClubProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BankTransaction"
  ADD CONSTRAINT "BankTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BankTransaction"
  ADD CONSTRAINT "BankTransaction_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

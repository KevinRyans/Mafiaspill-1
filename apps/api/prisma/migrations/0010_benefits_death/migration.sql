-- Add downed state + deaths counter
ALTER TABLE "Profile" ADD COLUMN "downUntil" TIMESTAMP(3);
ALTER TABLE "Profile" ADD COLUMN "deaths" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Profile" ALTER COLUMN "defense" SET DEFAULT 5000;

-- Benefit purchases
CREATE TABLE "BenefitPurchase" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "benefitCode" TEXT NOT NULL,
  "benefitType" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" "Currency" NOT NULL,
  "cost" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BenefitPurchase_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "BenefitPurchase" ADD CONSTRAINT "BenefitPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Death logs
CREATE TABLE "DeathLog" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "killerId" UUID NOT NULL,
  "victimId" UUID NOT NULL,
  "cityId" UUID,
  "reason" TEXT NOT NULL DEFAULT 'pvp',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeathLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "DeathLog" ADD CONSTRAINT "DeathLog_killerId_fkey" FOREIGN KEY ("killerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DeathLog" ADD CONSTRAINT "DeathLog_victimId_fkey" FOREIGN KEY ("victimId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DeathLog" ADD CONSTRAINT "DeathLog_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

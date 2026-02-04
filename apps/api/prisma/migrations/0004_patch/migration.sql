-- Patch missing columns/constraints
ALTER TABLE "Profile"
  ADD COLUMN IF NOT EXISTS "health" INTEGER NOT NULL DEFAULT 100;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Contract_cityId_fkey'
  ) THEN
    ALTER TABLE "Contract"
      ADD CONSTRAINT "Contract_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"(id) ON DELETE RESTRICT;
  END IF;
END $$;

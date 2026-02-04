-- Prison break attempt logging update
ALTER TABLE "PrisonBreakAttempt"
  ADD COLUMN IF NOT EXISTS "inmateUserId" TEXT;

ALTER TABLE "PrisonBreakAttempt"
  ALTER COLUMN "inmateId" DROP NOT NULL;

ALTER TABLE "PrisonBreakAttempt"
  DROP CONSTRAINT IF EXISTS "PrisonBreakAttempt_inmateId_fkey";

ALTER TABLE "PrisonBreakAttempt"
  ADD CONSTRAINT "PrisonBreakAttempt_inmateId_fkey"
  FOREIGN KEY ("inmateId") REFERENCES "PrisonInmate"(id)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GamblingLimit"
  ALTER COLUMN "dailyMax" SET DEFAULT 600000000,
  ALTER COLUMN "hourlyMax" SET DEFAULT 150000000;

UPDATE "GamblingLimit"
SET "dailyMax" = 600000000,
    "hourlyMax" = 150000000
WHERE "dailyMax" < 1000000 OR "hourlyMax" < 1000000;

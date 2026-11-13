ALTER TABLE "Exercise"
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "archivedAt" TIMESTAMPTZ(6);

CREATE INDEX "Exercise_isActive_idx" ON "Exercise"("isActive");

ALTER TABLE "WorkoutTemplate"
  DROP CONSTRAINT "WorkoutTemplate_trainerId_fkey";

ALTER TABLE "WorkoutTemplate"
  ALTER COLUMN "trainerId" DROP NOT NULL,
  ADD COLUMN "gymId" UUID,
  ADD COLUMN "createdById" UUID,
  ADD COLUMN "defaultKey" TEXT,
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "archivedAt" TIMESTAMPTZ(6);

CREATE UNIQUE INDEX "WorkoutTemplate_defaultKey_key"
  ON "WorkoutTemplate"("defaultKey");

CREATE INDEX "WorkoutTemplate_gymId_isActive_idx"
  ON "WorkoutTemplate"("gymId", "isActive");

CREATE INDEX "WorkoutTemplate_isActive_idx"
  ON "WorkoutTemplate"("isActive");

ALTER TABLE "WorkoutTemplate"
  ADD CONSTRAINT "WorkoutTemplate_trainerId_fkey"
  FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WorkoutTemplate"
  ADD CONSTRAINT "WorkoutTemplate_gymId_fkey"
  FOREIGN KEY ("gymId") REFERENCES "Gym"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WorkoutTemplate"
  ADD CONSTRAINT "WorkoutTemplate_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

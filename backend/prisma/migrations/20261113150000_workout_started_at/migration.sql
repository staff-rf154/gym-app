ALTER TABLE "Workout" ADD COLUMN "startedAt" TIMESTAMPTZ(6);

UPDATE "Workout"
SET "startedAt" = NOW()
WHERE "status" = 'IN_PROGRESS';

CREATE INDEX "Workout_status_startedAt_idx" ON "Workout"("status", "startedAt");

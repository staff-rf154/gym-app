-- Rename statuses to TZ terminology and add automatic status
ALTER TYPE "WorkoutStatus" RENAME VALUE 'DONE' TO 'COMPLETED';
ALTER TYPE "WorkoutStatus" RENAME VALUE 'SKIPPED' TO 'MISSED';
ALTER TYPE "WorkoutStatus" ADD VALUE IF NOT EXISTS 'AUTO_CLOSED';

-- Workout start time (client local HH:mm) and 1h reminder marker
ALTER TABLE "Workout" ADD COLUMN "startTime" VARCHAR(5);
ALTER TABLE "Workout" ADD COLUMN "reminderSentAt" TIMESTAMPTZ;

-- Nutrition archive support
ALTER TABLE "NutritionRecommendation" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "NutritionRecommendation" ADD COLUMN "archivedAt" TIMESTAMPTZ;

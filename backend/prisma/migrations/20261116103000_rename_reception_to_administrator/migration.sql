-- Rename the role value while preserving existing users.
ALTER TYPE "Role" RENAME VALUE 'RECEPTION' TO 'ADMINISTRATOR';

UPDATE "ClientTrainer"
SET "assignedBy" = 'ADMINISTRATOR'
WHERE "assignedBy" = 'RECEPTION';

-- Rename the gym staff profile table.
ALTER TABLE "Reception" RENAME TO "Administrator";

ALTER TABLE "Administrator" RENAME CONSTRAINT "Reception_pkey" TO "Administrator_pkey";
ALTER TABLE "Administrator" RENAME CONSTRAINT "Reception_userId_fkey" TO "Administrator_userId_fkey";
ALTER TABLE "Administrator" RENAME CONSTRAINT "Reception_gymId_fkey" TO "Administrator_gymId_fkey";

ALTER INDEX "Reception_userId_key" RENAME TO "Administrator_userId_key";
ALTER INDEX "Reception_gymId_idx" RENAME TO "Administrator_gymId_idx";

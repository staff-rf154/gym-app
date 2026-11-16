-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SYSTEM', 'WORKOUT', 'MESSAGE', 'CHAT', 'NUTRITION');

-- AlterTable
ALTER TABLE "Goal" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "entityId" UUID,
ADD COLUMN     "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM';

-- CreateIndex
CREATE INDEX "Notification_type_createdAt_idx" ON "Notification"("type", "createdAt");

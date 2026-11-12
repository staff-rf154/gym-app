-- Deduplicate push tokens before adding the unique index.
UPDATE "User" u
SET "pushToken" = NULL
WHERE u."pushToken" IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM "User" u2
    WHERE u2."pushToken" = u."pushToken"
      AND u2."id" < u."id"
  );

-- Deduplicate notification recipients before adding the compound unique index.
DELETE FROM "NotificationRecipient" a
USING "NotificationRecipient" b
WHERE a."notificationId" = b."notificationId"
  AND a."userId" = b."userId"
  AND a."id" > b."id";

-- CreateIndex
CREATE UNIQUE INDEX "User_pushToken_key" ON "User"("pushToken");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationRecipient_notificationId_userId_key" ON "NotificationRecipient"("notificationId", "userId");

-- CreateIndex
CREATE INDEX "WorkoutTemplate_trainerId_idx" ON "WorkoutTemplate"("trainerId");

-- CreateIndex
CREATE INDEX "WorkoutTemplateItem_templateId_idx" ON "WorkoutTemplateItem"("templateId");

-- CreateIndex
CREATE INDEX "Workout_gymId_date_idx" ON "Workout"("gymId", "date");

-- CreateIndex
CREATE INDEX "Workout_status_idx" ON "Workout"("status");

-- CreateIndex
CREATE INDEX "WorkoutItem_workoutId_idx" ON "WorkoutItem"("workoutId");

-- CreateIndex
CREATE INDEX "WorkoutItem_exerciseId_idx" ON "WorkoutItem"("exerciseId");

-- CreateIndex
CREATE INDEX "WorkoutItem_equipmentId_idx" ON "WorkoutItem"("equipmentId");

-- CreateIndex
CREATE INDEX "NutritionRecommendation_clientId_createdAt_idx" ON "NutritionRecommendation"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "NutritionRecommendation_trainerId_createdAt_idx" ON "NutritionRecommendation"("trainerId", "createdAt");

-- CreateIndex
CREATE INDEX "Chat_clientId_createdAt_idx" ON "Chat"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "Chat_trainerId_createdAt_idx" ON "Chat"("trainerId", "createdAt");

-- CreateIndex
CREATE INDEX "Chat_adminId_createdAt_idx" ON "Chat"("adminId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_gymId_createdAt_idx" ON "Notification"("gymId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_senderId_idx" ON "Notification"("senderId");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

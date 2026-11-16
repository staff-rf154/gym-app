-- Indexes for reports and high-volume gyms (100+ gyms, 500+ trainers, 1000+ clients).
CREATE INDEX IF NOT EXISTS "Workout_date_idx" ON "Workout"("date");

CREATE INDEX IF NOT EXISTS "GymEquipment_gymId_idx" ON "GymEquipment"("gymId");

CREATE INDEX IF NOT EXISTS "WorkoutItem_equipmentId_workoutId_idx"
  ON "WorkoutItem"("equipmentId", "workoutId");

CREATE INDEX IF NOT EXISTS "NotificationRecipient_userId_idx"
  ON "NotificationRecipient"("userId");

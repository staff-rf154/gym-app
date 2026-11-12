import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../client/client_workout_models.dart';
import 'workout_models.dart';
import 'workouts_api.dart';

final workoutsApiProvider = Provider<WorkoutsApi>(
  (ref) => WorkoutsApi(ref.watch(apiClientProvider)),
);

final gymsProvider = FutureProvider<List<Gym>>(
  (ref) => ref.watch(workoutsApiProvider).fetchGyms(),
);

final exercisesProvider = FutureProvider<List<Exercise>>(
  (ref) => ref.watch(workoutsApiProvider).fetchExercises(),
);

final templatesProvider = FutureProvider<List<WorkoutTemplate>>(
  (ref) => ref.watch(workoutsApiProvider).fetchTemplates(),
);

final gymEquipmentProvider = FutureProvider.family<List<GymEquipment>, String>(
  (ref, gymId) => ref.watch(workoutsApiProvider).fetchGymEquipment(gymId),
);

final trainerClientWorkoutsProvider =
    FutureProvider.family<List<ClientWorkout>, String>(
      (ref, clientId) => ref
          .watch(workoutsApiProvider)
          .fetchTrainerWorkouts(clientId: clientId),
    );

final trainerWorkoutProvider = FutureProvider.family<ClientWorkout, String>(
  (ref, id) => ref.watch(workoutsApiProvider).fetchTrainerWorkout(id),
);

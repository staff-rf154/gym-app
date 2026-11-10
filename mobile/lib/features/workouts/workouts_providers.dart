import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
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

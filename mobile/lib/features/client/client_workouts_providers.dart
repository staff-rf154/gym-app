import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import 'client_workout_models.dart';
import 'client_workouts_api.dart';

final clientWorkoutsApiProvider = Provider<ClientWorkoutsApi>(
  (ref) => ClientWorkoutsApi(ref.watch(apiClientProvider)),
);

class MonthKey {
  const MonthKey(this.year, this.month);

  final int year;
  final int month;

  DateTime get firstDay => DateTime(year, month, 1);

  DateTime get lastDay => DateTime(year, month + 1, 0);

  MonthKey get previous =>
      month == 1 ? MonthKey(year - 1, 12) : MonthKey(year, month - 1);

  MonthKey get next =>
      month == 12 ? MonthKey(year + 1, 1) : MonthKey(year, month + 1);

  @override
  bool operator ==(Object other) =>
      other is MonthKey && other.year == year && other.month == month;

  @override
  int get hashCode => Object.hash(year, month);
}

final clientMonthWorkoutsProvider =
    FutureProvider.family<List<ClientWorkout>, MonthKey>((ref, month) {
      return ref
          .watch(clientWorkoutsApiProvider)
          .fetchWorkouts(from: month.firstDay, to: month.lastDay);
    });

final clientAllWorkoutsProvider = FutureProvider<List<ClientWorkout>>((ref) {
  final now = DateTime.now();
  return ref
      .watch(clientWorkoutsApiProvider)
      .fetchWorkouts(from: DateTime(2020), to: DateTime(now.year + 1, 12, 31));
});

final clientWorkoutProvider = FutureProvider.family<ClientWorkout, String>(
  (ref, id) => ref.watch(clientWorkoutsApiProvider).fetchWorkout(id),
);

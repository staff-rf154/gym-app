import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import 'report_models.dart';
import 'reports_api.dart';

final reportsApiProvider = Provider<ReportsApi>(
  (ref) => ReportsApi(ref.watch(apiClientProvider)),
);

final weightDynamicsProvider =
    FutureProvider.autoDispose.family<List<WeightDynamicsPoint>, String>(
      (ref, clientId) =>
          ref.watch(reportsApiProvider).fetchWeightDynamics(clientId),
    );

final exercisesSummaryProvider =
    FutureProvider.autoDispose.family<List<ExerciseSummaryItem>, String>(
      (ref, clientId) =>
          ref.watch(reportsApiProvider).fetchExercisesSummary(clientId),
    );

final exerciseProgressProvider =
    FutureProvider.autoDispose.family<
      ExerciseProgress,
      ({String clientId, String exerciseId})
    >(
      (ref, params) => ref
          .watch(reportsApiProvider)
          .fetchExerciseProgress(
            clientId: params.clientId,
            exerciseId: params.exerciseId,
          ),
    );

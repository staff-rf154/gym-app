import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import 'report_models.dart';
import 'reports_api.dart';

final reportsApiProvider = Provider<ReportsApi>(
  (ref) => ReportsApi(ref.watch(apiClientProvider)),
);

typedef ReportRangeKey = ({String clientId, DateTime? from, DateTime? to});

final weightDynamicsProvider =
    FutureProvider.autoDispose.family<List<WeightDynamicsPoint>, ReportRangeKey>(
      (ref, params) => ref
          .watch(reportsApiProvider)
          .fetchWeightDynamics(
            params.clientId,
            from: params.from,
            to: params.to,
          ),
    );

final exercisesSummaryProvider =
    FutureProvider.autoDispose.family<List<ExerciseSummaryItem>, ReportRangeKey>(
      (ref, params) => ref
          .watch(reportsApiProvider)
          .fetchExercisesSummary(
            params.clientId,
            from: params.from,
            to: params.to,
          ),
    );

final exerciseProgressProvider =
    FutureProvider.autoDispose.family<
      ExerciseProgress,
      ({String clientId, String exerciseId, DateTime? from, DateTime? to})
    >(
      (ref, params) => ref
          .watch(reportsApiProvider)
          .fetchExerciseProgress(
            clientId: params.clientId,
            exerciseId: params.exerciseId,
            from: params.from,
            to: params.to,
          ),
    );

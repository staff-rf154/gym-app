import '../../core/api/dio_client.dart';
import 'report_models.dart';

class ReportsApi {
  ReportsApi(this._api);

  final ApiClient _api;

  Future<List<WeightDynamicsPoint>> fetchWeightDynamics(String clientId) async {
    final response = await _api.dio.get<List<dynamic>>(
      '/reports/weight-dynamics',
      queryParameters: {'client_id': clientId},
    );
    final points =
        (response.data ?? [])
            .map(
              (item) =>
                  WeightDynamicsPoint.fromJson(item as Map<String, dynamic>),
            )
            .toList()
          ..sort((a, b) => a.measuredAt.compareTo(b.measuredAt));
    return points;
  }

  Future<List<ExerciseSummaryItem>> fetchExercisesSummary(
    String clientId,
  ) async {
    final response = await _api.dio.get<List<dynamic>>(
      '/reports/exercises-summary',
      queryParameters: {'client_id': clientId},
    );
    return (response.data ?? [])
        .map(
          (item) => ExerciseSummaryItem.fromJson(item as Map<String, dynamic>),
        )
        .toList();
  }

  Future<ExerciseProgress> fetchExerciseProgress({
    required String clientId,
    required String exerciseId,
  }) async {
    final response = await _api.dio.get<Map<String, dynamic>>(
      '/reports/exercise-progress',
      queryParameters: {'client_id': clientId, 'exercise_id': exerciseId},
    );
    return ExerciseProgress.fromJson(response.data!);
  }
}

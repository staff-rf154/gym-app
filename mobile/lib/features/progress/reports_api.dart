import 'package:dio/dio.dart';

import '../../core/api/dio_client.dart';
import 'report_models.dart';

class ReportsApi {
  ReportsApi(this._api);

  final ApiClient _api;

  Future<List<WeightDynamicsPoint>> fetchWeightDynamics(
    String clientId, {
    DateTime? from,
    DateTime? to,
  }) async {
    final response = await _api.dio.get<List<dynamic>>(
      '/reports/weight-dynamics',
      queryParameters: {..._clientParams(clientId), ..._rangeParams(from, to)},
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
    String clientId, {
    DateTime? from,
    DateTime? to,
  }) async {
    final response = await _api.dio.get<List<dynamic>>(
      '/reports/exercises-summary',
      queryParameters: {..._clientParams(clientId), ..._rangeParams(from, to)},
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
    DateTime? from,
    DateTime? to,
  }) async {
    final response = await _api.dio.get<Map<String, dynamic>>(
      '/reports/exercise-progress',
      queryParameters: {
        ..._clientParams(clientId),
        'exercise_id': exerciseId,
        ..._rangeParams(from, to),
      },
    );
    return ExerciseProgress.fromJson(response.data!);
  }

  Future<List<int>> downloadPdf({
    required String kind,
    required String clientId,
    required String period,
    DateTime? from,
    DateTime? to,
  }) async {
    final response = await _api.dio.get<List<int>>(
      '/reports/pdf/$kind',
      queryParameters: {
        if (clientId.isNotEmpty) 'client_id': clientId,
        'period': period,
        if (from != null) 'from': _dateOnly(from),
        if (to != null) 'to': _dateOnly(to),
      },
      options: Options(responseType: ResponseType.bytes),
    );
    return response.data ?? const [];
  }

  static String _dateOnly(DateTime value) {
    final month = value.month.toString().padLeft(2, '0');
    final day = value.day.toString().padLeft(2, '0');
    return '${value.year}-$month-$day';
  }

  static Map<String, dynamic> _clientParams(String clientId) {
    if (clientId.isEmpty) {
      return const {};
    }
    return {'client_id': clientId};
  }

  static Map<String, dynamic> _rangeParams(DateTime? from, DateTime? to) {
    return {
      if (from != null) 'from': _dateOnly(from),
      if (to != null) 'to': _dateOnly(to),
    };
  }
}

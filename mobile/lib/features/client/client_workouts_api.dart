import '../../core/api/dio_client.dart';
import 'client_workout_models.dart';

class ClientWorkoutsApi {
  const ClientWorkoutsApi(this._api);

  final ApiClient _api;

  Future<List<ClientWorkout>> fetchWorkouts({
    required DateTime from,
    required DateTime to,
  }) async {
    final response = await _api.dio.get<Map<String, dynamic>>(
      '/client/workouts',
      queryParameters: {
        'from': _dateOnly(from),
        'to': _dateOnly(to),
        'limit': 100,
      },
    );
    final items = (response.data?['items'] as List<dynamic>?) ?? const [];
    return items
        .cast<Map<String, dynamic>>()
        .map(ClientWorkout.fromJson)
        .toList();
  }

  Future<ClientWorkout> fetchWorkout(String id) async {
    final response = await _api.dio.get<Map<String, dynamic>>(
      '/client/workouts/$id',
    );
    return ClientWorkout.fromJson(response.data!);
  }

  Future<ClientWorkout> startWorkout(String id) async {
    final response = await _api.dio.post<Map<String, dynamic>>(
      '/client/workouts/$id/start',
    );
    return ClientWorkout.fromJson(response.data!);
  }

  Future<ClientWorkout> finishWorkout(String id) async {
    final response = await _api.dio.post<Map<String, dynamic>>(
      '/client/workouts/$id/finish',
    );
    return ClientWorkout.fromJson(response.data!);
  }

  Future<void> saveItemResult(
    String itemId,
    WorkoutItemResultInput input,
  ) async {
    await _api.dio.put<void>(
      '/client/workout-items/$itemId/result',
      data: input.toJson(),
    );
  }

  static String _dateOnly(DateTime value) {
    final month = value.month.toString().padLeft(2, '0');
    final day = value.day.toString().padLeft(2, '0');
    return '${value.year}-$month-$day';
  }
}

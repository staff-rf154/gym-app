import '../../core/api/dio_client.dart';
import '../client/client_workout_models.dart';
import 'workout_models.dart';

class WorkoutsApi {
  WorkoutsApi(this._api);

  final ApiClient _api;

  Future<List<Gym>> fetchGyms() async {
    final response = await _api.dio.get<List<dynamic>>('/trainer/gyms');
    return (response.data ?? [])
        .map((item) => Gym.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<List<Exercise>> fetchExercises() async {
    final response = await _api.dio.get<List<dynamic>>('/exercises');
    return (response.data ?? [])
        .map((item) => Exercise.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<List<GymEquipment>> fetchGymEquipment(String gymId) async {
    final response = await _api.dio.get<List<dynamic>>(
      '/gyms/$gymId/equipment',
    );
    return (response.data ?? [])
        .map((item) => GymEquipment.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<List<ClientWorkout>> fetchTrainerWorkouts({
    String? clientId,
    String? gymId,
    String? from,
    String? to,
  }) async {
    final response = await _api.dio.get<Map<String, dynamic>>(
      '/trainer/workouts',
      queryParameters: {
        'limit': 100,
        if (clientId != null && clientId.isNotEmpty) 'client_id': clientId,
        if (gymId != null && gymId.isNotEmpty) 'gym_id': gymId,
        if (from != null && from.isNotEmpty) 'from': from,
        if (to != null && to.isNotEmpty) 'to': to,
      },
    );
    final items = (response.data?['items'] as List<dynamic>?) ?? const [];
    return items
        .cast<Map<String, dynamic>>()
        .map(ClientWorkout.fromJson)
        .toList();
  }

  Future<ClientWorkout> fetchTrainerWorkout(String id) async {
    final response = await _api.dio.get<Map<String, dynamic>>(
      '/trainer/workouts/$id',
    );
    return ClientWorkout.fromJson(response.data!);
  }

  Future<ClientWorkout> startTrainerWorkout(String id) async {
    final response = await _api.dio.post<Map<String, dynamic>>(
      '/trainer/workouts/$id/start',
    );
    return ClientWorkout.fromJson(response.data!);
  }

  Future<ClientWorkout> finishTrainerWorkout(String id) async {
    final response = await _api.dio.post<Map<String, dynamic>>(
      '/trainer/workouts/$id/finish',
    );
    return ClientWorkout.fromJson(response.data!);
  }

  Future<void> saveTrainerItemResult(
    String itemId,
    WorkoutItemResultInput input,
  ) async {
    await _api.dio.put<void>(
      '/trainer/workout-items/$itemId/result',
      data: input.toJson(),
    );
  }

  Future<List<WorkoutTemplate>> fetchTemplates() async {
    final response = await _api.dio.get<List<dynamic>>('/trainer/templates');
    return (response.data ?? [])
        .map((item) => WorkoutTemplate.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<WorkoutTemplate> createTemplate({
    required String name,
    required List<WorkoutItemInput> items,
    String? description,
  }) async {
    final response = await _api.dio.post<Map<String, dynamic>>(
      '/trainer/templates',
      data: {
        'name': name,
        if (description != null && description.isNotEmpty)
          'description': description,
        'items': items.map((item) => item.toJson()).toList(),
      },
    );
    return WorkoutTemplate.fromJson(response.data!);
  }

  Future<WorkoutTemplate> updateTemplate({
    required String id,
    required String name,
    required List<WorkoutItemInput> items,
    String? description,
  }) async {
    final response = await _api.dio.put<Map<String, dynamic>>(
      '/trainer/templates/$id',
      data: {
        'name': name,
        if (description != null && description.isNotEmpty)
          'description': description,
        'items': items.map((item) => item.toJson()).toList(),
      },
    );
    return WorkoutTemplate.fromJson(response.data!);
  }

  Future<void> deleteTemplate(String id) async {
    await _api.dio.delete<void>('/trainer/templates/$id');
  }

  Future<void> createWorkout({
    required String clientId,
    required String gymId,
    required String date,
    required List<WorkoutItemInput> items,
    String? templateId,
    String? comment,
  }) async {
    await _api.dio.post<Map<String, dynamic>>(
      '/trainer/workouts',
      data: {
        'client_id': clientId,
        'gym_id': gymId,
        'date': date,
        'template_id': ?templateId,
        if (comment != null && comment.isNotEmpty) 'comment': comment,
        'items': items.map((item) => item.toJson()).toList(),
      },
    );
  }

  Future<void> updateWorkout({
    required String id,
    required String clientId,
    required String gymId,
    required String date,
    required List<WorkoutItemInput> items,
    String? templateId,
    String? comment,
  }) async {
    await _api.dio.put<Map<String, dynamic>>(
      '/trainer/workouts/$id',
      data: {
        'client_id': clientId,
        'gym_id': gymId,
        'date': date,
        'template_id': templateId,
        'comment': comment == null || comment.isEmpty ? null : comment,
        'items': items.map((item) => item.toJson()).toList(),
      },
    );
  }
}

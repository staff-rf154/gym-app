import '../../core/api/dio_client.dart';
import 'nutrition_models.dart';

class NutritionApi {
  const NutritionApi(this._apiClient);

  final ApiClient _apiClient;

  Future<List<NutritionRecommendation>> fetchForClient(String clientId) async {
    final response = await _apiClient.dio.get<List<dynamic>>(
      '/trainer/nutrition',
      queryParameters: {'client_id': clientId},
    );
    return (response.data ?? [])
        .cast<Map<String, dynamic>>()
        .map(NutritionRecommendation.fromJson)
        .toList();
  }

  Future<List<NutritionRecommendation>> fetchForDate(DateTime date) async {
    final response = await _apiClient.dio.get<List<dynamic>>(
      '/client/nutrition',
      queryParameters: {'date': _formatDate(date)},
    );
    return (response.data ?? [])
        .cast<Map<String, dynamic>>()
        .map(NutritionRecommendation.fromJson)
        .toList();
  }

  Future<NutritionRecommendation> create(
    String clientId,
    NutritionInput input,
  ) async {
    final response = await _apiClient.dio.post<Map<String, dynamic>>(
      '/trainer/nutrition',
      data: input.toJson(clientId),
    );
    return NutritionRecommendation.fromJson(response.data!);
  }

  static String _formatDate(DateTime value) {
    final month = value.month.toString().padLeft(2, '0');
    final day = value.day.toString().padLeft(2, '0');
    return '${value.year}-$month-$day';
  }
}

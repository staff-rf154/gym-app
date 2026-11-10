import '../../core/api/dio_client.dart';
import 'weight_measurement.dart';

class WeightsApi {
  WeightsApi(this._api);

  final ApiClient _api;

  Future<List<WeightMeasurement>> fetch(String clientId) async {
    final response = await _api.dio.get<List<dynamic>>(
      '/client/$clientId/weight-measurements',
    );
    return (response.data ?? [])
        .map((item) => WeightMeasurement.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<void> create({
    required String clientId,
    required double weight,
    required DateTime measuredAt,
    double? fatMass,
    String? comment,
  }) async {
    await _api.dio.post<Map<String, dynamic>>(
      '/client/$clientId/weight-measurements',
      data: {
        'weight': weight,
        'fatMass': ?fatMass,
        'measuredAt': measuredAt.toUtc().toIso8601String(),
        if (comment != null && comment.isNotEmpty) 'comment': comment,
      },
    );
  }
}

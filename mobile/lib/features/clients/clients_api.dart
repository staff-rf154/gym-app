import '../../core/api/dio_client.dart';
import 'trainer_client.dart';

class ClientsApi {
  ClientsApi(this._client);

  final ApiClient _client;

  Future<List<TrainerClient>> fetchMyClients() async {
    final response = await _client.dio.get<List<dynamic>>('/trainer/clients');
    final data = response.data ?? const [];
    return data
        .map((item) => TrainerClient.fromJson(item as Map<String, dynamic>))
        .toList();
  }
}

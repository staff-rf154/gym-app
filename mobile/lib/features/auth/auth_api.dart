import '../../core/api/dio_client.dart';
import 'models.dart';

class AuthApi {
  AuthApi(this._client);

  final ApiClient _client;

  Future<TokenResponse> login({
    required String phone,
    required String password,
  }) async {
    final response = await _client.dio.post<Map<String, dynamic>>(
      '/auth/login',
      data: {'phone': phone, 'password': password},
    );
    return TokenResponse.fromJson(response.data!);
  }

  Future<UserProfile> me() async {
    final response = await _client.dio.get<Map<String, dynamic>>('/auth/me');
    return UserProfile.fromJson(response.data!);
  }
}

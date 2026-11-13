import '../../core/api/dio_client.dart';
import 'notification_models.dart';

class NotificationsApi {
  const NotificationsApi(this._api);

  final ApiClient _api;

  Future<List<AppNotification>> fetchNotifications() async {
    final response = await _api.dio.get<Map<String, dynamic>>(
      '/notifications',
      queryParameters: {'limit': 100},
    );
    final items = (response.data?['items'] as List<dynamic>?) ?? const [];
    return items
        .cast<Map<String, dynamic>>()
        .map(AppNotification.fromJson)
        .toList();
  }

  Future<void> markRead(String id) async {
    await _api.dio.post<void>('/notifications/$id/read');
  }

  Future<void> registerPushToken(String token) async {
    await _api.dio.patch<void>('/auth/push-token', data: {'token': token});
  }
}

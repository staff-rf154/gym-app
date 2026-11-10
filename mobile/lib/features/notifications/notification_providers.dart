import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import 'notification_api.dart';
import 'notification_models.dart';

final notificationsApiProvider = Provider<NotificationsApi>(
  (ref) => NotificationsApi(ref.watch(apiClientProvider)),
);

final notificationsProvider = FutureProvider<List<AppNotification>>(
  (ref) => ref.watch(notificationsApiProvider).fetchNotifications(),
);

final unreadNotificationsProvider = Provider<int>((ref) {
  final notifications = ref.watch(notificationsProvider);
  return switch (notifications) {
    AsyncData(:final value) => value.where((item) => !item.isRead).length,
    _ => 0,
  };
});

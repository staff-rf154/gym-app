import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'notification_providers.dart';
import 'notifications_screen.dart';

Future<void> showStartupNotifications(
  BuildContext context,
  WidgetRef ref,
) async {
  try {
    final notifications = await ref.read(notificationsProvider.future);
    final unread = notifications.where((item) => !item.isRead).length;
    if (!context.mounted || unread == 0) {
      return;
    }

    final messenger = ScaffoldMessenger.of(context);
    messenger.hideCurrentMaterialBanner();
    messenger.showMaterialBanner(
      MaterialBanner(
        leading: const Icon(Icons.notifications_active),
        content: Text('У вас $unread новых уведомлений'),
        actions: [
          TextButton(
            onPressed: () {
              messenger.hideCurrentMaterialBanner();
              Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => const NotificationsScreen(),
                ),
              );
            },
            child: const Text('Открыть'),
          ),
          TextButton(
            onPressed: messenger.hideCurrentMaterialBanner,
            child: const Text('Позже'),
          ),
        ],
      ),
    );
  } catch (_) {
    return;
  }
}

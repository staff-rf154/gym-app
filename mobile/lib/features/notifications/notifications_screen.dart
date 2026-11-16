import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_error.dart';
import '../auth/auth_controller.dart';
import '../chats/chats_screen.dart';
import '../client/client_workouts_providers.dart';
import '../client/workout_view_screen.dart';
import '../workouts/workouts_providers.dart';
import 'notification_models.dart';
import 'notification_providers.dart';

enum _NotificationFilter { all, workout, message, chat, nutrition, system }

const _filterLabels = <_NotificationFilter, String>{
  _NotificationFilter.all: 'Все',
  _NotificationFilter.workout: 'Тренировки',
  _NotificationFilter.message: 'Сообщения',
  _NotificationFilter.chat: 'Чаты',
  _NotificationFilter.nutrition: 'Питание',
  _NotificationFilter.system: 'Система',
};

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() =>
      _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  _NotificationFilter _filter = _NotificationFilter.all;

  @override
  Widget build(BuildContext context) {
    final notifications = ref.watch(notificationsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Уведомления'),
        actions: [
          IconButton(
            onPressed: () => ref.invalidate(notificationsProvider),
            icon: const Icon(Icons.refresh),
            tooltip: 'Обновить',
          ),
        ],
      ),
      body: switch (notifications) {
        AsyncData(:final value) => _NotificationsBody(
          notifications: value.where(_matches).toList(),
          filter: _filter,
          onFilter: (value) => setState(() => _filter = value),
          onRefresh: () async => ref.invalidate(notificationsProvider),
          onOpen: _handleTap,
        ),
        AsyncError(:final error) => _NotificationsError(
          message: apiErrorMessage(error),
          onRetry: () => ref.invalidate(notificationsProvider),
        ),
        _ => const Center(child: CircularProgressIndicator()),
      },
    );
  }

  bool _matches(AppNotification notification) {
    return switch (_filter) {
      _NotificationFilter.all => true,
      _NotificationFilter.workout => notification.type == 'WORKOUT',
      _NotificationFilter.message => notification.type == 'MESSAGE',
      _NotificationFilter.chat => notification.type == 'CHAT',
      _NotificationFilter.nutrition => notification.type == 'NUTRITION',
      _NotificationFilter.system => notification.type == 'SYSTEM',
    };
  }

  Future<void> _handleTap(AppNotification notification) async {
    await _markRead(notification);
    if (mounted) {
      await _open(notification);
    }
  }

  Future<void> _markRead(AppNotification notification) async {
    if (notification.isRead) {
      return;
    }
    try {
      await ref.read(notificationsApiProvider).markRead(notification.id);
      ref.invalidate(notificationsProvider);
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(apiErrorMessage(error))));
    }
  }

  Future<void> _open(AppNotification notification) async {
    final entityId = notification.entityId;
    try {
      if (notification.type == 'WORKOUT' && entityId != null) {
        final role = ref.read(authControllerProvider).value?.role;
        if (role == 'TRAINER') {
          final workout = await ref
              .read(workoutsApiProvider)
              .fetchTrainerWorkout(entityId);
          if (!mounted) {
            return;
          }
          await Navigator.of(context).push<void>(
            MaterialPageRoute(
              builder: (_) => WorkoutViewScreen(workout: workout),
            ),
          );
          return;
        }
        final workout = await ref
            .read(clientWorkoutsApiProvider)
            .fetchWorkout(entityId);
        if (!mounted) {
          return;
        }
        await Navigator.of(context).push<void>(
          MaterialPageRoute(
            builder: (_) => WorkoutViewScreen(workout: workout),
          ),
        );
        return;
      }

      if (notification.type == 'MESSAGE' || notification.type == 'CHAT') {
        await Navigator.of(context)
            .push<void>(MaterialPageRoute(builder: (_) => const ChatsScreen()));
      }
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(apiErrorMessage(error))));
    }
  }
}

class _NotificationsBody extends StatelessWidget {
  const _NotificationsBody({
    required this.notifications,
    required this.filter,
    required this.onFilter,
    required this.onRefresh,
    required this.onOpen,
  });

  final List<AppNotification> notifications;
  final _NotificationFilter filter;
  final ValueChanged<_NotificationFilter> onFilter;
  final Future<void> Function() onRefresh;
  final ValueChanged<AppNotification> onOpen;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
          child: Row(
            children: [
              for (final entry in _filterLabels.entries)
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(entry.value),
                    selected: filter == entry.key,
                    onSelected: (_) => onFilter(entry.key),
                  ),
                ),
            ],
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: onRefresh,
            child: notifications.isEmpty
                ? ListView(
                    children: const [
                      SizedBox(height: 160),
                      Center(child: Text('Уведомлений пока нет')),
                    ],
                  )
                : ListView.separated(
                    itemCount: notifications.length,
                    separatorBuilder: (_, _) => const Divider(height: 1),
                    itemBuilder: (context, index) {
                      final notification = notifications[index];
                      return ListTile(
                        leading: Icon(
                          _icon(notification.type),
                          color: notification.isRead
                              ? null
                              : Theme.of(context).colorScheme.primary,
                        ),
                        title: Text(
                          notification.title,
                          style: notification.isRead
                              ? null
                              : const TextStyle(fontWeight: FontWeight.bold),
                        ),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(notification.body),
                            const SizedBox(height: 4),
                            Text(
                              DateFormat('dd.MM.yyyy HH:mm')
                                  .format(notification.createdAt),
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ],
                        ),
                        isThreeLine: true,
                        trailing: notification.isRead
                            ? const Icon(Icons.done_all, size: 20)
                            : const Icon(Icons.mark_email_unread_outlined),
                        onTap: () => onOpen(notification),
                      );
                    },
                  ),
          ),
        ),
      ],
    );
  }

  IconData _icon(String type) {
    return switch (type) {
      'WORKOUT' => Icons.fitness_center,
      'MESSAGE' => Icons.chat_bubble_outline,
      'CHAT' => Icons.forum_outlined,
      'NUTRITION' => Icons.restaurant_outlined,
      _ => Icons.notifications_none,
    };
  }
}

class _NotificationsError extends StatelessWidget {
  const _NotificationsError({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.cloud_off, size: 48),
            const SizedBox(height: 16),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            FilledButton(onPressed: onRetry, child: const Text('Повторить')),
          ],
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_error.dart';
import '../../core/widgets/empty_state.dart';
import '../auth/auth_controller.dart';
import 'chat_models.dart';
import 'chat_providers.dart';
import 'chat_screen.dart';

class ChatsScreen extends ConsumerWidget {
  const ChatsScreen({super.key, this.embedded = false});

  final bool embedded;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final chats = ref.watch(chatsProvider);

    final body = switch (chats) {
      AsyncData(:final value) => _ChatsList(chats: value),
      AsyncError(:final error) => _ChatsError(
        message: apiErrorMessage(error),
        onRetry: () => ref.invalidate(chatsProvider),
      ),
      _ => const Center(child: CircularProgressIndicator()),
    };

    if (embedded) {
      return body;
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Чаты'),
        actions: [
          IconButton(
            onPressed: () => ref.invalidate(chatsProvider),
            icon: const Icon(Icons.refresh),
            tooltip: 'Обновить',
          ),
        ],
      ),
      body: body,
    );
  }
}

class _ChatsList extends ConsumerWidget {
  const _ChatsList({required this.chats});

  final List<ChatSummary> chats;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (chats.isEmpty) {
      final role = ref.watch(authControllerProvider).value?.role;
      return RefreshIndicator(
        onRefresh: () async => ref.invalidate(chatsProvider),
        child: ListView(
          children: [
            EmptyState(
              message: 'здесь пока пусто',
              icon: Icons.chat_bubble_outline,
              actionLabel: role == 'CLIENT' ? 'Написать тренеру' : null,
              onAction: role == 'CLIENT'
                  ? () => _startTrainerChat(context, ref)
                  : null,
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(chatsProvider),
      child: ListView.separated(
        itemCount: chats.length,
        separatorBuilder: (_, _) => const Divider(height: 1),
        itemBuilder: (context, index) {
          final chat = chats[index];
          return ListTile(
            leading: CircleAvatar(child: Text(_initial(chat.peerName))),
            title: Text(chat.peerName),
            subtitle: Text(
              chat.isBlocked
                  ? 'Переписка заблокирована'
                  : chat.lastMessage ?? 'Нет сообщений',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            trailing: chat.unreadCount > 0
                ? Badge(label: Text('${chat.unreadCount}'))
                : const Icon(Icons.chevron_right),
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute<void>(builder: (_) => ChatScreen(chat: chat)),
            ),
          );
        },
      ),
    );
  }

  static String _initial(String name) {
    final trimmed = name.trim();
    return trimmed.isEmpty ? '?' : trimmed.substring(0, 1).toUpperCase();
  }

  Future<void> _startTrainerChat(
    BuildContext context,
    WidgetRef ref,
  ) async {
    try {
      final trainers = await ref.read(chatApiProvider).fetchClientTrainers();
      if (!context.mounted) {
        return;
      }
      if (trainers.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Нет активного тренера')),
        );
        return;
      }

      final selected = trainers.length == 1
          ? trainers.first
          : await showModalBottomSheet<ClientTrainerOption>(
              context: context,
              builder: (sheetContext) => SafeArea(
                child: ListView(
                  shrinkWrap: true,
                  children: [
                    const ListTile(title: Text('Выберите тренера')),
                    for (final trainer in trainers)
                      ListTile(
                        leading: CircleAvatar(
                          child: Text(_initial(trainer.trainerName)),
                        ),
                        title: Text(trainer.trainerName),
                        onTap: () => Navigator.of(sheetContext).pop(trainer),
                      ),
                  ],
                ),
              ),
            );
      if (selected == null || !context.mounted) {
        return;
      }

      final chat = await ref.read(chatApiProvider).createChat(
        type: 'CLIENT_TRAINER',
        trainerId: selected.trainerId,
      );
      ref.invalidate(chatsProvider);
      if (!context.mounted) {
        return;
      }
      await Navigator.of(context).push(
        MaterialPageRoute<void>(builder: (_) => ChatScreen(chat: chat)),
      );
    } catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(apiErrorMessage(error))),
        );
      }
    }
  }
}

class _ChatsError extends StatelessWidget {
  const _ChatsError({required this.message, required this.onRetry});

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

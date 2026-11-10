import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_error.dart';
import 'chat_models.dart';
import 'chat_providers.dart';
import 'chat_screen.dart';

class ChatsScreen extends ConsumerWidget {
  const ChatsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final chats = ref.watch(chatsProvider);

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
      body: switch (chats) {
        AsyncData(:final value) => _ChatsList(chats: value),
        AsyncError(:final error) => _ChatsError(
          message: apiErrorMessage(error),
          onRetry: () => ref.invalidate(chatsProvider),
        ),
        _ => const Center(child: CircularProgressIndicator()),
      },
    );
  }
}

class _ChatsList extends ConsumerWidget {
  const _ChatsList({required this.chats});

  final List<ChatSummary> chats;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (chats.isEmpty) {
      return RefreshIndicator(
        onRefresh: () async => ref.invalidate(chatsProvider),
        child: ListView(
          children: const [
            SizedBox(height: 160),
            Center(child: Text('Чатов пока нет')),
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
              chat.lastMessage ?? 'Нет сообщений',
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

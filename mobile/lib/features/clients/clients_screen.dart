import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_error.dart';
import '../../core/push/push_service.dart';
import '../auth/models.dart';
import '../chats/chats_screen.dart';
import '../settings/settings_screen.dart';
import '../templates/templates_screen.dart';
import 'client_card_screen.dart';
import 'clients_providers.dart';
import 'trainer_client.dart';
import 'trainer_workouts_screen.dart';

class ClientsScreen extends ConsumerStatefulWidget {
  const ClientsScreen({super.key, required this.user});

  final UserProfile user;

  @override
  ConsumerState<ClientsScreen> createState() => _ClientsScreenState();
}

class _ClientsScreenState extends ConsumerState<ClientsScreen> {
  @override
  void initState() {
    super.initState();
    initClientPush(ref);
  }

  @override
  void dispose() {
    disposeClientPush();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final clients = ref.watch(myClientsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Мои клиенты'),
        actions: [
          IconButton(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => const TrainerWorkoutsScreen(),
              ),
            ),
            icon: const Icon(Icons.fitness_center),
            tooltip: 'Тренировки на сегодня',
          ),
          IconButton(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute<void>(builder: (_) => const ChatsScreen()),
            ),
            icon: const Icon(Icons.chat_bubble_outline),
            tooltip: 'Чаты',
          ),
          IconButton(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute<void>(builder: (_) => const TemplatesScreen()),
            ),
            icon: const Icon(Icons.list_alt),
            tooltip: 'Шаблоны тренировок',
          ),
          IconButton(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute<void>(builder: (_) => const SettingsScreen()),
            ),
            icon: const Icon(Icons.settings),
            tooltip: 'Настройки',
          ),
        ],
      ),
      body: switch (clients) {
        AsyncData(:final value) => _ClientsList(clients: value),
        AsyncError(:final error) => _ClientsError(
          message: apiErrorMessage(error),
          onRetry: () => ref.invalidate(myClientsProvider),
        ),
        _ => const Center(child: CircularProgressIndicator()),
      },
    );
  }
}

class _ClientsList extends ConsumerWidget {
  const _ClientsList({required this.clients});

  final List<TrainerClient> clients;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (clients.isEmpty) {
      return RefreshIndicator(
        onRefresh: () async => ref.invalidate(myClientsProvider),
        child: ListView(
          children: const [
            SizedBox(height: 160),
            Center(child: Text('Нет назначенных клиентов')),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(myClientsProvider),
      child: ListView.separated(
        itemCount: clients.length,
        separatorBuilder: (_, _) => const Divider(height: 1),
        itemBuilder: (context, index) {
          final client = clients[index];
          return ListTile(
            leading: CircleAvatar(child: Text(client.initials)),
            title: Text(client.name),
            subtitle: Text('${client.phone} · ${client.weightLabel}'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => ClientCardScreen(client: client),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _ClientsError extends StatelessWidget {
  const _ClientsError({required this.message, required this.onRetry});

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

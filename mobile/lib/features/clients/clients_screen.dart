import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_error.dart';
import '../../core/push/push_service.dart';
import '../../core/widgets/empty_state.dart';
import '../auth/models.dart';
import '../chats/chat_providers.dart';
import '../chats/chats_screen.dart';
import '../notifications/notification_bell.dart';
import '../notifications/startup_notifications.dart';
import '../settings/settings_screen.dart';
import '../templates/templates_screen.dart';
import 'client_card_screen.dart';
import 'clients_providers.dart';
import 'trainer_calendar_tab.dart';
import 'trainer_client.dart';
import 'trainer_workouts_screen.dart';

class ClientsScreen extends ConsumerStatefulWidget {
  const ClientsScreen({super.key, required this.user});

  final UserProfile user;

  @override
  ConsumerState<ClientsScreen> createState() => _ClientsScreenState();
}

class _ClientsScreenState extends ConsumerState<ClientsScreen> {
  int _index = 0;
  final Set<int> _visitedTabs = {0};

  static const _titles = ['Календарь', 'Мои клиенты'];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) {
        return;
      }
      initClientPush(ref);
      unawaited(showStartupNotifications(context, ref));
    });
  }

  @override
  void dispose() {
    disposeClientPush();
    super.dispose();
  }

  Widget _tabAt(int index) {
    return switch (index) {
      0 => const TrainerCalendarTab(),
      _ => const _ClientsTab(),
    };
  }

  @override
  Widget build(BuildContext context) {
    final unreadChats = ref.watch(unreadChatsProvider);
    return Scaffold(
      appBar: AppBar(
        title: Text(_titles[_index]),
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
          Badge(
            isLabelVisible: unreadChats > 0,
            label: Text('$unreadChats'),
            child: IconButton(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute<void>(builder: (_) => const ChatsScreen()),
              ),
              icon: const Icon(Icons.chat_bubble_outline),
              tooltip: 'Чаты',
            ),
          ),
          IconButton(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute<void>(builder: (_) => const TemplatesScreen()),
            ),
            icon: const Icon(Icons.list_alt),
            tooltip: 'Шаблоны тренировок',
          ),
          const NotificationBell(),
          IconButton(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute<void>(builder: (_) => const SettingsScreen()),
            ),
            icon: const Icon(Icons.settings),
            tooltip: 'Настройки',
          ),
        ],
      ),
      body: IndexedStack(
        index: _index,
        children: List.generate(
          _titles.length,
          (index) => _visitedTabs.contains(index)
              ? _tabAt(index)
              : const SizedBox.shrink(),
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (value) => setState(() {
          _index = value;
          _visitedTabs.add(value);
        }),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.calendar_month_outlined),
            selectedIcon: Icon(Icons.calendar_month),
            label: 'Календарь',
          ),
          NavigationDestination(
            icon: Icon(Icons.group_outlined),
            selectedIcon: Icon(Icons.group),
            label: 'Клиенты',
          ),
        ],
      ),
    );
  }
}

class _ClientsTab extends ConsumerStatefulWidget {
  const _ClientsTab();

  @override
  ConsumerState<_ClientsTab> createState() => _ClientsTabState();
}

class _ClientsTabState extends ConsumerState<_ClientsTab> {
  final _search = TextEditingController();

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final clients = ref.watch(myClientsProvider);
    final query = _search.text.trim().toLowerCase();

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 12, 12, 4),
          child: TextField(
            controller: _search,
            onChanged: (_) => setState(() {}),
            decoration: const InputDecoration(
              hintText: 'Поиск по ФИО',
              prefixIcon: Icon(Icons.search),
              border: OutlineInputBorder(),
              isDense: true,
            ),
          ),
        ),
        Expanded(
          child: switch (clients) {
            AsyncData(:final value) => _ClientsList(
              clients: query.isEmpty
                  ? value
                  : value
                        .where(
                          (client) => client.name.toLowerCase().contains(query),
                        )
                        .toList(),
              hasQuery: query.isNotEmpty,
            ),
            AsyncError(:final error) => _ClientsError(
              message: apiErrorMessage(error),
              onRetry: () => ref.invalidate(myClientsProvider),
            ),
            _ => const Center(child: CircularProgressIndicator()),
          },
        ),
      ],
    );
  }
}

class _ClientsList extends ConsumerWidget {
  const _ClientsList({required this.clients, this.hasQuery = false});

  final List<TrainerClient> clients;
  final bool hasQuery;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (clients.isEmpty) {
      return RefreshIndicator(
        onRefresh: () async => ref.invalidate(myClientsProvider),
        child: ListView(
          children: [
            EmptyState(
              message: hasQuery ? 'Ничего не найдено' : 'здесь пока пусто',
            ),
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
            subtitle: Text(client.weightLabel),
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

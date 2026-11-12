import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_error.dart';
import '../../core/utils/format.dart';
import '../chats/chat_models.dart';
import '../chats/chat_providers.dart';
import '../chats/chat_screen.dart';
import '../nutrition/nutrition_tab.dart';
import '../progress/progress_tab.dart';
import '../weights/weight_tab.dart';
import '../workouts/workout_builder_screen.dart';
import '../workouts/workouts_providers.dart';
import 'trainer_client.dart';

class ClientCardScreen extends StatelessWidget {
  const ClientCardScreen({super.key, required this.client});

  final TrainerClient client;

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 5,
      child: Scaffold(
        appBar: AppBar(
          title: Text(client.name),
          bottom: const TabBar(
            isScrollable: true,
            tabs: [
              Tab(text: 'Тренировки'),
              Tab(text: 'Прогресс'),
              Tab(text: 'Питание'),
              Tab(text: 'Вес'),
              Tab(text: 'Чат'),
            ],
          ),
        ),
        body: Column(
          children: [
            _ClientSummary(client: client),
            Expanded(
              child: TabBarView(
                children: [
                  _WorkoutsTab(client: client),
                  ProgressTab(clientId: client.id),
                  NutritionTab(client: client),
                  WeightTab(client: client),
                  _ChatTab(client: client),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _WorkoutsTab extends ConsumerStatefulWidget {
  const _WorkoutsTab({required this.client});

  final TrainerClient client;

  @override
  ConsumerState<_WorkoutsTab> createState() => _WorkoutsTabState();
}

class _WorkoutsTabState extends ConsumerState<_WorkoutsTab> {
  String _gymId = '';

  Future<void> _createWorkout() async {
    final created = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => WorkoutBuilderScreen(client: widget.client),
      ),
    );
    if (created == true && mounted) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Тренировка назначена')));
      ref.invalidate(trainerClientWorkoutsProvider(widget.client.id));
    }
  }

  @override
  Widget build(BuildContext context) {
    final workouts = ref.watch(
      trainerClientWorkoutsProvider(widget.client.id),
    );
    final gyms = ref.watch(gymsProvider).asData?.value ?? const [];

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
          child: Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  initialValue: _gymId,
                  decoration: const InputDecoration(
                    labelText: 'Зал',
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                  items: [
                    const DropdownMenuItem(value: '', child: Text('Все залы')),
                    for (final gym in gyms)
                      DropdownMenuItem(value: gym.id, child: Text(gym.name)),
                  ],
                  onChanged: (value) => setState(() => _gymId = value ?? ''),
                ),
              ),
              const SizedBox(width: 8),
              FilledButton.icon(
                onPressed: _createWorkout,
                icon: const Icon(Icons.add),
                label: const Text('Создать'),
              ),
            ],
          ),
        ),
        Expanded(
          child: workouts.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (error, _) => Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(apiErrorMessage(error), textAlign: TextAlign.center),
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed: () => ref.invalidate(
                        trainerClientWorkoutsProvider(widget.client.id),
                      ),
                      child: const Text('Повторить'),
                    ),
                  ],
                ),
              ),
            ),
            data: (items) {
              final filtered = _gymId.isEmpty
                  ? items
                  : items.where((item) => item.gymId == _gymId).toList();
              return RefreshIndicator(
                onRefresh: () async => ref.invalidate(
                  trainerClientWorkoutsProvider(widget.client.id),
                ),
                child: filtered.isEmpty
                    ? ListView(
                        children: const [
                          ListTile(
                            title: Text('Тренировок пока нет'),
                          ),
                        ],
                      )
                    : ListView.separated(
                        itemCount: filtered.length,
                        separatorBuilder: (_, _) => const Divider(height: 1),
                        itemBuilder: (context, index) {
                          final workout = filtered[index];
                          return ListTile(
                            leading: const Icon(Icons.fitness_center),
                            title: Text(formatDate(workout.date)),
                            subtitle: Text(
                              [
                                if (workout.gymName != null) workout.gymName!,
                                workout.statusLabel,
                                '${workout.completedItems}/${workout.items.length}',
                              ].join(' · '),
                            ),
                          );
                        },
                      ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _ClientSummary extends StatelessWidget {
  const _ClientSummary({required this.client});

  final TrainerClient client;

  @override
  Widget build(BuildContext context) {
    final details = <String>[
      client.phone,
      if (client.age != null) '${client.age} лет',
      if (client.height != null) '${formatNumber(client.height!)} см',
      if (client.goal != null && client.goal!.isNotEmpty) client.goal!,
      if (client.trainers.isNotEmpty)
        'Тренеры: ${client.trainers.map((link) => '${link.trainerName} (${assignedByLabel(link.assignedBy)})').join(', ')}',
    ];

    return Card(
      margin: const EdgeInsets.all(12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            CircleAvatar(radius: 28, child: Text(client.initials)),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    client.name,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 4),
                  Text(details.join(' · ')),
                  const SizedBox(height: 4),
                  Text(client.weightLabel),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ChatTab extends ConsumerWidget {
  const _ChatTab({required this.client});

  final TrainerClient client;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final chats = ref.watch(chatsProvider);

    return switch (chats) {
      AsyncData(:final value) => _buildLoaded(value),
      AsyncError() => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.cloud_off, size: 48),
              const SizedBox(height: 12),
              const Text('Не удалось загрузить чаты'),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: () => ref.invalidate(chatsProvider),
                child: const Text('Повторить'),
              ),
            ],
          ),
        ),
      ),
      _ => const Center(child: CircularProgressIndicator()),
    };
  }

  Widget _buildLoaded(List<ChatSummary> chats) {
    ChatSummary? chat;
    for (final item in chats) {
      if (item.peerId == client.userId) {
        chat = item;
        break;
      }
    }

    if (chat == null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.chat_bubble_outline, size: 48),
              const SizedBox(height: 12),
              Text(
                'Чат с ${client.name} ещё не создан',
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    return ChatConversation(chat: chat);
  }
}

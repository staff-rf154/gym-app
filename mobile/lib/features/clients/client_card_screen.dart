import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_error.dart';
import '../../core/utils/format.dart';
import '../../core/utils/timezone.dart';
import '../auth/auth_controller.dart';
import '../chats/chat_models.dart';
import '../chats/chat_providers.dart';
import '../chats/chat_screen.dart';
import '../client/client_workout_models.dart';
import '../client/workout_view_screen.dart';
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
  String? _status;
  WorkoutPeriod _period = WorkoutPeriod.thisWeek;

  Future<void> _openWorkout(ClientWorkout workout) async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute(builder: (_) => WorkoutViewScreen(workout: workout)),
    );
  }

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
    final workouts = ref.watch(trainerClientWorkoutsProvider(widget.client.id));
    final gyms = ref.watch(gymsProvider).asData?.value ?? const [];
    final timezone = ref.watch(authControllerProvider).value?.timezone ?? 'UTC';
    final now = nowInTimezone(timezone);

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
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 0),
          child: DropdownButtonFormField<WorkoutPeriod>(
            initialValue: _period,
            decoration: const InputDecoration(
              labelText: 'Период',
              border: OutlineInputBorder(),
              isDense: true,
            ),
            items: [
              for (final period in WorkoutPeriod.values)
                DropdownMenuItem(
                  value: period,
                  child: Text(workoutPeriodLabel(period)),
                ),
            ],
            onChanged: (value) =>
                setState(() => _period = value ?? WorkoutPeriod.thisWeek),
          ),
        ),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
          child: Row(
            children: [
              for (final filter in const [
                (null, 'Все'),
                ('PLANNED', 'Запланированы'),
                ('IN_PROGRESS', 'В процессе'),
                ('COMPLETED', 'Завершены'),
                ('AUTO_CLOSED', 'Автозакрыты'),
                ('MISSED', 'Пропущены'),
              ])
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(filter.$2),
                    selected: _status == filter.$1,
                    onSelected: (_) => setState(() => _status = filter.$1),
                  ),
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
              final filtered =
                  items
                      .where(
                        (item) =>
                            (_gymId.isEmpty || item.gymId == _gymId) &&
                            (_status == null || item.status == _status) &&
                            matchesWorkoutPeriod(
                              item.date,
                              _period,
                              now: now,
                            ),
                      )
                      .toList()
                    ..sort((a, b) => b.date.compareTo(a.date));
              return RefreshIndicator(
                onRefresh: () async => ref.invalidate(
                  trainerClientWorkoutsProvider(widget.client.id),
                ),
                child: filtered.isEmpty
                    ? ListView(
                        children: const [
                          ListTile(title: Text('Тренировок пока нет')),
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
                            trailing: const Icon(Icons.chevron_right),
                            onTap: () => _openWorkout(workout),
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
      AsyncData(:final value) => _buildLoaded(context, ref, value),
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

  Widget _buildLoaded(
    BuildContext context,
    WidgetRef ref,
    List<ChatSummary> chats,
  ) {
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
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: () => _startChat(context, ref),
                icon: const Icon(Icons.add_comment_outlined),
                label: const Text('Начать чат'),
              ),
            ],
          ),
        ),
      );
    }

    return ChatConversation(chat: chat);
  }

  Future<void> _startChat(BuildContext context, WidgetRef ref) async {
    try {
      final chat = await ref.read(chatApiProvider).createChat(
        type: 'CLIENT_TRAINER',
        clientId: client.id,
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

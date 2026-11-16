import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_error.dart';
import '../../core/utils/format.dart';
import '../../core/utils/timezone.dart';
import '../auth/auth_controller.dart';
import 'client_workout_models.dart';
import 'client_workouts_providers.dart';
import 'workout_view_screen.dart';

class ClientWorkoutsTab extends ConsumerStatefulWidget {
  const ClientWorkoutsTab({super.key});

  @override
  ConsumerState<ClientWorkoutsTab> createState() => _ClientWorkoutsTabState();
}

class _ClientWorkoutsTabState extends ConsumerState<ClientWorkoutsTab> {
  String? _status;
  WorkoutPeriod _period = WorkoutPeriod.thisWeek;

  Future<void> _open(ClientWorkout workout) async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute(builder: (_) => WorkoutViewScreen(workout: workout)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final workouts = ref.watch(clientAllWorkoutsProvider);
    final timezone = ref.watch(authControllerProvider).value?.timezone ?? 'UTC';
    final now = nowInTimezone(timezone);

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
          child: Row(
            children: [
              Expanded(
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
              IconButton(
                tooltip: 'Обновить',
                onPressed: () => ref.invalidate(clientAllWorkoutsProvider),
                icon: const Icon(Icons.refresh),
              ),
            ],
          ),
        ),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
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
                      onPressed: () =>
                          ref.invalidate(clientAllWorkoutsProvider),
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
                        (workout) =>
                            (_status == null || workout.status == _status) &&
                            matchesWorkoutPeriod(
                              workout.date,
                              _period,
                              now: now,
                            ),
                      )
                      .toList()
                    ..sort((a, b) {
                      final byDate = b.date.compareTo(a.date);
                      if (byDate != 0) {
                        return byDate;
                      }
                      return (b.startTime ?? '').compareTo(a.startTime ?? '');
                    });

              return RefreshIndicator(
                onRefresh: () async =>
                    ref.invalidate(clientAllWorkoutsProvider),
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
                                if (workout.startTime != null)
                                  workout.timeLabel,
                                if (workout.gymName != null) workout.gymName!,
                                workout.statusLabel,
                                '${workout.completedItems}/${workout.items.length}',
                              ].join(' · '),
                            ),
                            trailing: const Icon(Icons.chevron_right),
                            onTap: () => _open(workout),
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

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_error.dart';
import '../../core/utils/timezone.dart';
import '../auth/auth_controller.dart';
import 'client_workout_models.dart';
import 'client_workouts_providers.dart';
import 'workout_execution.dart';

class WorkoutDayScreen extends ConsumerStatefulWidget {
  const WorkoutDayScreen({
    required this.date,
    required this.workouts,
    super.key,
  });

  final DateTime date;
  final List<ClientWorkout> workouts;

  @override
  ConsumerState<WorkoutDayScreen> createState() => _WorkoutDayScreenState();
}

class _WorkoutDayScreenState extends ConsumerState<WorkoutDayScreen> {
  final _controllers = <String, WorkoutItemControllers>{};
  final _steps = <String, int>{};
  late List<ClientWorkout> _workouts;
  bool _saving = false;
  String? _actionWorkoutId;

  @override
  void initState() {
    super.initState();
    _workouts = List.of(widget.workouts);
    for (final workout in _workouts) {
      _ensureControllers(workout);
    }
  }

  @override
  void dispose() {
    for (final controller in _controllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  void _ensureControllers(ClientWorkout workout) {
    for (final item in workout.items) {
      _controllers.putIfAbsent(
        item.id,
        () => WorkoutItemControllers(item),
      );
    }
    _steps.putIfAbsent(workout.id, () => 0);
  }

  void _replaceWorkout(ClientWorkout updated) {
    setState(() {
      final index = _workouts.indexWhere((workout) => workout.id == updated.id);
      if (index != -1) {
        _workouts[index] = updated;
      }
      _ensureControllers(updated);
    });
  }

  Future<void> _start(ClientWorkout workout) async {
    setState(() => _actionWorkoutId = workout.id);
    try {
      final updated = await ref
          .read(clientWorkoutsApiProvider)
          .startWorkout(workout.id);
      if (!mounted) {
        return;
      }
      _replaceWorkout(updated);
      ref.invalidate(clientMonthWorkoutsProvider);
    } catch (error) {
      if (mounted) {
        _showMessage(apiErrorMessage(error));
      }
    } finally {
      if (mounted) {
        setState(() => _actionWorkoutId = null);
      }
    }
  }

  Future<void> _finish(ClientWorkout workout) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Закончить тренировку?'),
        content: const Text(
          'После завершения результаты тренировки нельзя будет изменить.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Отмена'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Закончить'),
          ),
        ],
      ),
    );

    if (confirmed != true) {
      return;
    }

    setState(() => _actionWorkoutId = workout.id);
    try {
      final saved = await _persistWorkout(workout);
      if (!saved || !mounted) {
        return;
      }

      final updated = await ref
          .read(clientWorkoutsApiProvider)
          .finishWorkout(workout.id);
      if (!mounted) {
        return;
      }
      _replaceWorkout(updated);
      _showMessage('Тренировка завершена');
      ref.invalidate(clientMonthWorkoutsProvider);
    } catch (error) {
      if (mounted) {
        _showMessage(apiErrorMessage(error));
      }
    } finally {
      if (mounted) {
        setState(() => _actionWorkoutId = null);
      }
    }
  }

  Future<bool> _persistItem(ClientWorkout workout, String itemId) async {
    final state = _controllers[itemId];
    if (state == null) {
      return true;
    }

    final input = state.toInput();
    if (input == null) {
      _showMessage('Проверьте вес и количество повторений');
      return false;
    }

    try {
      await ref
          .read(clientWorkoutsApiProvider)
          .saveItemResult(itemId, input);
      return true;
    } catch (error) {
      if (mounted) {
        _showMessage(apiErrorMessage(error));
      }
      return false;
    }
  }

  Future<bool> _persistWorkout(ClientWorkout workout) async {
    for (final item in workout.items) {
      if (!await _persistItem(workout, item.id)) {
        return false;
      }
    }
    return true;
  }

  Future<void> _saveWorkout(ClientWorkout workout) async {
    setState(() => _saving = true);
    try {
      final saved = await _persistWorkout(workout);
      if (saved && mounted) {
        _showMessage('Результаты сохранены');
        ref.invalidate(clientMonthWorkoutsProvider);
      }
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  Future<void> _moveStep(ClientWorkout workout, int delta) async {
    final step = _steps[workout.id] ?? 0;
    final target = step + delta;
    if (target < 0 || target >= workout.items.length) {
      return;
    }

    if (workout.isLocked) {
      setState(() => _steps[workout.id] = target);
      return;
    }

    setState(() => _saving = true);
    try {
      final saved = await _persistItem(workout, workout.items[step].id);
      if (saved && mounted) {
        setState(() => _steps[workout.id] = target);
      }
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  void _setDone(String itemId, bool done) {
    setState(() => _controllers[itemId]!.done = done);
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final dateLabel = DateFormat('dd.MM.yyyy').format(widget.date);
    final busy = _saving || _actionWorkoutId != null;
    final timezone = ref.watch(authControllerProvider).value?.timezone ?? 'UTC';
    final today = todayKey(timezone);

    return Scaffold(
      appBar: AppBar(title: Text('Тренировка · $dateLabel')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          for (final workout in _workouts) ...[
            _WorkoutHeader(
              workout: workout,
              busy: busy,
              timezone: timezone,
              onStart: workout.canStart && workout.date.compareTo(today) >= 0
                  ? () => _start(workout)
                  : null,
              onFinish: workout.isInProgress ? () => _finish(workout) : null,
            ),
            const SizedBox(height: 8),
            if (workout.items.isEmpty)
              const Padding(
                padding: EdgeInsets.all(24),
                child: Center(child: Text('В тренировке нет упражнений')),
              )
            else if (workout.isInProgress)
              WorkoutStepView(
                workout: workout,
                stepIndex: _steps[workout.id] ?? 0,
                controllers: _controllers,
                saving: busy,
                onDoneChanged: _setDone,
                onBack: () => _moveStep(workout, -1),
                onNext: () => _moveStep(workout, 1),
                onSave: () => _saveWorkout(workout),
                onFinish: () => _finish(workout),
              )
            else
              WorkoutStepView(
                workout: workout,
                stepIndex: _steps[workout.id] ?? 0,
                controllers: _controllers,
                editable: false,
                onDoneChanged: _setDone,
                onBack: () => _moveStep(workout, -1),
                onNext: () => _moveStep(workout, 1),
              ),
            const SizedBox(height: 8),
          ],
          if (_workouts.isEmpty)
            const Padding(
              padding: EdgeInsets.all(24),
              child: Center(child: Text('На этот день тренировок нет')),
            ),
          if (_workouts.any((workout) => workout.isInProgress)) ...[
            const SizedBox(height: 8),
            Text(
              'Фактический вес можно не заполнять — тогда при расчёте прогресса '
              'будет использован плановый вес.',
              style: theme.textTheme.bodySmall,
            ),
          ],
        ],
      ),
    );
  }
}

class _WorkoutHeader extends StatelessWidget {
  const _WorkoutHeader({
    required this.workout,
    required this.busy,
    required this.timezone,
    this.onStart,
    this.onFinish,
  });

  final ClientWorkout workout;
  final bool busy;
  final String timezone;
  final VoidCallback? onStart;
  final VoidCallback? onFinish;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final completed = workout.completedItems;
    final total = workout.items.length;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Chip(
                  label: Text(workout.statusLabel),
                  visualDensity: VisualDensity.compact,
                ),
                const SizedBox(width: 8),
                Text(
                  '$completed из $total выполнено',
                  style: theme.textTheme.bodySmall,
                ),
              ],
            ),
            if (workout.startTime != null) ...[
              const SizedBox(height: 4),
              Text('Время: ${workout.timeLabel}', style: theme.textTheme.bodySmall),
            ],
            if (workout.isInProgress && workout.autoFinishAt != null) ...[
              const SizedBox(height: 4),
              Text(
                'Автозакрытие: ${formatDateTimeInTimezone(workout.autoFinishAt, timezone)}',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.tertiary,
                ),
              ),
            ],
            if (workout.comment != null && workout.comment!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(workout.comment!, style: theme.textTheme.bodyMedium),
            ],
            if (onStart != null || onFinish != null) ...[
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  if (onStart != null)
                    FilledButton.icon(
                      onPressed: busy ? null : onStart,
                      icon: const Icon(Icons.play_arrow),
                      label: const Text('Приступить'),
                    ),
                  if (onFinish != null)
                    FilledButton.tonalIcon(
                      onPressed: busy ? null : onFinish,
                      icon: const Icon(Icons.flag_outlined),
                      label: const Text('Закончить тренировку'),
                    ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

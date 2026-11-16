import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_error.dart';
import '../../core/utils/timezone.dart';
import '../../core/widgets/empty_state.dart';
import '../auth/auth_controller.dart';
import '../client/client_workout_models.dart';
import '../client/workout_execution.dart';
import '../workouts/workout_builder_screen.dart';
import '../workouts/workouts_api.dart';
import '../workouts/workouts_providers.dart';

class TrainerWorkoutsScreen extends ConsumerStatefulWidget {
  const TrainerWorkoutsScreen({super.key, this.date});

  final DateTime? date;

  @override
  ConsumerState<TrainerWorkoutsScreen> createState() =>
      _TrainerWorkoutsScreenState();
}

class _TrainerWorkoutsScreenState extends ConsumerState<TrainerWorkoutsScreen> {
  final _controllers = <String, WorkoutItemControllers>{};
  final _steps = <String, int>{};
  List<ClientWorkout> _workouts = const [];
  bool _loading = true;
  bool _saving = false;
  String? _error;
  String? _selectedWorkoutId;
  String? _finishingWorkoutId;
  String? _actionWorkoutId;
  String? _statusFilter;
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    _load();
    _refreshTimer = Timer.periodic(
      const Duration(minutes: 1),
      (_) => _load(silent: true),
    );
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    for (final controller in _controllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  WorkoutsApi get _api => ref.read(workoutsApiProvider);

  void _ensureControllers(ClientWorkout workout) {
    for (final item in workout.items) {
      _controllers.putIfAbsent(item.id, () => WorkoutItemControllers(item));
    }
    _steps.putIfAbsent(workout.id, () => 0);
  }

  Future<void> _load({bool silent = false}) async {
    if (!silent) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }

    try {
      final date = widget.date ?? DateTime.now();
      final day = DateFormat('yyyy-MM-dd').format(date);
      final workouts = await _api.fetchTrainerWorkouts(from: day, to: day);
      if (!mounted) {
        return;
      }
      for (final workout in workouts) {
        _ensureControllers(workout);
      }
      workouts.sort((a, b) {
        final byTime = (a.startTime ?? '99:99').compareTo(
          b.startTime ?? '99:99',
        );
        if (byTime != 0) {
          return byTime;
        }
        return (a.clientName ?? '').compareTo(b.clientName ?? '');
      });
      setState(() {
        _workouts = workouts;
        _loading = false;
        _error = null;
        if (!workouts.any((workout) => workout.id == _selectedWorkoutId)) {
          _selectedWorkoutId = null;
        }
      });
    } catch (error) {
      if (mounted && !silent) {
        setState(() {
          _error = apiErrorMessage(error);
          _loading = false;
        });
      }
    }
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

      final updated = await _api.finishTrainerWorkout(workout.id);
      if (!mounted) {
        return;
      }
      _replaceWorkout(updated);
      setState(() {
        if (_selectedWorkoutId == updated.id) {
          _selectedWorkoutId = null;
        }
        if (_finishingWorkoutId == updated.id) {
          _finishingWorkoutId = null;
        }
      });
      _showMessage('Тренировка завершена');
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

  Future<bool> _persistItem(String itemId) async {
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
      await _api.saveTrainerItemResult(itemId, input);
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
      if (!await _persistItem(item.id)) {
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
      final saved = await _persistItem(workout.items[step].id);
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
    if (_finishingWorkoutId == null) {
      return;
    }
    setState(() => _controllers[itemId]!.done = done);
  }

  Future<void> _openBuilder(DateTime date) async {
    final created = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => WorkoutBuilderScreen(initialDate: date),
      ),
    );
    if (created == true && mounted) {
      await _load(silent: true);
    }
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    ClientWorkout? selected;
    for (final workout in _workouts) {
      if (workout.id == _selectedWorkoutId) {
        selected = workout;
        break;
      }
    }

    final day = widget.date ?? DateTime.now();
    final now = DateTime.now();
    final isToday =
        day.year == now.year && day.month == now.month && day.day == now.day;

    final timezone = ref.watch(authControllerProvider).value?.timezone ?? 'UTC';
    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openBuilder(day),
        icon: const Icon(Icons.add),
        label: const Text('Добавить тренировку'),
      ),
      appBar: AppBar(
        title: Text(
          isToday
              ? 'Тренировки на сегодня'
              : 'Тренировки на ${DateFormat('dd.MM.yyyy').format(day)}',
        ),
        actions: [
          IconButton(
            onPressed: _loading ? null : _load,
            icon: const Icon(Icons.refresh),
            tooltip: 'Обновить',
          ),
        ],
      ),
      body: _buildBody(context, selected, timezone),
    );
  }

  Widget _buildBody(
    BuildContext context,
    ClientWorkout? selected,
    String timezone,
  ) {
    final day = widget.date ?? DateTime.now();
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.cloud_off, size: 48),
              const SizedBox(height: 12),
              Text(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 12),
              FilledButton(onPressed: _load, child: const Text('Повторить')),
            ],
          ),
        ),
      );
    }

    final visible = _statusFilter == null
        ? _workouts
        : _workouts
              .where((workout) => workout.status == _statusFilter)
              .toList();
    final groups = <String, List<ClientWorkout>>{};
    for (final workout in visible) {
      groups.putIfAbsent(workout.clientId, () => []).add(workout);
    }

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(12),
        children: [
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
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
                      selected: _statusFilter == filter.$1,
                      onSelected: (_) =>
                          setState(() => _statusFilter = filter.$1),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          if (selected != null) ...[
            _SelectedWorkout(
              workout: selected,
              stepIndex: _steps[selected.id] ?? 0,
              controllers: _controllers,
              busy: _saving || _actionWorkoutId != null,
              timezone: timezone,
              finishing: _finishingWorkoutId == selected.id,
              onClose: () => setState(() {
                _selectedWorkoutId = null;
                _finishingWorkoutId = null;
              }),
              onStartFinishing: () => setState(() {
                _selectedWorkoutId = selected.id;
                _finishingWorkoutId = selected.id;
              }),
              onDoneChanged: _setDone,
              onBack: () => _moveStep(selected, -1),
              onNext: () => _moveStep(selected, 1),
              onSave: () => _saveWorkout(selected),
              onFinish: () => _finish(selected),
            ),
            const SizedBox(height: 12),
          ],
          if (visible.isEmpty)
            EmptyState(
              message: _statusFilter == null
                  ? 'здесь пока пусто'
                  : 'Нет тренировок с этим статусом',
              actionLabel: _statusFilter == null ? 'Добавить тренировку' : null,
              onAction: _statusFilter == null ? () => _openBuilder(day) : null,
            )
          else
            for (final entry in groups.entries) ...[
              Padding(
                padding: const EdgeInsets.fromLTRB(4, 8, 4, 4),
                child: Text(
                  entry.value.first.clientName ?? 'Клиент',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ),
              for (final workout in entry.value) ...[
                _TrainerWorkoutCard(
                  workout: workout,
                  busy: _actionWorkoutId != null,
                  selected: workout.id == _selectedWorkoutId,
                  timezone: timezone,
                  onOpen: () => setState(() {
                    _selectedWorkoutId = workout.id;
                    _finishingWorkoutId = null;
                  }),
                  onFinish: workout.isInProgress
                      ? () => setState(() {
                          _selectedWorkoutId = workout.id;
                          _finishingWorkoutId = workout.id;
                        })
                      : null,
                ),
                const SizedBox(height: 8),
              ],
            ],
        ],
      ),
    );
  }
}

class _SelectedWorkout extends StatelessWidget {
  const _SelectedWorkout({
    required this.workout,
    required this.stepIndex,
    required this.controllers,
    required this.busy,
    required this.timezone,
    required this.finishing,
    required this.onClose,
    required this.onStartFinishing,
    required this.onDoneChanged,
    required this.onBack,
    required this.onNext,
    required this.onSave,
    required this.onFinish,
  });

  final ClientWorkout workout;
  final int stepIndex;
  final Map<String, WorkoutItemControllers> controllers;
  final bool busy;
  final String timezone;
  final bool finishing;
  final VoidCallback onClose;
  final VoidCallback onStartFinishing;
  final void Function(String itemId, bool done) onDoneChanged;
  final VoidCallback onBack;
  final VoidCallback onNext;
  final VoidCallback onSave;
  final VoidCallback onFinish;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    workout.clientName ?? 'Клиент',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                IconButton(
                  onPressed: onClose,
                  icon: const Icon(Icons.close),
                  tooltip: 'Свернуть',
                ),
              ],
            ),
            if (workout.isInProgress && workout.autoFinishAt != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(
                  'Автозакрытие: ${formatDateTimeInTimezone(workout.autoFinishAt, timezone)}',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.tertiary,
                  ),
                ),
              ),
            if (!finishing && workout.isInProgress)
              Align(
                alignment: Alignment.centerRight,
                child: FilledButton.icon(
                  onPressed: busy ? null : onStartFinishing,
                  icon: const Icon(Icons.flag_outlined),
                  label: const Text('Перейти к завершению'),
                ),
              ),
            WorkoutStepView(
              workout: workout,
              stepIndex: stepIndex,
              controllers: controllers,
              saving: busy,
              editable: finishing,
              onDoneChanged: onDoneChanged,
              onBack: onBack,
              onNext: onNext,
              onSave: onSave,
              onFinish: onFinish,
            ),
          ],
        ),
      ),
    );
  }
}

class _TrainerWorkoutCard extends StatelessWidget {
  const _TrainerWorkoutCard({
    required this.workout,
    required this.busy,
    required this.selected,
    required this.timezone,
    this.onOpen,
    this.onFinish,
  });

  final ClientWorkout workout;
  final bool busy;
  final bool selected;
  final String timezone;
  final VoidCallback? onOpen;
  final VoidCallback? onFinish;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final total = workout.items.length;

    return Card(
      shape: selected
          ? RoundedRectangleBorder(
              side: BorderSide(color: theme.colorScheme.primary, width: 1.5),
              borderRadius: BorderRadius.circular(12),
            )
          : null,
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
                Expanded(
                  child: Text(
                    [
                      if (workout.startTime != null) workout.timeLabel,
                      workout.gymName ?? 'Зал',
                    ].join(' · '),
                    style: theme.textTheme.bodySmall,
                  ),
                ),
                Text(
                  '${workout.completedItems}/$total',
                  style: theme.textTheme.bodySmall,
                ),
              ],
            ),
            if (workout.comment != null && workout.comment!.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(workout.comment!, style: theme.textTheme.bodySmall),
            ],
            if (workout.isInProgress && workout.autoFinishAt != null) ...[
              const SizedBox(height: 6),
              Row(
                children: [
                  Icon(
                    Icons.timer_outlined,
                    size: 16,
                    color: theme.colorScheme.tertiary,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    'Автозавершение в '
                    '${formatDateTimeInTimezone(workout.autoFinishAt, timezone)}',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.tertiary,
                    ),
                  ),
                ],
              ),
            ],
            if (onOpen != null || onFinish != null) ...[
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: [
                  if (onOpen != null)
                    OutlinedButton.icon(
                      onPressed: busy ? null : onOpen,
                      icon: const Icon(Icons.visibility_outlined),
                      label: const Text('Открыть'),
                    ),
                  if (onFinish != null)
                    FilledButton.tonalIcon(
                      onPressed: busy ? null : onFinish,
                      icon: const Icon(Icons.flag_outlined),
                      label: const Text('Завершить'),
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

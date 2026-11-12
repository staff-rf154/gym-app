import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_error.dart';
import '../client/client_workout_models.dart';
import '../client/workout_execution.dart';
import '../workouts/workouts_api.dart';
import '../workouts/workouts_providers.dart';

class TrainerWorkoutsScreen extends ConsumerStatefulWidget {
  const TrainerWorkoutsScreen({super.key});

  @override
  ConsumerState<TrainerWorkoutsScreen> createState() =>
      _TrainerWorkoutsScreenState();
}

class _TrainerWorkoutsScreenState
    extends ConsumerState<TrainerWorkoutsScreen> {
  final _controllers = <String, WorkoutItemControllers>{};
  final _steps = <String, int>{};
  List<ClientWorkout> _workouts = const [];
  bool _loading = true;
  bool _saving = false;
  String? _error;
  String? _selectedWorkoutId;
  String? _actionWorkoutId;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    for (final controller in _controllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  WorkoutsApi get _api => ref.read(workoutsApiProvider);

  void _ensureControllers(ClientWorkout workout) {
    for (final item in workout.items) {
      _controllers.putIfAbsent(
        item.id,
        () => WorkoutItemControllers(item),
      );
    }
    _steps.putIfAbsent(workout.id, () => 0);
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final today = DateFormat('yyyy-MM-dd').format(DateTime.now());
      final workouts = await _api.fetchTrainerWorkouts(
        from: today,
        to: today,
      );
      if (!mounted) {
        return;
      }
      for (final workout in workouts) {
        _ensureControllers(workout);
      }
      setState(() {
        _workouts = workouts;
        _loading = false;
        if (!workouts.any((workout) => workout.id == _selectedWorkoutId)) {
          _selectedWorkoutId = null;
        }
      });
    } catch (error) {
      if (mounted) {
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

  Future<void> _start(ClientWorkout workout) async {
    setState(() => _actionWorkoutId = workout.id);
    try {
      final updated = await _api.startTrainerWorkout(workout.id);
      if (!mounted) {
        return;
      }
      _replaceWorkout(updated);
      setState(() => _selectedWorkoutId = updated.id);
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

      final updated = await _api.finishTrainerWorkout(workout.id);
      if (!mounted) {
        return;
      }
      _replaceWorkout(updated);
      setState(() {
        if (_selectedWorkoutId == updated.id) {
          _selectedWorkoutId = null;
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
    setState(() => _controllers[itemId]!.done = done);
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

    return Scaffold(
      appBar: AppBar(
        title: const Text('Тренировки на сегодня'),
        actions: [
          IconButton(
            onPressed: _loading ? null : _load,
            icon: const Icon(Icons.refresh),
            tooltip: 'Обновить',
          ),
        ],
      ),
      body: _buildBody(context, selected),
    );
  }

  Widget _buildBody(BuildContext context, ClientWorkout? selected) {
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

    final groups = <String, List<ClientWorkout>>{};
    for (final workout in _workouts) {
      groups.putIfAbsent(workout.clientId, () => []).add(workout);
    }

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(12),
        children: [
          if (selected != null) ...[
            _SelectedWorkout(
              workout: selected,
              stepIndex: _steps[selected.id] ?? 0,
              controllers: _controllers,
              busy: _saving || _actionWorkoutId != null,
              onClose: () => setState(() => _selectedWorkoutId = null),
              onDoneChanged: _setDone,
              onBack: () => _moveStep(selected, -1),
              onNext: () => _moveStep(selected, 1),
              onSave: () => _saveWorkout(selected),
              onFinish: () => _finish(selected),
            ),
            const SizedBox(height: 12),
          ],
          if (_workouts.isEmpty)
            const Padding(
              padding: EdgeInsets.all(24),
              child: Center(child: Text('На сегодня тренировок нет')),
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
                  onStart: workout.canStart ? () => _start(workout) : null,
                  onOpen: workout.isInProgress
                      ? () => setState(
                          () => _selectedWorkoutId = workout.id,
                        )
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
    required this.onClose,
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
  final VoidCallback onClose;
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
            WorkoutStepView(
              workout: workout,
              stepIndex: stepIndex,
              controllers: controllers,
              saving: busy,
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
    this.onStart,
    this.onOpen,
  });

  final ClientWorkout workout;
  final bool busy;
  final bool selected;
  final VoidCallback? onStart;
  final VoidCallback? onOpen;

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
                    workout.gymName ?? 'Зал',
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
            if (onStart != null || onOpen != null) ...[
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: [
                  if (onStart != null)
                    FilledButton.icon(
                      onPressed: busy ? null : onStart,
                      icon: const Icon(Icons.play_arrow),
                      label: const Text('Начать тренировку'),
                    ),
                  if (onOpen != null)
                    FilledButton.tonalIcon(
                      onPressed: busy ? null : onOpen,
                      icon: const Icon(Icons.fitness_center),
                      label: const Text('Продолжить'),
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

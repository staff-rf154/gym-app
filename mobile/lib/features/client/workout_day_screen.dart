import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_error.dart';
import 'client_workout_models.dart';
import 'client_workouts_providers.dart';

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
  final _controllers = <String, _ItemControllers>{};
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    for (final workout in widget.workouts) {
      for (final item in workout.items) {
        _controllers[item.id] = _ItemControllers(item);
      }
    }
  }

  @override
  void dispose() {
    for (final controller in _controllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    final inputs = <String, WorkoutItemResultInput>{};

    for (final entry in _controllers.entries) {
      final state = entry.value;
      final weightText = state.weight.text.trim().replaceAll(',', '.');
      final repsText = state.reps.text.trim();

      final weight = weightText.isEmpty ? null : double.tryParse(weightText);
      final reps = repsText.isEmpty ? null : int.tryParse(repsText);
      if ((weightText.isNotEmpty && weight == null) ||
          (repsText.isNotEmpty && reps == null)) {
        _showMessage('Проверьте вес и количество повторений');
        return;
      }

      inputs[entry.key] = WorkoutItemResultInput(
        done: state.done,
        actualWeight: weight,
        actualReps: reps,
        clientComment: state.comment.text.trim(),
      );
    }

    setState(() => _saving = true);
    try {
      final api = ref.read(clientWorkoutsApiProvider);
      for (final entry in inputs.entries) {
        await api.saveItemResult(entry.key, entry.value);
      }
      if (!mounted) {
        return;
      }
      _showMessage('Результаты сохранены');
      ref.invalidate(clientMonthWorkoutsProvider);
    } catch (error) {
      if (mounted) {
        _showMessage(apiErrorMessage(error));
      }
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
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

    return Scaffold(
      appBar: AppBar(title: Text('Тренировка · $dateLabel')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          for (final workout in widget.workouts) ...[
            _WorkoutHeader(workout: workout),
            const SizedBox(height: 8),
            if (workout.items.isEmpty)
              const Padding(
                padding: EdgeInsets.all(24),
                child: Center(child: Text('В тренировке нет упражнений')),
              )
            else
              for (final item in workout.items) ...[
                _ItemCard(
                  item: item,
                  controllers: _controllers[item.id]!,
                  onDoneChanged: (value) =>
                      setState(() => _controllers[item.id]!.done = value),
                ),
                const SizedBox(height: 10),
              ],
            const SizedBox(height: 8),
          ],
          if (widget.workouts.isEmpty)
            const Padding(
              padding: EdgeInsets.all(24),
              child: Center(child: Text('На этот день тренировок нет')),
            ),
          const SizedBox(height: 8),
          FilledButton.icon(
            onPressed: _saving ? null : _save,
            icon: _saving
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.save_outlined),
            label: Text(_saving ? 'Сохранение…' : 'Сохранить результаты'),
          ),
          const SizedBox(height: 8),
          Text(
            'Фактический вес можно не заполнять — тогда при расчёте прогресса '
            'будет использован плановый вес.',
            style: theme.textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}

class _WorkoutHeader extends StatelessWidget {
  const _WorkoutHeader({required this.workout});

  final ClientWorkout workout;

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
            if (workout.comment != null && workout.comment!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(workout.comment!, style: theme.textTheme.bodyMedium),
            ],
          ],
        ),
      ),
    );
  }
}

class _ItemCard extends StatelessWidget {
  const _ItemCard({
    required this.item,
    required this.controllers,
    required this.onDoneChanged,
  });

  final ClientWorkoutItem item;
  final _ItemControllers controllers;
  final ValueChanged<bool> onDoneChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.exerciseName,
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(item.planLabel, style: theme.textTheme.bodySmall),
                    ],
                  ),
                ),
                Checkbox(
                  value: controllers.done,
                  onChanged: (value) => onDoneChanged(value ?? false),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: controllers.weight,
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                    decoration: const InputDecoration(
                      labelText: 'Факт. вес, кг',
                      isDense: true,
                      border: OutlineInputBorder(),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: controllers.reps,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Повторений',
                      isDense: true,
                      border: OutlineInputBorder(),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            TextField(
              controller: controllers.comment,
              minLines: 1,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Комментарий',
                isDense: true,
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ItemControllers {
  _ItemControllers(ClientWorkoutItem item)
    : done = item.result?.done ?? false,
      weight = TextEditingController(
        text: item.result?.actualWeight == null
            ? ''
            : formatWorkoutNumber(item.result!.actualWeight!),
      ),
      reps = TextEditingController(
        text: item.result?.actualReps?.toString() ?? '',
      ),
      comment = TextEditingController(text: item.result?.clientComment ?? '');

  bool done;
  final TextEditingController weight;
  final TextEditingController reps;
  final TextEditingController comment;

  void dispose() {
    weight.dispose();
    reps.dispose();
    comment.dispose();
  }
}

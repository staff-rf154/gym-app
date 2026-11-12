import 'package:flutter/material.dart';

import '../../core/utils/format.dart';
import 'client_workout_models.dart';

class WorkoutItemControllers {
  WorkoutItemControllers(ClientWorkoutItem item)
    : done = item.result?.done ?? false,
      weight = TextEditingController(
        text: item.result?.actualWeight == null
            ? ''
            : formatNumber(item.result!.actualWeight!),
      ),
      reps = TextEditingController(
        text: item.result?.actualReps?.toString() ?? '',
      ),
      comment = TextEditingController(text: item.result?.clientComment ?? '');

  bool done;
  final TextEditingController weight;
  final TextEditingController reps;
  final TextEditingController comment;

  WorkoutItemResultInput? toInput() {
    final weightText = weight.text.trim().replaceAll(',', '.');
    final repsText = reps.text.trim();
    final actualWeight = weightText.isEmpty ? null : double.tryParse(weightText);
    final actualReps = repsText.isEmpty ? null : int.tryParse(repsText);

    if ((weightText.isNotEmpty && actualWeight == null) ||
        (repsText.isNotEmpty && actualReps == null)) {
      return null;
    }

    return WorkoutItemResultInput(
      done: done,
      actualWeight: actualWeight,
      actualReps: actualReps,
      clientComment: comment.text.trim(),
    );
  }

  void dispose() {
    weight.dispose();
    reps.dispose();
    comment.dispose();
  }
}

class WorkoutItemCard extends StatelessWidget {
  const WorkoutItemCard({
    required this.item,
    required this.controllers,
    required this.enabled,
    this.onDoneChanged,
    super.key,
  });

  final ClientWorkoutItem item;
  final WorkoutItemControllers controllers;
  final bool enabled;
  final ValueChanged<bool>? onDoneChanged;

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
                  onChanged: enabled && onDoneChanged != null
                      ? (value) => onDoneChanged!(value ?? false)
                      : null,
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: controllers.weight,
                    enabled: enabled,
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
                    enabled: enabled,
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
              enabled: enabled,
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

class WorkoutStepView extends StatelessWidget {
  const WorkoutStepView({
    required this.workout,
    required this.stepIndex,
    required this.controllers,
    required this.onDoneChanged,
    this.onBack,
    this.onNext,
    this.onSave,
    this.onFinish,
    this.saving = false,
    super.key,
  });

  final ClientWorkout workout;
  final int stepIndex;
  final Map<String, WorkoutItemControllers> controllers;
  final void Function(String itemId, bool done) onDoneChanged;
  final VoidCallback? onBack;
  final VoidCallback? onNext;
  final VoidCallback? onSave;
  final VoidCallback? onFinish;
  final bool saving;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (workout.items.isEmpty) {
      return const Padding(
        padding: EdgeInsets.all(24),
        child: Center(child: Text('В тренировке нет упражнений')),
      );
    }

    final total = workout.items.length;
    final index = stepIndex.clamp(0, total - 1);
    final item = workout.items[index];
    final isLast = index == total - 1;
    final completed = workout.completedItems;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Упражнение ${index + 1} из $total',
                    style: theme.textTheme.titleSmall,
                  ),
                ),
                Text(
                  '$completed из $total выполнено',
                  style: theme.textTheme.bodySmall,
                ),
              ],
            ),
            const SizedBox(height: 8),
            LinearProgressIndicator(value: (index + 1) / total),
            const SizedBox(height: 12),
            WorkoutItemCard(
              item: item,
              controllers: controllers[item.id]!,
              enabled: true,
              onDoneChanged: (value) => onDoneChanged(item.id, value),
            ),
            const SizedBox(height: 4),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              alignment: WrapAlignment.end,
              children: [
                OutlinedButton.icon(
                  onPressed: saving || index == 0 ? null : onBack,
                  icon: const Icon(Icons.chevron_left),
                  label: const Text('Назад'),
                ),
                TextButton.icon(
                  onPressed: saving ? null : onSave,
                  icon: const Icon(Icons.save_outlined),
                  label: const Text('Сохранить результаты'),
                ),
                if (isLast)
                  FilledButton.icon(
                    onPressed: saving ? null : onFinish,
                    icon: const Icon(Icons.flag_outlined),
                    label: const Text('Закончить тренировку'),
                  )
                else
                  FilledButton.icon(
                    onPressed: saving ? null : onNext,
                    icon: const Icon(Icons.chevron_right),
                    label: const Text('Далее'),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

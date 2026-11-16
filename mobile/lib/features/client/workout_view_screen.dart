import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import 'client_workout_models.dart';
import 'workout_execution.dart';

class WorkoutViewScreen extends StatefulWidget {
  const WorkoutViewScreen({required this.workout, super.key});

  final ClientWorkout workout;

  @override
  State<WorkoutViewScreen> createState() => _WorkoutViewScreenState();
}

class _WorkoutViewScreenState extends State<WorkoutViewScreen> {
  final _controllers = <String, WorkoutItemControllers>{};
  int _step = 0;

  @override
  void initState() {
    super.initState();
    for (final item in widget.workout.items) {
      _controllers[item.id] = WorkoutItemControllers(item);
    }
  }

  @override
  void dispose() {
    for (final controller in _controllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  void _moveStep(int delta) {
    final target = _step + delta;
    if (target < 0 || target >= widget.workout.items.length) {
      return;
    }
    setState(() => _step = target);
  }

  @override
  Widget build(BuildContext context) {
    final workout = widget.workout;
    final theme = Theme.of(context);
    final dateLabel = DateFormat('dd.MM.yyyy').format(workout.dateTime);

    return Scaffold(
      appBar: AppBar(title: Text('Тренировка · $dateLabel')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    spacing: 8,
                    runSpacing: 4,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      Chip(
                        label: Text(workout.statusLabel),
                        visualDensity: VisualDensity.compact,
                      ),
                      Text(
                        workout.gymName ?? 'Зал',
                        style: theme.textTheme.bodySmall,
                      ),
                      if (workout.startTime != null)
                        Text(
                          workout.timeLabel,
                          style: theme.textTheme.bodySmall,
                        ),
                      Text(
                        '${workout.completedItems}/${workout.items.length} выполнено',
                        style: theme.textTheme.bodySmall,
                      ),
                    ],
                  ),
                  if (workout.comment != null &&
                      workout.comment!.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(workout.comment!, style: theme.textTheme.bodyMedium),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
          WorkoutStepView(
            workout: workout,
            stepIndex: _step,
            controllers: _controllers,
            editable: false,
            onDoneChanged: (_, _) {},
            onBack: () => _moveStep(-1),
            onNext: () => _moveStep(1),
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_error.dart';
import '../clients/trainer_client.dart';
import 'workout_models.dart';
import 'workouts_providers.dart';

class WorkoutBuilderScreen extends ConsumerStatefulWidget {
  const WorkoutBuilderScreen({super.key, required this.client});

  final TrainerClient client;

  @override
  ConsumerState<WorkoutBuilderScreen> createState() =>
      _WorkoutBuilderScreenState();
}

class _WorkoutBuilderScreenState extends ConsumerState<WorkoutBuilderScreen> {
  final _commentController = TextEditingController();
  final _selected = <String>{};
  final _fields = <String, _ItemFields>{};

  String? _gymId;
  String? _templateId;
  DateTime _date = DateTime.now();
  bool _submitting = false;

  @override
  void dispose() {
    _commentController.dispose();
    for (final fields in _fields.values) {
      fields.dispose();
    }
    super.dispose();
  }

  void _toggleExercise(String exerciseId, bool selected) {
    setState(() {
      if (selected) {
        _selected.add(exerciseId);
        _fields.putIfAbsent(exerciseId, _ItemFields.new);
      } else {
        _selected.remove(exerciseId);
      }
    });
  }

  void _selectTemplate(
    String? templateId,
    List<WorkoutTemplate> templates,
    List<Exercise> exercises,
  ) {
    WorkoutTemplate? template;
    if (templateId != null) {
      for (final item in templates) {
        if (item.id == templateId) {
          template = item;
          break;
        }
      }
    }

    setState(() {
      _templateId = templateId;
      if (template == null) {
        return;
      }

      for (final fields in _fields.values) {
        fields.dispose();
      }
      _fields.clear();
      _selected.clear();

      final available = exercises.map((item) => item.id).toSet();
      for (final item in template.items) {
        if (!available.contains(item.exerciseId)) {
          continue;
        }
        _selected.add(item.exerciseId);
        _fields[item.exerciseId] = _ItemFields(
          weight: item.plannedWeight,
          sets: item.plannedSets,
          reps: item.plannedReps,
        );
      }
    });
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime(2020),
      lastDate: DateTime(2100),
    );
    if (picked != null) {
      setState(() => _date = picked);
    }
  }

  Future<void> _submit(List<Exercise> exercises) async {
    if (_gymId == null) {
      _showError('Выберите зал');
      return;
    }
    if (_selected.isEmpty) {
      _showError('Выберите хотя бы одно упражнение');
      return;
    }

    final items = <WorkoutItemInput>[];
    for (final exercise in exercises) {
      if (!_selected.contains(exercise.id)) {
        continue;
      }
      final fields = _fields[exercise.id]!;
      final sets = int.tryParse(fields.setsController.text.trim());
      final reps = int.tryParse(fields.repsController.text.trim());
      final weightText = fields.weightController.text.trim();
      final weight = weightText.isEmpty
          ? null
          : double.tryParse(weightText.replaceAll(',', '.'));

      if (sets == null || sets < 1) {
        _showError('Укажите подходы для «${exercise.name}»');
        return;
      }
      if (reps == null || reps < 1) {
        _showError('Укажите повторы для «${exercise.name}»');
        return;
      }
      if (weightText.isNotEmpty && (weight == null || weight < 0)) {
        _showError('Некорректный вес для «${exercise.name}»');
        return;
      }

      items.add(
        WorkoutItemInput(
          exerciseId: exercise.id,
          plannedWeight: weight,
          plannedSets: sets,
          plannedReps: reps,
          order: items.length,
        ),
      );
    }

    setState(() => _submitting = true);
    try {
      final comment = _commentController.text.trim();
      await ref
          .read(workoutsApiProvider)
          .createWorkout(
            clientId: widget.client.id,
            gymId: _gymId!,
            date: DateFormat('yyyy-MM-dd').format(_date),
            templateId: _templateId,
            comment: comment.isEmpty ? null : comment,
            items: items,
          );
      if (!mounted) {
        return;
      }
      Navigator.of(context).pop(true);
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() => _submitting = false);
      _showError(apiErrorMessage(error));
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final gyms = ref.watch(gymsProvider);
    final exercises = ref.watch(exercisesProvider);
    final templates = ref.watch(templatesProvider);

    if (gyms.isLoading || exercises.isLoading || templates.isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Новая тренировка')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    final error = gyms.error ?? exercises.error ?? templates.error;
    if (error != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Новая тренировка')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(apiErrorMessage(error), textAlign: TextAlign.center),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: () {
                    ref.invalidate(gymsProvider);
                    ref.invalidate(exercisesProvider);
                    ref.invalidate(templatesProvider);
                  },
                  child: const Text('Повторить'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final gymList = gyms.requireValue;
    final exerciseList = exercises.requireValue;
    final templateList = templates.requireValue;

    return Scaffold(
      appBar: AppBar(title: Text('Тренировка · ${widget.client.name}')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          _SectionTitle('Зал'),
          DropdownButtonFormField<String>(
            initialValue: _gymId,
            decoration: const InputDecoration(
              border: OutlineInputBorder(),
              hintText: 'Выберите зал',
            ),
            items: gymList
                .map(
                  (gym) => DropdownMenuItem(
                    value: gym.id,
                    child: Text(
                      gym.address == null || gym.address!.isEmpty
                          ? gym.name
                          : '${gym.name} · ${gym.address}',
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                )
                .toList(),
            onChanged: (value) => setState(() => _gymId = value),
          ),
          const SizedBox(height: 20),
          _SectionTitle('Шаблон (необязательно)'),
          DropdownButtonFormField<String>(
            initialValue: _templateId ?? '',
            decoration: const InputDecoration(border: OutlineInputBorder()),
            items: [
              const DropdownMenuItem(value: '', child: Text('Без шаблона')),
              ...templateList.map(
                (template) => DropdownMenuItem(
                  value: template.id,
                  child: Text(template.name, overflow: TextOverflow.ellipsis),
                ),
              ),
            ],
            onChanged: (value) => _selectTemplate(
              value == null || value.isEmpty ? null : value,
              templateList,
              exerciseList,
            ),
          ),
          const SizedBox(height: 20),
          _SectionTitle('Дата'),
          OutlinedButton.icon(
            onPressed: _submitting ? null : _pickDate,
            icon: const Icon(Icons.calendar_today_outlined),
            label: Text(DateFormat('dd.MM.yyyy').format(_date)),
          ),
          const SizedBox(height: 20),
          _SectionTitle('Упражнения'),
          Card(
            margin: EdgeInsets.zero,
            child: Column(
              children: [
                for (final exercise in exerciseList)
                  _ExerciseTile(
                    exercise: exercise,
                    selected: _selected.contains(exercise.id),
                    fields: _fields[exercise.id],
                    enabled: !_submitting,
                    onChanged: (selected) =>
                        _toggleExercise(exercise.id, selected),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          _SectionTitle('Комментарий'),
          TextField(
            controller: _commentController,
            enabled: !_submitting,
            minLines: 1,
            maxLines: 3,
            decoration: const InputDecoration(
              border: OutlineInputBorder(),
              hintText: 'Например: разминка 10 минут',
            ),
          ),
          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: _submitting ? null : () => _submit(exerciseList),
            icon: _submitting
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.check),
            label: Text(_submitting ? 'Отправка…' : 'Назначить тренировку'),
          ),
        ],
      ),
    );
  }
}

class _ExerciseTile extends StatelessWidget {
  const _ExerciseTile({
    required this.exercise,
    required this.selected,
    required this.fields,
    required this.enabled,
    required this.onChanged,
  });

  final Exercise exercise;
  final bool selected;
  final _ItemFields? fields;
  final bool enabled;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        CheckboxListTile(
          value: selected,
          onChanged: enabled ? (value) => onChanged(value ?? false) : null,
          title: Text(exercise.name),
          subtitle: exercise.subtitle.isEmpty ? null : Text(exercise.subtitle),
          controlAffinity: ListTileControlAffinity.leading,
        ),
        if (selected && fields != null)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: fields!.weightController,
                    enabled: enabled,
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                    inputFormatters: [
                      FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]')),
                    ],
                    decoration: const InputDecoration(
                      labelText: 'Вес, кг',
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: fields!.setsController,
                    enabled: enabled,
                    keyboardType: TextInputType.number,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                    decoration: const InputDecoration(
                      labelText: 'Подходы',
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: fields!.repsController,
                    enabled: enabled,
                    keyboardType: TextInputType.number,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                    decoration: const InputDecoration(
                      labelText: 'Повторы',
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                  ),
                ),
              ],
            ),
          ),
        const Divider(height: 1),
      ],
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(text, style: Theme.of(context).textTheme.titleMedium),
    );
  }
}

class _ItemFields {
  _ItemFields({num? weight, int sets = 3, int reps = 10})
    : weightController = TextEditingController(text: weight?.toString() ?? ''),
      setsController = TextEditingController(text: '$sets'),
      repsController = TextEditingController(text: '$reps');

  final TextEditingController weightController;
  final TextEditingController setsController;
  final TextEditingController repsController;

  void dispose() {
    weightController.dispose();
    setsController.dispose();
    repsController.dispose();
  }
}

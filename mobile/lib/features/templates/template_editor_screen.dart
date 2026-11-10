import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_error.dart';
import '../workouts/workout_models.dart';
import '../workouts/workouts_providers.dart';

class TemplateEditorScreen extends ConsumerStatefulWidget {
  const TemplateEditorScreen({super.key, this.template});

  final WorkoutTemplate? template;

  @override
  ConsumerState<TemplateEditorScreen> createState() =>
      _TemplateEditorScreenState();
}

class _TemplateEditorScreenState extends ConsumerState<TemplateEditorScreen> {
  late final TextEditingController _nameController;
  late final TextEditingController _descriptionController;
  final _selected = <String>{};
  final _fields = <String, _Fields>{};
  bool _saving = false;

  bool get _isEditing => widget.template != null;

  @override
  void initState() {
    super.initState();
    final template = widget.template;
    _nameController = TextEditingController(text: template?.name ?? '');
    _descriptionController = TextEditingController(
      text: template?.description ?? '',
    );
    if (template != null) {
      for (final item in template.items) {
        _selected.add(item.exerciseId);
        _fields[item.exerciseId] = _Fields(
          weight: item.plannedWeight,
          sets: item.plannedSets,
          reps: item.plannedReps,
        );
      }
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    for (final fields in _fields.values) {
      fields.dispose();
    }
    super.dispose();
  }

  void _toggleExercise(String exerciseId, bool selected) {
    setState(() {
      if (selected) {
        _selected.add(exerciseId);
        _fields.putIfAbsent(exerciseId, _Fields.new);
      } else {
        _selected.remove(exerciseId);
      }
    });
  }

  Future<void> _save(List<Exercise> exercises) async {
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      _showError('Введите название шаблона');
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

    if (items.isEmpty) {
      _showError('Выберите хотя бы одно упражнение');
      return;
    }

    setState(() => _saving = true);
    try {
      final description = _descriptionController.text.trim();
      final api = ref.read(workoutsApiProvider);
      if (_isEditing) {
        await api.updateTemplate(
          id: widget.template!.id,
          name: name,
          description: description.isEmpty ? null : description,
          items: items,
        );
      } else {
        await api.createTemplate(
          name: name,
          description: description.isEmpty ? null : description,
          items: items,
        );
      }
      ref.invalidate(templatesProvider);
      if (!mounted) {
        return;
      }
      Navigator.of(context).pop(true);
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() => _saving = false);
      _showError(apiErrorMessage(error));
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final exercises = ref.watch(exercisesProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(_isEditing ? 'Изменить шаблон' : 'Новый шаблон'),
      ),
      body: switch (exercises) {
        AsyncData(:final value) => _buildForm(value),
        AsyncError(:final error) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(apiErrorMessage(error), textAlign: TextAlign.center),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: () => ref.invalidate(exercisesProvider),
                  child: const Text('Повторить'),
                ),
              ],
            ),
          ),
        ),
        _ => const Center(child: CircularProgressIndicator()),
      },
    );
  }

  Widget _buildForm(List<Exercise> exercises) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      children: [
        const _SectionTitle('Название'),
        TextField(
          controller: _nameController,
          enabled: !_saving,
          decoration: const InputDecoration(
            border: OutlineInputBorder(),
            hintText: 'Например: Грудь + трицепс',
          ),
        ),
        const SizedBox(height: 20),
        const _SectionTitle('Описание'),
        TextField(
          controller: _descriptionController,
          enabled: !_saving,
          minLines: 1,
          maxLines: 3,
          decoration: const InputDecoration(
            border: OutlineInputBorder(),
            hintText: 'Необязательно',
          ),
        ),
        const SizedBox(height: 20),
        const _SectionTitle('Упражнения'),
        Card(
          margin: EdgeInsets.zero,
          child: Column(
            children: [
              for (final exercise in exercises)
                _ExerciseTile(
                  exercise: exercise,
                  selected: _selected.contains(exercise.id),
                  fields: _fields[exercise.id],
                  enabled: !_saving,
                  onChanged: (selected) =>
                      _toggleExercise(exercise.id, selected),
                ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        FilledButton.icon(
          onPressed: _saving ? null : () => _save(exercises),
          icon: _saving
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Icon(Icons.save),
          label: Text(_saving ? 'Сохранение…' : 'Сохранить шаблон'),
        ),
      ],
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
  final _Fields? fields;
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

class _Fields {
  _Fields({num? weight, int sets = 3, int reps = 10})
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

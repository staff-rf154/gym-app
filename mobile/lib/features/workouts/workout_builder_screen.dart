import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_error.dart';
import '../client/client_workout_models.dart';
import '../clients/clients_providers.dart';
import '../clients/trainer_client.dart';
import 'workout_models.dart';
import 'workouts_providers.dart';

class WorkoutBuilderScreen extends ConsumerStatefulWidget {
  const WorkoutBuilderScreen({
    super.key,
    this.client,
    this.workout,
    this.initialDate,
    this.initialClientId,
  });

  final TrainerClient? client;
  final ClientWorkout? workout;
  final DateTime? initialDate;
  final String? initialClientId;

  @override
  ConsumerState<WorkoutBuilderScreen> createState() =>
      _WorkoutBuilderScreenState();
}

class _WorkoutBuilderScreenState extends ConsumerState<WorkoutBuilderScreen> {
  late final TextEditingController _commentController;
  final _selected = <String>{};
  final _fields = <String, _ItemFields>{};

  String? _gymId;
  String? _templateId;
  TrainerClient? _client;
  String? _startTime;
  late DateTime _date;
  bool _submitting = false;

  bool get _isEditing => widget.workout != null;

  @override
  void initState() {
    super.initState();
    final workout = widget.workout;
    _client = widget.client;
    _commentController = TextEditingController(text: workout?.comment ?? '');
    _gymId = workout?.gymId;
    _templateId = workout?.templateId;
    _startTime = workout?.startTime;
    _date = workout?.dateTime ?? widget.initialDate ?? DateTime.now();

    if (workout != null) {
      for (final item in workout.items) {
        _selected.add(item.exerciseId);
        _fields[item.exerciseId] = _ItemFields(
          weight: item.plannedWeight,
          sets: item.plannedSets,
          reps: item.plannedReps,
          equipmentId: item.equipmentId,
          result: item.result,
        );
      }
    }
  }

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
          equipmentId: item.equipmentId,
        );
      }
    });
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final picked = await showDatePicker(
      context: context,
      initialDate: _date.isBefore(today) ? today : _date,
      firstDate: today,
      lastDate: DateTime(2100),
    );
    if (picked != null) {
      setState(() => _date = picked);
    }
  }

  Future<void> _pickTime() async {
    final initial = _startTime == null
        ? TimeOfDay.now()
        : TimeOfDay(
            hour: int.parse(_startTime!.split(':').first),
            minute: int.parse(_startTime!.split(':').last),
          );
    final picked = await showTimePicker(context: context, initialTime: initial);
    if (picked != null) {
      setState(() {
        _startTime =
            '${picked.hour.toString().padLeft(2, '0')}:'
            '${picked.minute.toString().padLeft(2, '0')}';
      });
    }
  }

  Future<void> _pickClient(List<TrainerClient> clients) async {
    var query = '';
    final selected = await showModalBottomSheet<TrainerClient>(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            final filtered = clients
                .where(
                  (client) =>
                      client.name.toLowerCase().contains(query.toLowerCase()),
                )
                .toList();
            return SafeArea(
              child: SizedBox(
                height: MediaQuery.sizeOf(context).height * 0.75,
                child: Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                      child: TextField(
                        autofocus: true,
                        decoration: const InputDecoration(
                          hintText: 'Поиск клиента по ФИО',
                          prefixIcon: Icon(Icons.search),
                          border: OutlineInputBorder(),
                          isDense: true,
                        ),
                        onChanged: (value) =>
                            setSheetState(() => query = value.trim()),
                      ),
                    ),
                    Expanded(
                      child: filtered.isEmpty
                          ? const Center(child: Text('Ничего не найдено'))
                          : ListView.builder(
                              itemCount: filtered.length,
                              itemBuilder: (context, index) {
                                final client = filtered[index];
                                return ListTile(
                                  leading: CircleAvatar(
                                    child: Text(client.initials),
                                  ),
                                  title: Text(client.name),
                                  onTap: () =>
                                      Navigator.of(context).pop(client),
                                );
                              },
                            ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
    if (selected != null) {
      setState(() => _client = selected);
    }
  }

  Future<void> _submit(List<Exercise> exercises) async {
    if (_client == null) {
      _showError('Выберите клиента');
      return;
    }
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
          equipmentId: fields.equipmentId,
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
      final api = ref.read(workoutsApiProvider);
      final workout = widget.workout;
      if (workout == null) {
        await api.createWorkout(
          clientId: _client!.id,
          gymId: _gymId!,
          date: DateFormat('yyyy-MM-dd').format(_date),
          templateId: _templateId,
          comment: comment.isEmpty ? null : comment,
          startTime: _startTime,
          items: items,
        );
      } else {
        await api.updateWorkout(
          id: workout.id,
          clientId: _client!.id,
          gymId: _gymId!,
          date: DateFormat('yyyy-MM-dd').format(_date),
          templateId: _templateId,
          comment: comment.isEmpty ? null : comment,
          startTime: _startTime,
          items: items,
        );
      }
      ref.invalidate(trainerClientWorkoutsProvider(_client!.id));
      if (workout != null) {
        ref.invalidate(trainerWorkoutProvider(workout.id));
      }
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
    final clients = widget.client == null
        ? ref.watch(myClientsProvider)
        : null;

    if (gyms.isLoading ||
        exercises.isLoading ||
        templates.isLoading ||
        (clients?.isLoading ?? false)) {
      return Scaffold(
        appBar: AppBar(title: Text(_title)),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    final error =
        gyms.error ?? exercises.error ?? templates.error ?? clients?.error;
    if (error != null) {
      return Scaffold(
        appBar: AppBar(title: Text(_title)),
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
    final clientList = clients?.requireValue ?? const <TrainerClient>[];
    final equipmentList = _gymId == null
        ? const <GymEquipment>[]
        : switch (ref.watch(gymEquipmentProvider(_gymId!))) {
            AsyncData(:final value) => value,
            _ => const <GymEquipment>[],
          };

    return Scaffold(
      appBar: AppBar(
        title: Text(
          _client == null ? _title : '$_title · ${_client!.name}',
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          if (widget.client == null) ...[
            _SectionTitle('Клиент'),
            Card(
              margin: EdgeInsets.zero,
              child: ListTile(
                leading: const Icon(Icons.person_outline),
                title: Text(_client?.name ?? 'Выберите клиента'),
                trailing: const Icon(Icons.chevron_right),
                onTap: _submitting
                    ? null
                    : () => _pickClient(clientList),
              ),
            ),
            const SizedBox(height: 20),
          ],
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
            onChanged: _submitting
                ? null
                : (value) => setState(() => _gymId = value),
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
            onChanged: _submitting
                ? null
                : (value) => _selectTemplate(
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
          const SizedBox(height: 8),
          _SectionTitle('Время начала (необязательно)'),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _submitting ? null : _pickTime,
                  icon: const Icon(Icons.schedule),
                  label: Text(_startTime ?? 'Не задано'),
                ),
              ),
              if (_startTime != null)
                IconButton(
                  onPressed: _submitting
                      ? null
                      : () => setState(() => _startTime = null),
                  icon: const Icon(Icons.clear),
                  tooltip: 'Очистить время',
                ),
            ],
          ),
          const SizedBox(height: 20),
          _SectionTitle('Упражнения'),
          if (equipmentList.isEmpty)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(
                _gymId == null
                    ? 'Выберите зал, чтобы увидеть доступные тренажёры.'
                    : 'В выбранном зале нет тренажёров.',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
          Card(
            margin: EdgeInsets.zero,
            child: Column(
              children: [
                for (final exercise in exerciseList)
                  _ExerciseTile(
                    exercise: exercise,
                    selected: _selected.contains(exercise.id),
                    fields: _fields[exercise.id],
                    equipment: equipmentList,
                    enabled: !_submitting,
                    onChanged: (selected) =>
                        _toggleExercise(exercise.id, selected),
                    onEquipmentChanged: (equipmentId) {
                      setState(
                        () => _fields[exercise.id]?.equipmentId = equipmentId,
                      );
                    },
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
                : Icon(_isEditing ? Icons.save : Icons.check),
            label: Text(
              _submitting
                  ? 'Сохранение…'
                  : _isEditing
                  ? 'Сохранить изменения'
                  : 'Назначить тренировку',
            ),
          ),
        ],
      ),
    );
  }

  String get _title =>
      _isEditing ? 'Редактирование тренировки' : 'Новая тренировка';
}

class _ExerciseTile extends StatelessWidget {
  const _ExerciseTile({
    required this.exercise,
    required this.selected,
    required this.fields,
    required this.equipment,
    required this.enabled,
    required this.onChanged,
    required this.onEquipmentChanged,
  });

  final Exercise exercise;
  final bool selected;
  final _ItemFields? fields;
  final List<GymEquipment> equipment;
  final bool enabled;
  final ValueChanged<bool> onChanged;
  final ValueChanged<String?> onEquipmentChanged;

  @override
  Widget build(BuildContext context) {
    final field = fields;
    final equipmentId = equipment.any(
      (item) => item.id == field?.equipmentId,
    )
        ? field!.equipmentId
        : null;

    return Column(
      children: [
        CheckboxListTile(
          value: selected,
          onChanged: enabled ? (value) => onChanged(value ?? false) : null,
          title: Text(exercise.name),
          subtitle: exercise.subtitle.isEmpty ? null : Text(exercise.subtitle),
          controlAffinity: ListTileControlAffinity.leading,
        ),
        if (selected && field != null)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (exercise.requiresEquipment && equipment.isNotEmpty) ...[
                  DropdownButtonFormField<String>(
                    initialValue: equipmentId,
                    decoration: const InputDecoration(
                      labelText: 'Тренажёр',
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                    items: equipment
                        .map(
                          (item) => DropdownMenuItem(
                            value: item.id,
                            child: Text(
                              item.weightRangeLabel.isEmpty
                                  ? item.name
                                  : '${item.name} · ${item.weightRangeLabel}',
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        )
                        .toList(),
                    onChanged: enabled ? onEquipmentChanged : null,
                  ),
                  const SizedBox(height: 8),
                ],
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: field.weightController,
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
                        controller: field.setsController,
                        enabled: enabled,
                        keyboardType: TextInputType.number,
                        inputFormatters: [
                          FilteringTextInputFormatter.digitsOnly,
                        ],
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
                        controller: field.repsController,
                        enabled: enabled,
                        keyboardType: TextInputType.number,
                        inputFormatters: [
                          FilteringTextInputFormatter.digitsOnly,
                        ],
                        decoration: const InputDecoration(
                          labelText: 'Повторы',
                          border: OutlineInputBorder(),
                          isDense: true,
                        ),
                      ),
                    ),
                  ],
                ),
                if (field.result != null) ...[
                  const SizedBox(height: 8),
                  _ResultLabel(result: field.result!),
                ],
              ],
            ),
          ),
        const Divider(height: 1),
      ],
    );
  }
}

class _ResultLabel extends StatelessWidget {
  const _ResultLabel({required this.result});

  final ClientWorkoutItemResult result;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final parts = <String>[
      result.done ? 'Выполнено' : 'Не выполнено',
      if (result.actualWeight != null)
        '${formatNumber(result.actualWeight!)} кг',
      if (result.actualReps != null) '${result.actualReps} повт.',
      if (result.clientComment != null && result.clientComment!.isNotEmpty)
        result.clientComment!,
    ];

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(
          result.done ? Icons.check_circle : Icons.radio_button_unchecked,
          size: 18,
          color: result.done
              ? theme.colorScheme.primary
              : theme.colorScheme.outline,
        ),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            'Клиент: ${parts.join(' · ')}',
            style: theme.textTheme.bodySmall,
          ),
        ),
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
  _ItemFields({
    num? weight,
    int sets = 3,
    int reps = 10,
    this.equipmentId,
    this.result,
  }) : weightController = TextEditingController(
         text: weight == null ? '' : formatNumber(weight.toDouble()),
       ),
       setsController = TextEditingController(text: '$sets'),
       repsController = TextEditingController(text: '$reps');

  final TextEditingController weightController;
  final TextEditingController setsController;
  final TextEditingController repsController;
  String? equipmentId;
  final ClientWorkoutItemResult? result;

  void dispose() {
    weightController.dispose();
    setsController.dispose();
    repsController.dispose();
  }
}

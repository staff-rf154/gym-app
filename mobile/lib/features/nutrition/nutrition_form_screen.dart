import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_error.dart';
import 'nutrition_models.dart';
import 'nutrition_providers.dart';

class NutritionFormScreen extends ConsumerStatefulWidget {
  const NutritionFormScreen({super.key, required this.clientId});

  final String clientId;

  @override
  ConsumerState<NutritionFormScreen> createState() =>
      _NutritionFormScreenState();
}

class _NutritionFormScreenState extends ConsumerState<NutritionFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _kcal = TextEditingController();
  final _protein = TextEditingController();
  final _fat = TextEditingController();
  final _carbs = TextEditingController();
  final _comment = TextEditingController();

  NutritionType _type = NutritionType.daily;
  DateTime? _validFrom;
  DateTime? _validTo;
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _kcal.dispose();
    _protein.dispose();
    _fat.dispose();
    _carbs.dispose();
    _comment.dispose();
    super.dispose();
  }

  String? _numberValidator(String? value) {
    final text = value?.trim() ?? '';
    if (text.isEmpty) {
      return null;
    }
    final parsed = double.tryParse(text.replaceAll(',', '.'));
    if (parsed == null) {
      return 'Введите число';
    }
    if (parsed < 0) {
      return 'Не может быть отрицательным';
    }
    return null;
  }

  double? _number(TextEditingController controller) {
    final text = controller.text.trim().replaceAll(',', '.');
    return text.isEmpty ? null : double.tryParse(text);
  }

  Future<void> _pickDate({required bool isFrom}) async {
    final now = DateTime.now();
    final initial = (isFrom ? _validFrom : _validTo) ?? now;
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(2020),
      lastDate: DateTime(now.year + 5),
    );
    if (picked == null) {
      return;
    }
    setState(() {
      if (isFrom) {
        _validFrom = picked;
      } else {
        _validTo = picked;
      }
    });
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }
    if (_validFrom != null &&
        _validTo != null &&
        _validFrom!.isAfter(_validTo!)) {
      setState(() => _error = 'Дата начала позже даты окончания');
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });

    try {
      await ref
          .read(nutritionApiProvider)
          .create(
            widget.clientId,
            NutritionInput(
              type: _type,
              kcal: _number(_kcal),
              protein: _number(_protein),
              fat: _number(_fat),
              carbs: _number(_carbs),
              comment: _comment.text,
              validFrom: _validFrom,
              validTo: _validTo,
            ),
          );
      if (mounted) {
        Navigator.of(context).pop(true);
      }
    } catch (error) {
      if (mounted) {
        setState(() => _error = apiErrorMessage(error));
      }
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('dd.MM.yyyy');

    return Scaffold(
      appBar: AppBar(title: const Text('Назначить питание')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            DropdownButtonFormField<NutritionType>(
              initialValue: _type,
              decoration: const InputDecoration(
                labelText: 'Тип',
                border: OutlineInputBorder(),
              ),
              items: [
                for (final type in NutritionType.values)
                  DropdownMenuItem(value: type, child: Text(type.label)),
              ],
              onChanged: (value) {
                if (value != null) {
                  setState(() => _type = value);
                }
              },
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _NumberField(
                    controller: _kcal,
                    label: 'Ккал',
                    validator: _numberValidator,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _NumberField(
                    controller: _protein,
                    label: 'Белки, г',
                    validator: _numberValidator,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _NumberField(
                    controller: _fat,
                    label: 'Жиры, г',
                    validator: _numberValidator,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _NumberField(
                    controller: _carbs,
                    label: 'Углеводы, г',
                    validator: _numberValidator,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _comment,
              minLines: 2,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'Комментарий',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            _DateField(
              label: 'Действует с',
              value: _validFrom == null ? null : dateFormat.format(_validFrom!),
              onPick: () => _pickDate(isFrom: true),
              onClear: () => setState(() => _validFrom = null),
            ),
            const SizedBox(height: 8),
            _DateField(
              label: 'Действует по',
              value: _validTo == null ? null : dateFormat.format(_validTo!),
              onPick: () => _pickDate(isFrom: false),
              onClear: () => setState(() => _validTo = null),
            ),
            if (_error != null) ...[
              const SizedBox(height: 16),
              Text(
                _error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ],
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _saving ? null : _save,
              child: _saving
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Назначить'),
            ),
          ],
        ),
      ),
    );
  }
}

class _NumberField extends StatelessWidget {
  const _NumberField({
    required this.controller,
    required this.label,
    required this.validator,
  });

  final TextEditingController controller;
  final String label;
  final String? Function(String?) validator;

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      keyboardType: const TextInputType.numberWithOptions(decimal: true),
      decoration: InputDecoration(
        labelText: label,
        border: const OutlineInputBorder(),
      ),
      validator: validator,
    );
  }
}

class _DateField extends StatelessWidget {
  const _DateField({
    required this.label,
    required this.value,
    required this.onPick,
    required this.onClear,
  });

  final String label;
  final String? value;
  final VoidCallback onPick;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onPick,
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          border: const OutlineInputBorder(),
          suffixIcon: value == null
              ? const Icon(Icons.calendar_today, size: 18)
              : IconButton(
                  tooltip: 'Очистить',
                  icon: const Icon(Icons.clear, size: 18),
                  onPressed: onClear,
                ),
        ),
        child: Text(value ?? 'Не ограничено'),
      ),
    );
  }
}

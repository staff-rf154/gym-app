import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_error.dart';
import '../../core/widgets/empty_state.dart';
import '../clients/clients_providers.dart';
import '../clients/trainer_client.dart';
import 'weight_measurement.dart';
import 'weights_providers.dart';

class WeightTab extends ConsumerWidget {
  const WeightTab({super.key, required this.client});

  final TrainerClient client;

  Future<void> _addMeasurement(BuildContext context, WidgetRef ref) async {
    final saved = await showDialog<bool>(
      context: context,
      builder: (_) => _AddMeasurementDialog(clientId: client.id),
    );
    if (saved == true) {
      ref.invalidate(weightMeasurementsProvider(client.id));
      ref.invalidate(myClientsProvider);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final measurements = ref.watch(weightMeasurementsProvider(client.id));

    return switch (measurements) {
      AsyncData(:final value) => _WeightContent(
        client: client,
        measurements: value,
        onRefresh: () async {
          ref.invalidate(weightMeasurementsProvider(client.id));
          ref.invalidate(myClientsProvider);
        },
        onAdd: () => _addMeasurement(context, ref),
      ),
      AsyncError(:final error) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.cloud_off, size: 48),
              const SizedBox(height: 16),
              Text(apiErrorMessage(error), textAlign: TextAlign.center),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () =>
                    ref.invalidate(weightMeasurementsProvider(client.id)),
                child: const Text('Повторить'),
              ),
            ],
          ),
        ),
      ),
      _ => const Center(child: CircularProgressIndicator()),
    };
  }
}

class _WeightContent extends StatelessWidget {
  const _WeightContent({
    required this.client,
    required this.measurements,
    required this.onRefresh,
    required this.onAdd,
  });

  final TrainerClient client;
  final List<WeightMeasurement> measurements;
  final Future<void> Function() onRefresh;
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    final start =
        client.startWeight ??
        (measurements.isNotEmpty ? measurements.last.weight : null);
    final current = measurements.isNotEmpty
        ? measurements.first.weight
        : client.currentWeight;
    final delta = start != null && current != null ? current - start : null;

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Card(
                margin: EdgeInsets.zero,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Expanded(
                        child: _Metric(
                          label: 'Старт',
                          value: start == null
                              ? '—'
                              : '${formatNumber(start)} кг',
                        ),
                      ),
                      const Icon(Icons.arrow_forward),
                      Expanded(
                        child: _Metric(
                          label: 'Сейчас',
                          value: current == null
                              ? '—'
                              : '${formatNumber(current)} кг',
                          alignEnd: true,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _Metric(
                          label: 'Δ',
                          value: delta == null
                              ? '—'
                              : '${delta > 0 ? '+' : ''}'
                                    '${formatNumber(delta)} кг',
                          alignEnd: true,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Align(
                alignment: Alignment.centerRight,
                child: FilledButton.icon(
                  onPressed: onAdd,
                  icon: const Icon(Icons.add),
                  label: const Text('Добавить замер'),
                ),
              ),
            ],
          ),
        ),
        const Divider(height: 1),
        Expanded(
          child: measurements.isEmpty
              ? RefreshIndicator(
                  onRefresh: onRefresh,
                  child: ListView(
                    children: [
                      const SizedBox(height: 40),
                      const EmptyState(message: 'Замеров пока нет'),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: onRefresh,
                  child: ListView.separated(
                    itemCount: measurements.length,
                    separatorBuilder: (_, _) => const Divider(height: 1),
                    itemBuilder: (context, index) {
                      final measurement = measurements[index];
                      return ListTile(
                        leading: const CircleAvatar(
                          child: Icon(Icons.monitor_weight_outlined),
                        ),
                        title: Text(
                          '${formatNumber(measurement.weight)} кг'
                          '${measurement.fatMass == null ? '' : ' · жир ${formatNumber(measurement.fatMass!)}%'}',
                        ),
                        subtitle: Text(
                          [
                            DateFormat('dd.MM.yyyy HH:mm')
                                .format(measurement.measuredAt),
                            if (measurement.comment != null &&
                                measurement.comment!.isNotEmpty)
                              measurement.comment!,
                          ].join(' · '),
                        ),
                      );
                    },
                  ),
                ),
        ),
      ],
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({
    required this.label,
    required this.value,
    this.alignEnd = false,
  });

  final String label;
  final String value;
  final bool alignEnd;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: alignEnd
          ? CrossAxisAlignment.end
          : CrossAxisAlignment.start,
      children: [
        Text(label, style: theme.textTheme.labelMedium),
        const SizedBox(height: 4),
        Text(
          value,
          style: theme.textTheme.titleMedium,
          textAlign: alignEnd ? TextAlign.end : TextAlign.start,
        ),
      ],
    );
  }
}

class _AddMeasurementDialog extends ConsumerStatefulWidget {
  const _AddMeasurementDialog({required this.clientId});

  final String clientId;

  @override
  ConsumerState<_AddMeasurementDialog> createState() =>
      _AddMeasurementDialogState();
}

class _AddMeasurementDialogState extends ConsumerState<_AddMeasurementDialog> {
  final _weightController = TextEditingController();
  final _fatController = TextEditingController();
  final _commentController = TextEditingController();
  DateTime _measuredAt = DateTime.now();
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _weightController.dispose();
    _fatController.dispose();
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _measuredAt,
      firstDate: DateTime(2020),
      lastDate: DateTime(2100),
    );
    if (picked != null) {
      setState(() {
        _measuredAt = DateTime(
          picked.year,
          picked.month,
          picked.day,
          _measuredAt.hour,
          _measuredAt.minute,
        );
      });
    }
  }

  Future<void> _save() async {
    final weight = double.tryParse(
      _weightController.text.trim().replaceAll(',', '.'),
    );
    if (weight == null || weight <= 0) {
      setState(() => _error = 'Укажите корректный вес');
      return;
    }

    final fatText = _fatController.text.trim();
    final fat = fatText.isEmpty
        ? null
        : double.tryParse(fatText.replaceAll(',', '.'));
    if (fat != null && (fat < 0 || fat > 100)) {
      setState(() => _error = 'Жир должен быть от 0 до 100%');
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });

    try {
      final comment = _commentController.text.trim();
      await ref
          .read(weightsApiProvider)
          .create(
            clientId: widget.clientId,
            weight: weight,
            fatMass: fat,
            measuredAt: _measuredAt,
            comment: comment.isEmpty ? null : comment,
          );
      if (!mounted) {
        return;
      }
      Navigator.of(context).pop(true);
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _saving = false;
        _error = apiErrorMessage(error);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Новый замер'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _weightController,
              enabled: !_saving,
              autofocus: true,
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
              ),
              inputFormatters: [
                FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]')),
              ],
              decoration: const InputDecoration(
                labelText: 'Вес, кг',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _fatController,
              enabled: !_saving,
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
              ),
              inputFormatters: [
                FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]')),
              ],
              decoration: const InputDecoration(
                labelText: 'Жир, % (необязательно)',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: _saving ? null : _pickDate,
              icon: const Icon(Icons.calendar_today_outlined),
              label: Text(DateFormat('dd.MM.yyyy HH:mm').format(_measuredAt)),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _commentController,
              enabled: !_saving,
              maxLines: 2,
              decoration: const InputDecoration(
                labelText: 'Комментарий',
                border: OutlineInputBorder(),
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(
                _error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _saving ? null : () => Navigator.of(context).pop(false),
          child: const Text('Отмена'),
        ),
        FilledButton(
          onPressed: _saving ? null : _save,
          child: _saving
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('Сохранить'),
        ),
      ],
    );
  }
}

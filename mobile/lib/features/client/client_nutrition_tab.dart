import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_error.dart';
import '../nutrition/nutrition_models.dart';
import '../nutrition/nutrition_providers.dart';

class ClientNutritionTab extends ConsumerStatefulWidget {
  const ClientNutritionTab({super.key});

  @override
  ConsumerState<ClientNutritionTab> createState() => _ClientNutritionTabState();
}

class _ClientNutritionTabState extends ConsumerState<ClientNutritionTab> {
  late DateTime _date;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _date = DateTime(now.year, now.month, now.day);
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime(2020),
      lastDate: DateTime(2100),
    );
    if (picked != null) {
      setState(() => _date = DateTime(picked.year, picked.month, picked.day));
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final recommendations = ref.watch(clientDailyNutritionProvider(_date));

    return RefreshIndicator(
      onRefresh: () async =>
          ref.invalidate(clientDailyNutritionProvider(_date)),
      child: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          Card(
            margin: EdgeInsets.zero,
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  const Icon(Icons.calendar_today_outlined),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Дата', style: theme.textTheme.bodySmall),
                        Text(
                          DateFormat('dd.MM.yyyy').format(_date),
                          style: theme.textTheme.titleMedium,
                        ),
                      ],
                    ),
                  ),
                  OutlinedButton(
                    onPressed: _pickDate,
                    child: const Text('Выбрать'),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          switch (recommendations) {
            AsyncData(:final value) =>
              value.isEmpty
                  ? const Card(
                      margin: EdgeInsets.zero,
                      child: Padding(
                        padding: EdgeInsets.all(24),
                        child: Center(
                          child: Text(
                            'На выбранную дату рекомендаций по питанию нет',
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ),
                    )
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (value.any((item) => item.isActive)) ...[
                          const Padding(
                            padding: EdgeInsets.fromLTRB(4, 0, 4, 6),
                            child: Text('Активные'),
                          ),
                          for (final item
                              in value.where((item) => item.isActive))
                            _ClientRecommendationCard(recommendation: item),
                        ],
                        if (value.any((item) => !item.isActive)) ...[
                          const Padding(
                            padding: EdgeInsets.fromLTRB(4, 12, 4, 6),
                            child: Text('Архив'),
                          ),
                          for (final item
                              in value.where((item) => !item.isActive))
                            _ClientRecommendationCard(recommendation: item),
                        ],
                      ],
                    ),
            AsyncError(:final error) => Card(
              margin: EdgeInsets.zero,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Text(apiErrorMessage(error), textAlign: TextAlign.center),
                    const SizedBox(height: 8),
                    FilledButton(
                      onPressed: () =>
                          ref.invalidate(clientDailyNutritionProvider(_date)),
                      child: const Text('Повторить'),
                    ),
                  ],
                ),
              ),
            ),
            _ => const Padding(
              padding: EdgeInsets.all(24),
              child: Center(child: CircularProgressIndicator()),
            ),
          },
        ],
      ),
    );
  }
}

class _ClientRecommendationCard extends StatelessWidget {
  const _ClientRecommendationCard({required this.recommendation});

  final NutritionRecommendation recommendation;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      color: recommendation.isActive
          ? null
          : theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Chip(
                  label: Text(recommendation.type.label),
                  visualDensity: VisualDensity.compact,
                ),
                const Spacer(),
                Text(_period(recommendation), style: theme.textTheme.bodySmall),
              ],
            ),
            const SizedBox(height: 8),
            Text(recommendation.macrosLabel, style: theme.textTheme.titleSmall),
            if (recommendation.comment != null &&
                recommendation.comment!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(recommendation.comment!),
            ],
          ],
        ),
      ),
    );
  }

  static String _period(NutritionRecommendation recommendation) {
    final format = DateFormat('dd.MM.yyyy');
    final from = recommendation.validFrom;
    final to = recommendation.validTo;
    if (from == null && to == null) {
      return 'Без ограничения по дате';
    }
    if (from != null && to != null) {
      return '${format.format(from)} — ${format.format(to)}';
    }
    if (from != null) {
      return 'с ${format.format(from)}';
    }
    return 'до ${format.format(to!)}';
  }
}

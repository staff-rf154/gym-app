import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_error.dart';
import '../clients/trainer_client.dart';
import 'nutrition_form_screen.dart';
import 'nutrition_models.dart';
import 'nutrition_providers.dart';

class NutritionTab extends ConsumerWidget {
  const NutritionTab({super.key, required this.client});

  final TrainerClient client;

  Future<void> _add(BuildContext context, WidgetRef ref) async {
    final created = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => NutritionFormScreen(clientId: client.id),
      ),
    );
    if (created == true && context.mounted) {
      ref.invalidate(clientNutritionProvider(client.id));
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Рекомендация по питанию назначена')),
      );
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final recommendations = ref.watch(clientNutritionProvider(client.id));

    return ListView(
      padding: const EdgeInsets.all(12),
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                'Питание',
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ),
            FilledButton.icon(
              onPressed: () => _add(context, ref),
              icon: const Icon(Icons.add),
              label: const Text('Назначить'),
            ),
          ],
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
                        child: Text('Рекомендации по питанию ещё не назначены'),
                      ),
                    ),
                  )
                : Column(
                    children: [
                      for (final item in value)
                        _RecommendationCard(recommendation: item),
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
                        ref.invalidate(clientNutritionProvider(client.id)),
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
    );
  }
}

class _RecommendationCard extends StatelessWidget {
  const _RecommendationCard({required this.recommendation});

  final NutritionRecommendation recommendation;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
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

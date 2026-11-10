import 'dart:math' as math;

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_error.dart';
import '../clients/trainer_client.dart';
import 'exercise_progress_screen.dart';
import 'report_models.dart';
import 'reports_providers.dart';

class ProgressTab extends StatelessWidget {
  const ProgressTab({super.key, required this.client});

  final TrainerClient client;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(12),
      children: [
        _WeightChartSection(clientId: client.id),
        const SizedBox(height: 12),
        _ExerciseSummarySection(clientId: client.id, clientName: client.name),
      ],
    );
  }
}

class _WeightChartSection extends ConsumerWidget {
  const _WeightChartSection({required this.clientId});

  final String clientId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dynamics = ref.watch(weightDynamicsProvider(clientId));

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Динамика веса',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 12),
            switch (dynamics) {
              AsyncData(:final value) =>
                value.isEmpty
                    ? const Padding(
                        padding: EdgeInsets.symmetric(vertical: 24),
                        child: Center(child: Text('Нет замеров веса')),
                      )
                    : Column(
                        children: [
                          SizedBox(
                            height: 220,
                            child: LineChart(_chartData(value)),
                          ),
                          const SizedBox(height: 12),
                          const Wrap(
                            spacing: 16,
                            runSpacing: 8,
                            children: [
                              _LegendItem(color: Colors.blue, label: 'Вес, кг'),
                              _LegendItem(
                                color: Colors.deepOrange,
                                label: 'Жир, %',
                              ),
                            ],
                          ),
                        ],
                      ),
              AsyncError(:final error) => _ErrorBox(
                message: apiErrorMessage(error),
                onRetry: () => ref.invalidate(weightDynamicsProvider(clientId)),
              ),
              _ => const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(child: CircularProgressIndicator()),
              ),
            },
          ],
        ),
      ),
    );
  }

  LineChartData _chartData(List<WeightDynamicsPoint> points) {
    final weightSpots = <FlSpot>[
      for (var index = 0; index < points.length; index++)
        FlSpot(index.toDouble(), points[index].weight),
    ];
    final fatSpots = <FlSpot>[
      for (var index = 0; index < points.length; index++)
        if (points[index].fatMass != null)
          FlSpot(index.toDouble(), points[index].fatMass!),
    ];

    final values = <double>[
      ...points.map((point) => point.weight),
      for (final point in points)
        if (point.fatMass != null) point.fatMass!,
    ];
    var minY = values.reduce(math.min);
    var maxY = values.reduce(math.max);
    if (minY == maxY) {
      minY -= 1;
      maxY += 1;
    } else {
      final padding = (maxY - minY) * 0.15;
      minY -= padding;
      maxY += padding;
    }

    final maxX = points.length <= 1 ? 1.0 : (points.length - 1).toDouble();
    final step = (points.length / 4).ceil().clamp(1, points.length);

    return LineChartData(
      minX: 0,
      maxX: maxX,
      minY: minY,
      maxY: maxY,
      gridData: const FlGridData(show: true, drawVerticalLine: false),
      borderData: FlBorderData(show: false),
      titlesData: FlTitlesData(
        topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        rightTitles: const AxisTitles(
          sideTitles: SideTitles(showTitles: false),
        ),
        leftTitles: const AxisTitles(
          sideTitles: SideTitles(showTitles: true, reservedSize: 40),
        ),
        bottomTitles: AxisTitles(
          sideTitles: SideTitles(
            showTitles: true,
            reservedSize: 28,
            interval: 1,
            getTitlesWidget: (value, meta) {
              final index = value.toInt();
              if (index < 0 || index >= points.length || index % step != 0) {
                return const SizedBox.shrink();
              }
              return SideTitleWidget(
                meta: meta,
                child: Text(
                  DateFormat('dd.MM').format(points[index].measuredAt),
                  style: const TextStyle(fontSize: 10),
                ),
              );
            },
          ),
        ),
      ),
      lineBarsData: [
        LineChartBarData(
          spots: weightSpots,
          color: Colors.blue,
          barWidth: 2.5,
          isCurved: true,
          dotData: const FlDotData(show: true, getDotPainter: _defaultDot),
          belowBarData: BarAreaData(
            show: true,
            color: Colors.blue.withValues(alpha: 0.08),
          ),
        ),
        if (fatSpots.isNotEmpty)
          LineChartBarData(
            spots: fatSpots,
            color: Colors.deepOrange,
            barWidth: 2,
            isCurved: true,
            dotData: const FlDotData(show: true, getDotPainter: _defaultDot),
          ),
      ],
    );
  }
}

FlDotPainter _defaultDot(
  FlSpot spot,
  double percent,
  LineChartBarData barData,
  int index,
) {
  return FlDotCirclePainter(
    radius: 3,
    color: barData.color ?? Colors.blue,
    strokeWidth: 0,
  );
}

class _ExerciseSummarySection extends ConsumerWidget {
  const _ExerciseSummarySection({
    required this.clientId,
    required this.clientName,
  });

  final String clientId;
  final String clientName;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summary = ref.watch(exercisesSummaryProvider(clientId));

    return Card(
      margin: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Text(
              'Упражнения',
              style: Theme.of(context).textTheme.titleMedium,
            ),
          ),
          switch (summary) {
            AsyncData(:final value) =>
              value.isEmpty
                  ? const Padding(
                      padding: EdgeInsets.all(16),
                      child: Text('Нет данных по упражнениям'),
                    )
                  : Column(
                      children: [
                        for (final item in value)
                          ListTile(
                            title: Text(item.exerciseName),
                            subtitle: Text(
                              'Начал ${_weight(item.firstWeight)} → '
                              'сейчас ${_weight(item.lastWeight)}, '
                              '${item.recordsCount} записей',
                            ),
                            trailing: const Icon(Icons.chevron_right),
                            onTap: () => Navigator.of(context).push(
                              MaterialPageRoute<void>(
                                builder: (_) => ExerciseProgressScreen(
                                  clientId: clientId,
                                  exerciseId: item.exerciseId,
                                  exerciseName: item.exerciseName,
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
            AsyncError(:final error) => Padding(
              padding: const EdgeInsets.all(16),
              child: _ErrorBox(
                message: apiErrorMessage(error),
                onRetry: () =>
                    ref.invalidate(exercisesSummaryProvider(clientId)),
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

  static String _weight(double? value) {
    if (value == null) {
      return '—';
    }
    final text = value == value.roundToDouble()
        ? value.toStringAsFixed(0)
        : value.toStringAsFixed(1);
    return '$text кг';
  }
}

class _ErrorBox extends StatelessWidget {
  const _ErrorBox({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(message, textAlign: TextAlign.center),
        const SizedBox(height: 8),
        FilledButton(onPressed: onRetry, child: const Text('Повторить')),
      ],
    );
  }
}

class _LegendItem extends StatelessWidget {
  const _LegendItem({required this.color, required this.label});

  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(width: 12, height: 3, color: color),
        const SizedBox(width: 6),
        Text(label, style: Theme.of(context).textTheme.bodySmall),
      ],
    );
  }
}

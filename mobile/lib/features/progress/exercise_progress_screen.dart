import 'dart:math' as math;

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_error.dart';
import 'report_models.dart';
import 'reports_providers.dart';

class ExerciseProgressScreen extends ConsumerWidget {
  const ExerciseProgressScreen({
    super.key,
    required this.clientId,
    required this.exerciseId,
    required this.exerciseName,
    this.from,
    this.to,
  });

  final String clientId;
  final String exerciseId;
  final String exerciseName;
  final DateTime? from;
  final DateTime? to;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final params = (
      clientId: clientId,
      exerciseId: exerciseId,
      from: from,
      to: to,
    );
    final progress = ref.watch(exerciseProgressProvider(params));

    return Scaffold(
      appBar: AppBar(title: Text(exerciseName)),
      body: switch (progress) {
        AsyncData(:final value) => _ProgressContent(progress: value),
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
                      ref.invalidate(exerciseProgressProvider(params)),
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
}

class _ProgressContent extends StatelessWidget {
  const _ProgressContent({required this.progress});

  final ExerciseProgress progress;

  @override
  Widget build(BuildContext context) {
    final points = progress.points;
    final withWeight = points
        .where(
          (point) => point.plannedWeight != null || point.actualWeight != null,
        )
        .toList();

    if (withWeight.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text('Нет данных для графика'),
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          margin: EdgeInsets.zero,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'План и факт по весу',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 16),
                SizedBox(
                  height: 240,
                  child: LineChart(_chartData(points, context)),
                ),
                const SizedBox(height: 12),
                const _Legend(),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        Card(
          margin: EdgeInsets.zero,
          child: Column(
            children: [
              for (var index = 0; index < points.length; index++)
                ListTile(
                  dense: true,
                  title: Text(
                    DateFormat('dd.MM.yyyy')
                        .format(DateTime.parse(points[index].date)),
                  ),
                  subtitle: Text(
                    'План: ${_weight(points[index].plannedWeight)} · '
                    '${points[index].plannedReps} повт.\n'
                    'Факт: ${_weight(points[index].actualWeight)} · '
                    '${points[index].actualReps} повт.',
                  ),
                  isThreeLine: true,
                  trailing: points[index].isActualFallback
                      ? const Tooltip(
                          message: 'Факт не отмечен, показан план',
                          child: Icon(Icons.circle_outlined, size: 18),
                        )
                      : Icon(
                          points[index].done
                              ? Icons.check_circle
                              : Icons.cancel_outlined,
                          size: 18,
                          color: points[index].done ? Colors.green : null,
                        ),
                ),
            ],
          ),
        ),
      ],
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

  LineChartData _chartData(
    List<ExerciseProgressPoint> points,
    BuildContext context,
  ) {
    final values = <double>[
      for (final point in points) ...[
        if (point.plannedWeight != null) point.plannedWeight!,
        if (point.actualWeight != null) point.actualWeight!,
      ],
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

    final plannedSpots = <FlSpot>[
      for (var index = 0; index < points.length; index++)
        if (points[index].plannedWeight != null)
          FlSpot(index.toDouble(), points[index].plannedWeight!),
    ];
    final actualSpots = <FlSpot>[
      for (var index = 0; index < points.length; index++)
        if (points[index].actualWeight != null)
          FlSpot(index.toDouble(), points[index].actualWeight!),
    ];

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
              final date = DateTime.parse(points[index].date);
              return SideTitleWidget(
                meta: meta,
                child: Text(
                  DateFormat('dd.MM').format(date),
                  style: const TextStyle(fontSize: 10),
                ),
              );
            },
          ),
        ),
      ),
      lineBarsData: [
        LineChartBarData(
          spots: plannedSpots,
          color: Colors.grey,
          barWidth: 2,
          dashArray: [6, 4],
          dotData: const FlDotData(show: false),
        ),
        LineChartBarData(
          spots: actualSpots,
          color: Colors.blue,
          barWidth: 2.5,
          dotData: FlDotData(
            show: true,
            getDotPainter: (spot, percent, barData, index) {
              final pointIndex = spot.x.round();
              final fallback =
                  pointIndex >= 0 &&
                  pointIndex < points.length &&
                  points[pointIndex].isActualFallback;
              if (fallback) {
                return FlDotCirclePainter(
                  radius: 4,
                  color: Colors.white,
                  strokeWidth: 1.5,
                  strokeColor: Colors.grey,
                );
              }
              return FlDotCirclePainter(
                radius: 4,
                color: Colors.blue,
                strokeWidth: 0,
              );
            },
          ),
        ),
      ],
    );
  }
}

class _Legend extends StatelessWidget {
  const _Legend();

  @override
  Widget build(BuildContext context) {
    return const Wrap(
      spacing: 16,
      runSpacing: 8,
      children: [
        _LegendItem(color: Colors.grey, label: 'План (пунктир)'),
        _LegendItem(color: Colors.blue, label: 'Факт'),
        _LegendItem(
          color: Colors.white,
          borderColor: Colors.grey,
          label: 'Факт = план (нет отметки)',
        ),
      ],
    );
  }
}

class _LegendItem extends StatelessWidget {
  const _LegendItem({
    required this.color,
    required this.label,
    this.borderColor,
  });

  final Color color;
  final Color? borderColor;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
            border: borderColor == null
                ? null
                : Border.all(color: borderColor!),
          ),
        ),
        const SizedBox(width: 6),
        Text(label, style: Theme.of(context).textTheme.bodySmall),
      ],
    );
  }
}

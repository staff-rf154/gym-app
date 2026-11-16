import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_error.dart';
import '../../core/utils/timezone.dart';
import '../../core/widgets/empty_state.dart';
import '../auth/auth_controller.dart';
import '../client/client_workout_models.dart';
import '../client/client_workouts_providers.dart';
import '../workouts/workouts_providers.dart';
import 'trainer_workouts_screen.dart';

const _monthNames = <String>[
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

const _weekdayNames = <String>['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

final trainerMonthWorkoutsProvider =
    FutureProvider.family<List<ClientWorkout>, MonthKey>((ref, month) async {
      final api = ref.watch(workoutsApiProvider);
      final from = _dateKey(month.firstDay);
      final to = _dateKey(month.lastDay);
      final workouts = await api.fetchTrainerCalendar(from: from, to: to);
      return workouts;
    });

String _dateKey(DateTime value) {
  final month = value.month.toString().padLeft(2, '0');
  final day = value.day.toString().padLeft(2, '0');
  return '${value.year}-$month-$day';
}

class TrainerCalendarTab extends ConsumerStatefulWidget {
  const TrainerCalendarTab({super.key});

  @override
  ConsumerState<TrainerCalendarTab> createState() => _TrainerCalendarTabState();
}

class _TrainerCalendarTabState extends ConsumerState<TrainerCalendarTab> {
  late MonthKey _month;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _month = MonthKey(now.year, now.month);
  }

  void _shift(int delta) {
    setState(() {
      _month = delta < 0 ? _month.previous : _month.next;
    });
  }

  void _goToToday() {
    final now = DateTime.now();
    setState(() => _month = MonthKey(now.year, now.month));
  }

  @override
  Widget build(BuildContext context) {
    final workouts = ref.watch(trainerMonthWorkoutsProvider(_month));
    final timezone = ref.watch(authControllerProvider).value?.timezone ?? 'UTC';

    return RefreshIndicator(
      onRefresh: () async =>
          ref.invalidate(trainerMonthWorkoutsProvider(_month)),
      child: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          _MonthHeader(
            month: _month,
            onPrevious: () => _shift(-1),
            onNext: () => _shift(1),
            onToday: _goToToday,
          ),
          const SizedBox(height: 8),
          const _WeekdayHeader(),
          const SizedBox(height: 4),
          switch (workouts) {
            AsyncData(:final value) => _MonthGrid(
              month: _month,
              workouts: value,
              today: todayKey(timezone),
              onDayTap: _openDay,
            ),
            AsyncError(:final error) => _ErrorBox(
              message: apiErrorMessage(error),
              onRetry: () =>
                  ref.invalidate(trainerMonthWorkoutsProvider(_month)),
            ),
            _ => const Padding(
              padding: EdgeInsets.symmetric(vertical: 48),
              child: Center(child: CircularProgressIndicator()),
            ),
          },
          if (workouts.asData?.value.isEmpty ?? false) ...[
            EmptyState(
              message: 'здесь пока пусто',
              actionLabel: 'Добавить тренировку',
              onAction: () => _openDay(
                _isCurrentMonth ? nowInTimezone(timezone) : _month.firstDay,
                const [],
              ),
            ),
          ],
          const SizedBox(height: 16),
          const _Legend(),
        ],
      ),
    );
  }

  bool get _isCurrentMonth {
    final now = DateTime.now();
    return _month.year == now.year && _month.month == now.month;
  }

  Future<void> _openDay(DateTime date, List<ClientWorkout> workouts) async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute(builder: (_) => TrainerWorkoutsScreen(date: date)),
    );
    if (mounted) {
      ref.invalidate(trainerMonthWorkoutsProvider(_month));
    }
  }
}

class _MonthHeader extends StatelessWidget {
  const _MonthHeader({
    required this.month,
    required this.onPrevious,
    required this.onNext,
    required this.onToday,
  });

  final MonthKey month;
  final VoidCallback onPrevious;
  final VoidCallback onNext;
  final VoidCallback onToday;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        IconButton(
          onPressed: onPrevious,
          icon: const Icon(Icons.chevron_left),
          tooltip: 'Предыдущий месяц',
        ),
        Expanded(
          child: Text(
            '${_monthNames[month.month - 1]} ${month.year}',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleMedium,
          ),
        ),
        IconButton(
          onPressed: onNext,
          icon: const Icon(Icons.chevron_right),
          tooltip: 'Следующий месяц',
        ),
        TextButton(onPressed: onToday, child: const Text('Сегодня')),
      ],
    );
  }
}

class _WeekdayHeader extends StatelessWidget {
  const _WeekdayHeader();

  @override
  Widget build(BuildContext context) {
    final style = Theme.of(context).textTheme.bodySmall
        ?.copyWith(fontWeight: FontWeight.bold);
    return Row(
      children: [
        for (final name in _weekdayNames)
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: Text(name, textAlign: TextAlign.center, style: style),
            ),
          ),
      ],
    );
  }
}

class _MonthGrid extends StatelessWidget {
  const _MonthGrid({
    required this.month,
    required this.workouts,
    required this.today,
    required this.onDayTap,
  });

  final MonthKey month;
  final List<ClientWorkout> workouts;
  final String today;
  final void Function(DateTime date, List<ClientWorkout> workouts) onDayTap;

  @override
  Widget build(BuildContext context) {
    final byDate = <String, List<ClientWorkout>>{};
    for (final workout in workouts) {
      byDate.putIfAbsent(workout.date, () => []).add(workout);
    }

    final leading = month.firstDay.weekday - 1;
    final daysInMonth = month.lastDay.day;
    final totalCells = ((leading + daysInMonth) / 7).ceil() * 7;

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: totalCells,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 7,
        childAspectRatio: 0.9,
      ),
      itemBuilder: (context, index) {
        final dayNumber = index - leading + 1;
        if (dayNumber < 1 || dayNumber > daysInMonth) {
          return const SizedBox.shrink();
        }

        final date = DateTime(month.year, month.month, dayNumber);
        final dayWorkouts = byDate[_dateKey(date)] ?? const [];
        final isToday = _dateKey(date) == today;

        return _DayCell(
          day: dayNumber,
          isToday: isToday,
          workouts: dayWorkouts,
          onTap: () => onDayTap(date, dayWorkouts),
        );
      },
    );
  }
}

class _DayCell extends StatelessWidget {
  const _DayCell({
    required this.day,
    required this.isToday,
    required this.workouts,
    this.onTap,
  });

  final int day;
  final bool isToday;
  final List<ClientWorkout> workouts;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final hasWorkouts = workouts.isNotEmpty;
    final hasActive = workouts.any((workout) => workout.isInProgress);

    return Padding(
      padding: const EdgeInsets.all(2),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Ink(
          decoration: BoxDecoration(
            color: hasWorkouts
                ? theme.colorScheme.primaryContainer
                : theme.colorScheme.surfaceContainerHighest.withValues(
                    alpha: 0.25,
                  ),
            borderRadius: BorderRadius.circular(12),
            border: isToday
                ? Border.all(color: theme.colorScheme.primary, width: 1.5)
                : hasActive
                ? Border.all(color: theme.colorScheme.tertiary, width: 1.5)
                : null,
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                '$day',
                style: theme.textTheme.bodyMedium?.copyWith(
                  fontWeight: isToday ? FontWeight.bold : null,
                ),
              ),
              const SizedBox(height: 3),
              if (hasWorkouts)
                Text(
                  workouts.length > 9 ? '9+' : '${workouts.length}',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onPrimaryContainer,
                  ),
                )
              else
                const SizedBox(height: 5),
            ],
          ),
        ),
      ),
    );
  }
}

class _Legend extends StatelessWidget {
  const _Legend();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: theme.colorScheme.primaryContainer,
            borderRadius: BorderRadius.circular(4),
          ),
        ),
        const SizedBox(width: 8),
        Flexible(
          child: Text(
            'День с тренировками — число клиентов, нажмите, чтобы открыть',
            style: theme.textTheme.bodySmall,
          ),
        ),
      ],
    );
  }
}

class _ErrorBox extends StatelessWidget {
  const _ErrorBox({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 32),
      child: Column(
        children: [
          const Icon(Icons.cloud_off, size: 48),
          const SizedBox(height: 12),
          Text(message, textAlign: TextAlign.center),
          const SizedBox(height: 12),
          FilledButton(onPressed: onRetry, child: const Text('Повторить')),
        ],
      ),
    );
  }
}

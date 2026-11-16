import '../../core/utils/format.dart';

class ClientWorkoutItemResult {
  const ClientWorkoutItemResult({
    required this.done,
    this.actualWeight,
    this.actualReps,
    this.clientComment,
  });

  factory ClientWorkoutItemResult.fromJson(Map<String, dynamic> json) {
    return ClientWorkoutItemResult(
      done: json['done'] as bool? ?? false,
      actualWeight: (json['actualWeight'] as num?)?.toDouble(),
      actualReps: (json['actualReps'] as num?)?.toInt(),
      clientComment: json['clientComment'] as String?,
    );
  }

  final bool done;
  final double? actualWeight;
  final int? actualReps;
  final String? clientComment;
}

class ClientWorkoutItem {
  const ClientWorkoutItem({
    required this.id,
    required this.exerciseId,
    required this.exerciseName,
    required this.plannedSets,
    required this.plannedReps,
    required this.order,
    this.equipmentId,
    this.equipmentName,
    this.plannedWeight,
    this.result,
  });

  factory ClientWorkoutItem.fromJson(Map<String, dynamic> json) {
    final exercise = json['exercise'] as Map<String, dynamic>? ?? const {};
    final result = json['result'] as Map<String, dynamic>?;
    final equipment = json['gymEquipment'] as Map<String, dynamic>?;

    return ClientWorkoutItem(
      id: json['id'] as String,
      exerciseId: exercise['id'] as String? ?? '',
      exerciseName: exercise['name'] as String? ?? 'Упражнение',
      equipmentId: equipment?['id'] as String?,
      equipmentName: equipment?['name'] as String?,
      plannedWeight: (json['plannedWeight'] as num?)?.toDouble(),
      plannedSets: (json['plannedSets'] as num?)?.toInt() ?? 0,
      plannedReps: (json['plannedReps'] as num?)?.toInt() ?? 0,
      order: (json['order'] as num?)?.toInt() ?? 0,
      result: result == null ? null : ClientWorkoutItemResult.fromJson(result),
    );
  }

  final String id;
  final String exerciseId;
  final String exerciseName;
  final String? equipmentId;
  final String? equipmentName;
  final double? plannedWeight;
  final int plannedSets;
  final int plannedReps;
  final int order;
  final ClientWorkoutItemResult? result;

  String get planLabel {
    final weight = plannedWeight == null ? '—' : formatNumber(plannedWeight!);
    final equipment = equipmentName == null ? '' : ' · $equipmentName';
    return 'План: $weight кг × $plannedReps повт. · $plannedSets подх.$equipment';
  }

  String get factLabel {
    final result = this.result;
    if (result == null) {
      return 'Факт: —';
    }
    final weight = result.actualWeight == null
        ? 'вес по плану'
        : '${formatNumber(result.actualWeight!)} кг';
    final reps = result.actualReps == null ? '—' : '${result.actualReps} повт.';
    return 'Факт: $weight × $reps · ${result.done ? 'выполнено' : 'не выполнено'}';
  }
}

class ClientWorkout {
  const ClientWorkout({
    required this.id,
    required this.clientId,
    required this.gymId,
    required this.date,
    required this.status,
    required this.items,
    this.trainerId,
    this.clientName,
    this.gymName,
    this.startTime,
    this.startedAt,
    this.autoFinishAt,
    this.comment,
    this.templateId,
  });

  factory ClientWorkout.fromJson(Map<String, dynamic> json) {
    final items =
        (json['items'] as List<dynamic>? ?? [])
            .map(
              (item) =>
                  ClientWorkoutItem.fromJson(item as Map<String, dynamic>),
            )
            .toList()
          ..sort((a, b) => a.order.compareTo(b.order));

    return ClientWorkout(
      id: json['id'] as String,
      clientId: json['clientId'] as String,
      trainerId: json['trainerId'] as String?,
      clientName: json['clientName'] as String?,
      gymName: json['gymName'] as String?,
      startTime: json['startTime'] as String?,
      gymId: json['gymId'] as String,
      date: json['date'] as String,
      status: json['status'] as String? ?? 'PLANNED',
      startedAt: _parseDate(json['startedAt']),
      autoFinishAt: _parseDate(json['autoFinishAt']),
      comment: json['comment'] as String?,
      templateId: json['templateId'] as String?,
      items: items,
    );
  }

  static DateTime? _parseDate(Object? value) {
    if (value is! String || value.isEmpty) {
      return null;
    }
    return DateTime.tryParse(value)?.toLocal();
  }

  final String id;
  final String clientId;
  final String? trainerId;
  final String? clientName;
  final String? gymName;
  final String? startTime;
  final String gymId;
  final String date;
  final String status;
  final DateTime? startedAt;
  final DateTime? autoFinishAt;
  final String? comment;
  final String? templateId;
  final List<ClientWorkoutItem> items;

  DateTime get dateTime => DateTime.parse(date);

  String get statusLabel {
    return switch (status) {
      'COMPLETED' || 'DONE' => 'Завершена',
      'IN_PROGRESS' => 'В процессе',
      'AUTO_CLOSED' => 'Закрыта автоматически',
      'MISSED' || 'SKIPPED' => 'Пропущена',
      _ => 'Запланирована',
    };
  }

  String get timeLabel => startTime ?? '—';

  int get completedItems =>
      items.where((item) => item.result?.done == true).length;

  bool get canStart => status == 'PLANNED';

  bool get isInProgress => status == 'IN_PROGRESS';

  bool get isTerminal =>
      status == 'COMPLETED' ||
      status == 'AUTO_CLOSED' ||
      status == 'MISSED' ||
      status == 'DONE' ||
      status == 'SKIPPED';

  bool get isLocked => isTerminal;
}

enum WorkoutPeriod { thisWeek, all, thisMonth, previousMonth, lastThreeMonths }

String workoutPeriodLabel(WorkoutPeriod period) {
  return switch (period) {
    WorkoutPeriod.thisWeek => 'Текущая неделя',
    WorkoutPeriod.all => 'Всё время',
    WorkoutPeriod.thisMonth => 'Этот месяц',
    WorkoutPeriod.previousMonth => 'Прошлый месяц',
    WorkoutPeriod.lastThreeMonths => '3 месяца',
  };
}

bool matchesWorkoutPeriod(String date, WorkoutPeriod period, {DateTime? now}) {
  if (period == WorkoutPeriod.all) {
    return true;
  }
  final value = DateTime.tryParse(date);
  if (value == null) {
    return false;
  }
  final today = now ?? DateTime.now();
  final dayStart = DateTime(today.year, today.month, today.day);
  final weekStart = dayStart.subtract(Duration(days: dayStart.weekday - 1));
  final monthStart = DateTime(today.year, today.month);
  final from = switch (period) {
    WorkoutPeriod.thisWeek => weekStart,
    WorkoutPeriod.thisMonth => monthStart,
    WorkoutPeriod.previousMonth => DateTime(today.year, today.month - 1),
    WorkoutPeriod.lastThreeMonths => DateTime(today.year, today.month - 2),
    WorkoutPeriod.all => DateTime(2020),
  };
  final to = switch (period) {
    WorkoutPeriod.thisWeek => weekStart.add(const Duration(days: 7)),
    WorkoutPeriod.previousMonth => monthStart,
    _ => DateTime(today.year, today.month + 1),
  };
  return !value.isBefore(from) && value.isBefore(to);
}

class WorkoutItemResultInput {
  const WorkoutItemResultInput({
    required this.done,
    this.actualWeight,
    this.actualReps,
    this.clientComment,
  });

  final bool done;
  final double? actualWeight;
  final int? actualReps;
  final String? clientComment;

  Map<String, dynamic> toJson() {
    return {
      'done': done,
      if (actualWeight != null) 'actualWeight': actualWeight,
      if (actualReps != null) 'actualReps': actualReps,
      if (clientComment != null && clientComment!.isNotEmpty)
        'clientComment': clientComment,
    };
  }
}

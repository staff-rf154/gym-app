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
    this.plannedWeight,
    this.result,
  });

  factory ClientWorkoutItem.fromJson(Map<String, dynamic> json) {
    final exercise = json['exercise'] as Map<String, dynamic>? ?? const {};
    final result = json['result'] as Map<String, dynamic>?;

    return ClientWorkoutItem(
      id: json['id'] as String,
      exerciseId: exercise['id'] as String? ?? '',
      exerciseName: exercise['name'] as String? ?? 'Упражнение',
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
  final double? plannedWeight;
  final int plannedSets;
  final int plannedReps;
  final int order;
  final ClientWorkoutItemResult? result;

  String get planLabel {
    final weight = plannedWeight == null
        ? '—'
        : formatWorkoutNumber(plannedWeight!);
    return '$weight кг × $plannedReps повт. · $plannedSets подх.';
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
      gymId: json['gymId'] as String,
      date: json['date'] as String,
      status: json['status'] as String? ?? 'PLANNED',
      comment: json['comment'] as String?,
      templateId: json['templateId'] as String?,
      items: items,
    );
  }

  final String id;
  final String clientId;
  final String? trainerId;
  final String gymId;
  final String date;
  final String status;
  final String? comment;
  final String? templateId;
  final List<ClientWorkoutItem> items;

  DateTime get dateTime => DateTime.parse(date);

  String get statusLabel {
    return switch (status) {
      'DONE' => 'Выполнена',
      'CANCELLED' => 'Отменена',
      _ => 'Запланирована',
    };
  }

  int get completedItems =>
      items.where((item) => item.result?.done == true).length;
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

String formatWorkoutNumber(double value) {
  return value == value.roundToDouble()
      ? value.toStringAsFixed(0)
      : value.toStringAsFixed(1);
}

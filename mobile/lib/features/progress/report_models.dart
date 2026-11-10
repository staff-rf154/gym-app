class WeightDynamicsPoint {
  const WeightDynamicsPoint({
    required this.measuredAt,
    required this.weight,
    this.fatMass,
  });

  final DateTime measuredAt;
  final double weight;
  final double? fatMass;

  factory WeightDynamicsPoint.fromJson(Map<String, dynamic> json) {
    return WeightDynamicsPoint(
      measuredAt: DateTime.parse(json['measuredAt'] as String).toLocal(),
      weight: (json['weight'] as num).toDouble(),
      fatMass: (json['fatMass'] as num?)?.toDouble(),
    );
  }
}

class ExerciseSummaryItem {
  const ExerciseSummaryItem({
    required this.exerciseId,
    required this.exerciseName,
    required this.recordsCount,
    this.firstWeight,
    this.lastWeight,
  });

  final String exerciseId;
  final String exerciseName;
  final double? firstWeight;
  final double? lastWeight;
  final int recordsCount;

  factory ExerciseSummaryItem.fromJson(Map<String, dynamic> json) {
    return ExerciseSummaryItem(
      exerciseId: json['exerciseId'] as String,
      exerciseName: json['exerciseName'] as String,
      firstWeight: (json['firstWeight'] as num?)?.toDouble(),
      lastWeight: (json['lastWeight'] as num?)?.toDouble(),
      recordsCount: (json['recordsCount'] as num?)?.toInt() ?? 0,
    );
  }
}

class ExerciseProgressPoint {
  const ExerciseProgressPoint({
    required this.date,
    required this.plannedReps,
    required this.actualReps,
    required this.done,
    required this.isActualFallback,
    this.plannedWeight,
    this.actualWeight,
  });

  final String date;
  final double? plannedWeight;
  final double? actualWeight;
  final int plannedReps;
  final int actualReps;
  final bool done;
  final bool isActualFallback;

  factory ExerciseProgressPoint.fromJson(Map<String, dynamic> json) {
    return ExerciseProgressPoint(
      date: json['date'] as String,
      plannedWeight: (json['plannedWeight'] as num?)?.toDouble(),
      actualWeight: (json['actualWeight'] as num?)?.toDouble(),
      plannedReps: (json['plannedReps'] as num?)?.toInt() ?? 0,
      actualReps: (json['actualReps'] as num?)?.toInt() ?? 0,
      done: json['done'] as bool? ?? false,
      isActualFallback: json['isActualFallback'] as bool? ?? false,
    );
  }
}

class ExerciseProgress {
  const ExerciseProgress({
    required this.exerciseId,
    required this.exerciseName,
    required this.points,
  });

  final String exerciseId;
  final String exerciseName;
  final List<ExerciseProgressPoint> points;

  factory ExerciseProgress.fromJson(Map<String, dynamic> json) {
    final exercise = json['exercise'] as Map<String, dynamic>? ?? const {};
    final points = (json['points'] as List<dynamic>? ?? [])
        .map(
          (item) =>
              ExerciseProgressPoint.fromJson(item as Map<String, dynamic>),
        )
        .toList();
    return ExerciseProgress(
      exerciseId: exercise['id'] as String? ?? '',
      exerciseName: exercise['name'] as String? ?? 'Упражнение',
      points: points,
    );
  }
}

class Gym {
  const Gym({required this.id, required this.name, this.address});

  final String id;
  final String name;
  final String? address;

  factory Gym.fromJson(Map<String, dynamic> json) {
    return Gym(
      id: json['id'] as String,
      name: json['name'] as String,
      address: json['address'] as String?,
    );
  }
}

class Exercise {
  const Exercise({
    required this.id,
    required this.name,
    this.type,
    this.muscleGroup,
  });

  final String id;
  final String name;
  final String? type;
  final String? muscleGroup;

  String get subtitle {
    final parts = <String>[
      if (muscleGroup != null && muscleGroup!.isNotEmpty) muscleGroup!,
      if (type != null && type!.isNotEmpty) type!,
    ];
    return parts.join(' · ');
  }

  factory Exercise.fromJson(Map<String, dynamic> json) {
    return Exercise(
      id: json['id'] as String,
      name: json['name'] as String,
      type: json['type'] as String?,
      muscleGroup: json['muscleGroup'] as String?,
    );
  }
}

class WorkoutTemplateItem {
  const WorkoutTemplateItem({
    required this.exerciseId,
    required this.plannedSets,
    required this.plannedReps,
    this.plannedWeight,
    this.order = 0,
  });

  final String exerciseId;
  final num? plannedWeight;
  final int plannedSets;
  final int plannedReps;
  final int order;

  factory WorkoutTemplateItem.fromJson(Map<String, dynamic> json) {
    return WorkoutTemplateItem(
      exerciseId: json['exerciseId'] as String,
      plannedWeight: json['plannedWeight'] as num?,
      plannedSets: (json['plannedSets'] as num?)?.toInt() ?? 3,
      plannedReps: (json['plannedReps'] as num?)?.toInt() ?? 10,
      order: (json['order'] as num?)?.toInt() ?? 0,
    );
  }
}

class WorkoutTemplate {
  const WorkoutTemplate({
    required this.id,
    required this.name,
    this.description,
    this.items = const [],
  });

  final String id;
  final String name;
  final String? description;
  final List<WorkoutTemplateItem> items;

  factory WorkoutTemplate.fromJson(Map<String, dynamic> json) {
    final items =
        (json['items'] as List<dynamic>? ?? [])
            .map(
              (item) =>
                  WorkoutTemplateItem.fromJson(item as Map<String, dynamic>),
            )
            .toList()
          ..sort((a, b) => a.order.compareTo(b.order));

    return WorkoutTemplate(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      items: items,
    );
  }
}

class WorkoutItemInput {
  const WorkoutItemInput({
    required this.exerciseId,
    required this.plannedSets,
    required this.plannedReps,
    required this.order,
    this.plannedWeight,
  });

  final String exerciseId;
  final num? plannedWeight;
  final int plannedSets;
  final int plannedReps;
  final int order;

  Map<String, dynamic> toJson() {
    return {
      'exerciseId': exerciseId,
      if (plannedWeight != null) 'plannedWeight': plannedWeight,
      'plannedSets': plannedSets,
      'plannedReps': plannedReps,
      'order': order,
    };
  }
}

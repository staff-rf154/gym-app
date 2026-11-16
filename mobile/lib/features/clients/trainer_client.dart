import '../../core/utils/format.dart';

export '../../core/utils/format.dart' show formatNumber;

class TrainerClient {
  const TrainerClient({
    required this.id,
    required this.userId,
    required this.name,
    this.gender,
    this.height,
    this.age,
    this.startWeight,
    this.startFatMass,
    this.currentWeight,
    this.currentFatMass,
    this.goal,
    this.notes,
    this.trainers = const [],
  });

  factory TrainerClient.fromJson(Map<String, dynamic> json) {
    return TrainerClient(
      id: json['id'] as String,
      userId: json['userId'] as String,
      name: json['name'] as String,
      gender: json['gender'] as String?,
      height: (json['height'] as num?)?.toDouble(),
      age: (json['age'] as num?)?.toInt(),
      startWeight: (json['startWeight'] as num?)?.toDouble(),
      startFatMass: (json['startFatMass'] as num?)?.toDouble(),
      currentWeight: (json['currentWeight'] as num?)?.toDouble(),
      currentFatMass: (json['currentFatMass'] as num?)?.toDouble(),
      goal: _parseGoal(json),
      notes: json['notes'] as String?,
      trainers: (json['active_trainers'] as List<dynamic>? ?? const [])
          .cast<Map<String, dynamic>>()
          .map(TrainerLinkInfo.fromJson)
          .toList(),
    );
  }

  final String id;
  final String userId;
  final String name;
  final String? gender;
  final double? height;
  final int? age;
  final double? startWeight;
  final double? startFatMass;
  final double? currentWeight;
  final double? currentFatMass;
  final String? goal;
  final String? notes;
  final List<TrainerLinkInfo> trainers;

  String get weightLabel => currentWeight == null
      ? 'Вес: —'
      : 'Вес: ${formatNumber(currentWeight!)} кг';

  String get initials {
    final parts = name
        .trim()
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .toList();
    if (parts.isEmpty) {
      return '?';
    }
    String firstLetter(String value) => value.substring(0, 1).toUpperCase();
    if (parts.length == 1) {
      return firstLetter(parts.first);
    }
    return firstLetter(parts[0]) + firstLetter(parts[1]);
  }
}

String? _parseGoal(Map<String, dynamic> json) {
  final goal = json['goal'];
  if (goal is String && goal.isNotEmpty) {
    return goal;
  }
  if (goal is Map<String, dynamic>) {
    final name = goal['name'];
    if (name is String && name.isNotEmpty) {
      return name;
    }
  }
  final text = json['goalText'];
  return text is String && text.isNotEmpty ? text : null;
}

class TrainerLinkInfo {
  const TrainerLinkInfo({
    required this.trainerId,
    required this.trainerName,
    required this.assignedBy,
  });

  factory TrainerLinkInfo.fromJson(Map<String, dynamic> json) {
    return TrainerLinkInfo(
      trainerId: json['trainerId'] as String? ?? '',
      trainerName: json['trainerName'] as String? ?? 'Тренер',
      assignedBy: json['assignedBy'] as String? ?? '',
    );
  }

  final String trainerId;
  final String trainerName;
  final String assignedBy;
}

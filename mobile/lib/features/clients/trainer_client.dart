class TrainerClient {
  const TrainerClient({
    required this.id,
    required this.userId,
    required this.name,
    required this.phone,
    this.gender,
    this.height,
    this.age,
    this.startWeight,
    this.startFatMass,
    this.currentWeight,
    this.currentFatMass,
    this.goal,
    this.notes,
  });

  factory TrainerClient.fromJson(Map<String, dynamic> json) {
    return TrainerClient(
      id: json['id'] as String,
      userId: json['userId'] as String,
      name: json['name'] as String,
      phone: json['phone'] as String,
      gender: json['gender'] as String?,
      height: (json['height'] as num?)?.toDouble(),
      age: (json['age'] as num?)?.toInt(),
      startWeight: (json['startWeight'] as num?)?.toDouble(),
      startFatMass: (json['startFatMass'] as num?)?.toDouble(),
      currentWeight: (json['currentWeight'] as num?)?.toDouble(),
      currentFatMass: (json['currentFatMass'] as num?)?.toDouble(),
      goal: json['goal'] as String?,
      notes: json['notes'] as String?,
    );
  }

  final String id;
  final String userId;
  final String name;
  final String phone;
  final String? gender;
  final double? height;
  final int? age;
  final double? startWeight;
  final double? startFatMass;
  final double? currentWeight;
  final double? currentFatMass;
  final String? goal;
  final String? notes;

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

String formatNumber(double value) {
  if (value == value.roundToDouble()) {
    return value.toStringAsFixed(0);
  }
  return value.toStringAsFixed(1);
}

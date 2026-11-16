enum NutritionType {
  daily('DAILY', 'Ежедневно'),
  postWorkout('POST_WORKOUT', 'После тренировки');

  const NutritionType(this.apiValue, this.label);

  final String apiValue;
  final String label;

  static NutritionType fromApi(Object? value) {
    return NutritionType.values.firstWhere(
      (type) => type.apiValue == value,
      orElse: () => NutritionType.daily,
    );
  }
}

class NutritionRecommendation {
  const NutritionRecommendation({
    required this.id,
    required this.clientId,
    required this.trainerId,
    required this.type,
    this.kcal,
    this.protein,
    this.fat,
    this.carbs,
    this.comment,
    this.validFrom,
    this.validTo,
    this.isActive = true,
    this.archivedAt,
    required this.createdAt,
  });

  final String id;
  final String clientId;
  final String trainerId;
  final NutritionType type;
  final double? kcal;
  final double? protein;
  final double? fat;
  final double? carbs;
  final String? comment;
  final DateTime? validFrom;
  final DateTime? validTo;
  final bool isActive;
  final DateTime? archivedAt;
  final DateTime createdAt;

  factory NutritionRecommendation.fromJson(Map<String, dynamic> json) {
    return NutritionRecommendation(
      id: json['id'] as String,
      clientId: json['clientId'] as String,
      trainerId: json['trainerId'] as String,
      type: NutritionType.fromApi(json['type']),
      kcal: _toDouble(json['kcal']),
      protein: _toDouble(json['protein']),
      fat: _toDouble(json['fat']),
      carbs: _toDouble(json['carbs']),
      comment: json['comment'] as String?,
      validFrom: _toDate(json['validFrom']),
      validTo: _toDate(json['validTo']),
      isActive: json['isActive'] as bool? ?? true,
      archivedAt: _toDate(json['archivedAt']),
      createdAt: _toDate(json['createdAt']) ?? DateTime.now().toUtc(),
    );
  }

  String get macrosLabel {
    final parts = <String>[
      if (kcal != null) '${_format(kcal!)} ккал',
      if (protein != null) 'Б ${_format(protein!)}',
      if (fat != null) 'Ж ${_format(fat!)}',
      if (carbs != null) 'У ${_format(carbs!)}',
    ];
    return parts.isEmpty ? 'Без расчёта КБЖУ' : parts.join(' · ');
  }
}

class NutritionInput {
  const NutritionInput({
    required this.type,
    this.kcal,
    this.protein,
    this.fat,
    this.carbs,
    this.comment,
    this.validFrom,
    this.validTo,
  });

  final NutritionType type;
  final double? kcal;
  final double? protein;
  final double? fat;
  final double? carbs;
  final String? comment;
  final DateTime? validFrom;
  final DateTime? validTo;

  Map<String, dynamic> toJson(String clientId) {
    return {
      'client_id': clientId,
      'type': type.apiValue,
      'kcal': ?kcal,
      'protein': ?protein,
      'fat': ?fat,
      'carbs': ?carbs,
      'comment': ?_trimmed(comment),
      'validFrom': ?_dateOnly(validFrom),
      'validTo': ?_dateOnly(validTo),
    };
  }
}

double? _toDouble(Object? value) {
  if (value is num) {
    return value.toDouble();
  }
  if (value is String) {
    return double.tryParse(value);
  }
  return null;
}

DateTime? _toDate(Object? value) {
  if (value is String && value.isNotEmpty) {
    return DateTime.tryParse(value);
  }
  return null;
}

String _format(double value) {
  return value == value.roundToDouble()
      ? value.toStringAsFixed(0)
      : value.toStringAsFixed(1);
}

String? _trimmed(String? value) {
  final text = value?.trim();
  return text == null || text.isEmpty ? null : text;
}

String? _dateOnly(DateTime? value) {
  if (value == null) {
    return null;
  }
  final month = value.month.toString().padLeft(2, '0');
  final day = value.day.toString().padLeft(2, '0');
  return '${value.year}-$month-$day';
}

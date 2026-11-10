class WeightMeasurement {
  const WeightMeasurement({
    required this.id,
    required this.measuredAt,
    required this.weight,
    this.fatMass,
    this.comment,
  });

  final String id;
  final DateTime measuredAt;
  final double weight;
  final double? fatMass;
  final String? comment;

  factory WeightMeasurement.fromJson(Map<String, dynamic> json) {
    return WeightMeasurement(
      id: json['id'] as String,
      measuredAt: DateTime.parse(json['measuredAt'] as String).toLocal(),
      weight: (json['weight'] as num).toDouble(),
      fatMass: (json['fatMass'] as num?)?.toDouble(),
      comment: json['comment'] as String?,
    );
  }
}

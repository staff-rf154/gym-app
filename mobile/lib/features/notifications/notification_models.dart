class AppNotification {
  const AppNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.createdAt,
    required this.readAt,
    this.gymId,
    this.type = 'SYSTEM',
    this.entityId,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: json['id'] as String,
      gymId: json['gymId'] as String?,
      title: json['title'] as String,
      body: json['body'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
      readAt: json['readAt'] == null
          ? null
          : DateTime.parse(json['readAt'] as String),
      type: (json['type'] as String?) ?? 'SYSTEM',
      entityId: json['entityId'] as String?,
    );
  }

  final String id;
  final String? gymId;
  final String title;
  final String body;
  final DateTime createdAt;
  final DateTime? readAt;
  final String type;
  final String? entityId;

  bool get isRead => readAt != null;
}

String? chatRoleLabel(String? role) {
  return switch (role) {
    'ADMINISTRATOR' => 'Администратор зала',
    'ADMIN' => 'Системный администратор',
    'TRAINER' => 'Тренер',
    'CLIENT' => 'Клиент',
    _ => null,
  };
}

class ChatSummary {
  const ChatSummary({
    required this.id,
    required this.type,
    required this.peerId,
    required this.peerName,
    this.peerRole,
    this.lastMessage,
    required this.unreadCount,
    this.isBlocked = false,
  });

  final String id;
  final String type;
  final String peerId;
  final String peerName;
  final String? peerRole;
  final String? lastMessage;
  final int unreadCount;
  final bool isBlocked;

  String? get peerRoleLabel => chatRoleLabel(peerRole);

  factory ChatSummary.fromJson(Map<String, dynamic> json) {
    return ChatSummary(
      id: json['id'] as String,
      type: json['type'] as String,
      peerId: json['peerId'] as String,
      peerName: (json['peerName'] as String?) ?? '',
      peerRole: json['peerRole'] as String?,
      lastMessage: json['lastMessage'] as String?,
      unreadCount: (json['unreadCount'] as num?)?.toInt() ?? 0,
      isBlocked: json['isBlocked'] as bool? ?? false,
    );
  }
}

class ChatStaffContact {
  const ChatStaffContact({
    required this.id,
    required this.name,
    required this.role,
    this.gymId,
    this.gymName,
  });

  final String id;
  final String name;
  final String role;
  final String? gymId;
  final String? gymName;

  String? get roleLabel => chatRoleLabel(role);

  factory ChatStaffContact.fromJson(Map<String, dynamic> json) {
    return ChatStaffContact(
      id: json['id'] as String,
      name: (json['name'] as String?) ?? '',
      role: (json['role'] as String?) ?? '',
      gymId: json['gymId'] as String?,
      gymName: json['gymName'] as String?,
    );
  }
}

class ClientTrainerOption {
  const ClientTrainerOption({
    required this.trainerId,
    required this.trainerName,
  });

  final String trainerId;
  final String trainerName;

  factory ClientTrainerOption.fromJson(Map<String, dynamic> json) {
    return ClientTrainerOption(
      trainerId: json['trainerId'] as String,
      trainerName: (json['trainerName'] as String?) ?? 'Тренер',
    );
  }
}

class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.chatId,
    required this.senderId,
    required this.text,
    this.attachmentUrl,
    required this.createdAt,
    this.readAt,
  });

  final String id;
  final String chatId;
  final String senderId;
  final String text;
  final String? attachmentUrl;
  final DateTime createdAt;
  final DateTime? readAt;

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      id: json['id'] as String,
      chatId: json['chatId'] as String,
      senderId: json['senderId'] as String,
      text: json['text'] as String,
      attachmentUrl: json['attachmentUrl'] as String?,
      createdAt:
          DateTime.tryParse(json['createdAt'] as String? ?? '') ??
          DateTime.now(),
      readAt: DateTime.tryParse(json['readAt'] as String? ?? ''),
    );
  }
}

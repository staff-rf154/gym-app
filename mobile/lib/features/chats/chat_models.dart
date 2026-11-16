class ChatSummary {
  const ChatSummary({
    required this.id,
    required this.type,
    required this.peerId,
    required this.peerName,
    this.lastMessage,
    required this.unreadCount,
    this.isBlocked = false,
  });

  final String id;
  final String type;
  final String peerId;
  final String peerName;
  final String? lastMessage;
  final int unreadCount;
  final bool isBlocked;

  factory ChatSummary.fromJson(Map<String, dynamic> json) {
    return ChatSummary(
      id: json['id'] as String,
      type: json['type'] as String,
      peerId: json['peerId'] as String,
      peerName: (json['peerName'] as String?) ?? '',
      lastMessage: json['lastMessage'] as String?,
      unreadCount: (json['unreadCount'] as num?)?.toInt() ?? 0,
      isBlocked: json['isBlocked'] as bool? ?? false,
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

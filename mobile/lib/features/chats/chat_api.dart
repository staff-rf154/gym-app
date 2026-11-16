import 'package:socket_io_client/socket_io_client.dart' as io;

import '../../core/api/dio_client.dart';
import 'chat_models.dart';

class ChatApi {
  const ChatApi(this._apiClient);

  final ApiClient _apiClient;

  Future<List<ChatSummary>> fetchChats() async {
    final response = await _apiClient.dio.get<Map<String, dynamic>>(
      '/chats',
      queryParameters: {'limit': 100},
    );
    final items = (response.data?['items'] as List<dynamic>?) ?? const [];
    return items
        .cast<Map<String, dynamic>>()
        .map(ChatSummary.fromJson)
        .toList();
  }

  Future<ChatSummary> createChat({
    required String type,
    String? clientId,
    String? trainerId,
  }) async {
    final response = await _apiClient.dio.post<Map<String, dynamic>>(
      '/chats',
      data: {
        'type': type,
        if (clientId != null && clientId.isNotEmpty) 'client_id': clientId,
        if (trainerId != null && trainerId.isNotEmpty) 'trainer_id': trainerId,
      },
    );
    return ChatSummary.fromJson(response.data!);
  }

  Future<List<ClientTrainerOption>> fetchClientTrainers() async {
    final response = await _apiClient.dio.get<List<dynamic>>('/client/trainers');
    return (response.data ?? const [])
        .cast<Map<String, dynamic>>()
        .map(ClientTrainerOption.fromJson)
        .toList();
  }

  Future<void> markRead(String chatId) async {
    await _apiClient.dio.post<void>('/chats/$chatId/read');
  }

  Future<List<ChatMessage>> fetchMessages(
    String chatId, {
    int limit = 50,
  }) async {
    final response = await _apiClient.dio.get<List<dynamic>>(
      '/chats/$chatId/messages',
      queryParameters: {'limit': limit},
    );
    return (response.data ?? const [])
        .cast<Map<String, dynamic>>()
        .map(ChatMessage.fromJson)
        .toList();
  }

  Future<ChatMessage> sendMessage(String chatId, String text) async {
    final response = await _apiClient.dio.post<Map<String, dynamic>>(
      '/chats/$chatId/messages',
      data: {'text': text},
    );
    return ChatMessage.fromJson(response.data!);
  }

  io.Socket connect() {
    final token = _apiClient.accessToken ?? '';
    final socket = io.io(
      _socketUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .disableAutoConnect()
          .setAuth({'token': token})
          .enableReconnection()
          .build(),
    );
    socket.connect();
    return socket;
  }

  String get _socketUrl {
    final uri = Uri.parse(_apiClient.baseUrl);
    final port = uri.hasPort ? ':${uri.port}' : '';
    return '${uri.scheme}://${uri.host}$port/chat';
  }
}

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import 'chat_api.dart';
import 'chat_models.dart';

final chatApiProvider = Provider<ChatApi>(
  (ref) => ChatApi(ref.watch(apiClientProvider)),
);

final chatsProvider = FutureProvider.autoDispose<List<ChatSummary>>(
  (ref) => ref.watch(chatApiProvider).fetchChats(),
);

final unreadChatsProvider = Provider<int>((ref) {
  final chats = ref.watch(chatsProvider).asData?.value ?? const <ChatSummary>[];
  return chats.fold(0, (sum, chat) => sum + chat.unreadCount);
});

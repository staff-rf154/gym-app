import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import 'chat_api.dart';
import 'chat_models.dart';

final chatApiProvider = Provider<ChatApi>(
  (ref) => ChatApi(ref.watch(apiClientProvider)),
);

final chatsProvider = FutureProvider<List<ChatSummary>>(
  (ref) => ref.watch(chatApiProvider).fetchChats(),
);

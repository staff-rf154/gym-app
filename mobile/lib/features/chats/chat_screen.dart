import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../../core/api/api_error.dart';
import '../auth/auth_controller.dart';
import 'chat_models.dart';
import 'chat_providers.dart';

class ChatScreen extends StatelessWidget {
  const ChatScreen({super.key, required this.chat});

  final ChatSummary chat;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(chat.peerName)),
      body: ChatConversation(chat: chat),
    );
  }
}

class ChatConversation extends ConsumerStatefulWidget {
  const ChatConversation({super.key, required this.chat});

  final ChatSummary chat;

  @override
  ConsumerState<ChatConversation> createState() => _ChatConversationState();
}

class _ChatConversationState extends ConsumerState<ChatConversation> {
  final _messages = <ChatMessage>[];
  final _messageIds = <String>{};
  final _textController = TextEditingController();
  final _scrollController = ScrollController();

  io.Socket? _socket;
  bool _loading = true;
  bool _joining = false;
  bool _joined = false;
  String? _error;
  String? _socketError;
  late final String _currentUserId;

  @override
  void initState() {
    super.initState();
    _currentUserId = ref.read(authControllerProvider).value?.userId ?? '';
    _loadMessages();
    _connectSocket();
  }

  @override
  void dispose() {
    _socket?.emit('chat:leave', {'chatId': widget.chat.id});
    _socket?.dispose();
    _textController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadMessages() async {
    try {
      final messages = await ref
          .read(chatApiProvider)
          .fetchMessages(widget.chat.id);
      if (!mounted) {
        return;
      }
      setState(() {
        _messages
          ..clear()
          ..addAll(messages);
        _messageIds
          ..clear()
          ..addAll(messages.map((message) => message.id));
        _error = null;
      });
      _scrollToBottom();
      unawaited(_markRead());
    } catch (error) {
      if (mounted) {
        setState(() => _error = apiErrorMessage(error));
      }
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  void _connectSocket() {
    final socket = ref.read(chatApiProvider).connect();
    _socket = socket;

    socket.on('connect', (_) {
      _joinChat();
    });

    socket.on('connect_error', (error) {
      if (mounted) {
        setState(() => _socketError = 'WebSocket: $error');
      }
    });

    socket.on('chat:message', (data) {
      if (data is Map) {
        final message = ChatMessage.fromJson(
          Map<String, dynamic>.from(data),
        );
        if (message.chatId == widget.chat.id) {
          _appendMessage(message);
        }
      }
    });
  }

  void _joinChat() {
    final socket = _socket;
    if (socket == null) {
      return;
    }
    if (_joining) {
      return;
    }
    _joining = true;
    socket.emitWithAck(
      'chat:join',
      {'chatId': widget.chat.id},
      ack: (response) {
        _joining = false;
        _joined = response is Map && response['joined'] == true;
        if (!_joined && mounted) {
          setState(() => _socketError = 'Не удалось подключиться к чату');
        }
      },
    );
  }

  void _appendMessage(ChatMessage message) {
    if (!mounted || _messageIds.contains(message.id)) {
      return;
    }
    setState(() {
      _messages.add(message);
      _messageIds.add(message.id);
    });
    _scrollToBottom();
    if (message.senderId != _currentUserId) {
      unawaited(_markRead());
    }
  }

  Future<void> _markRead() async {
    try {
      await ref.read(chatApiProvider).markRead(widget.chat.id);
    } catch (_) {
      // Badge will refresh on the next chat list load.
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) {
        return;
      }
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOut,
      );
    });
  }

  Future<void> _send() async {
    final text = _textController.text.trim();
    if (text.isEmpty) {
      return;
    }

    _textController.clear();
    final socket = _socket;
    if (socket != null && socket.connected && _joined) {
      socket.emitWithAck(
        'chat:send',
        {'chatId': widget.chat.id, 'text': text},
        ack: (response) {
          if (response is Map && response['ok'] == true) {
            final data = response['message'];
            if (data is Map) {
              _appendMessage(
                ChatMessage.fromJson(Map<String, dynamic>.from(data)),
              );
            }
          } else {
            _sendViaRest(text);
          }
        },
      );
      return;
    }

    await _sendViaRest(text);
  }

  Future<void> _sendViaRest(String text) async {
    try {
      final message = await ref
          .read(chatApiProvider)
          .sendMessage(widget.chat.id, text);
      _appendMessage(message);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(apiErrorMessage(error))),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        if (_socketError != null)
          MaterialBanner(
            content: Text(_socketError!),
            actions: [
              TextButton(
                onPressed: () => setState(() => _socketError = null),
                child: const Text('Скрыть'),
              ),
            ],
          ),
        Expanded(child: _buildMessages(context)),
        if (widget.chat.isBlocked)
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: Text(
              'Переписка заблокирована: нет будущей тренировки '
              'и прошло более 10 дней с последней.',
              textAlign: TextAlign.center,
            ),
          ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 8, 8),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _textController,
                    enabled: !widget.chat.isBlocked,
                    textInputAction: TextInputAction.send,
                    onSubmitted: (_) => _send(),
                    decoration: const InputDecoration(
                      hintText: 'Сообщение',
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filled(
                  onPressed: widget.chat.isBlocked ? null : _send,
                  icon: const Icon(Icons.send),
                  tooltip: 'Отправить',
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildMessages(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () {
                  setState(() => _loading = true);
                  _loadMessages();
                },
                child: const Text('Повторить'),
              ),
            ],
          ),
        ),
      );
    }
    if (_messages.isEmpty) {
      return const Center(child: Text('Сообщений пока нет'));
    }

    final timeFormat = DateFormat('HH:mm');
    final dateFormat = DateFormat('dd.MM.yyyy');
    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.all(12),
      itemCount: _messages.length,
      itemBuilder: (context, index) {
        final message = _messages[index];
        final previous = index > 0 ? _messages[index - 1] : null;
        final showDate =
            previous == null ||
            !_isSameDay(previous.createdAt, message.createdAt);
        final own = message.senderId == _currentUserId;

        return Column(
          children: [
            if (showDate)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Text(
                  dateFormat.format(message.createdAt),
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
            Align(
              alignment: own ? Alignment.centerRight : Alignment.centerLeft,
              child: Container(
                margin: const EdgeInsets.only(bottom: 6),
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 8,
                ),
                constraints: BoxConstraints(
                  maxWidth: MediaQuery.sizeOf(context).width * 0.75,
                ),
                decoration: BoxDecoration(
                  color: own
                      ? Theme.of(context).colorScheme.primaryContainer
                      : Theme.of(context).colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(message.text),
                    const SizedBox(height: 2),
                    Text(
                      timeFormat.format(message.createdAt),
                      style: Theme.of(context).textTheme.labelSmall,
                    ),
                  ],
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  static bool _isSameDay(DateTime first, DateTime second) {
    return first.year == second.year &&
        first.month == second.month &&
        first.day == second.day;
  }
}

import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/notifications/notification_providers.dart';

StreamSubscription<RemoteMessage>? _messageSubscription;
StreamSubscription<String>? _tokenSubscription;
bool _clientPushStarted = false;

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  try {
    await Firebase.initializeApp();
  } catch (_) {}
}

Future<void> initClientPush(WidgetRef ref) async {
  if (_clientPushStarted) {
    return;
  }
  _clientPushStarted = true;
  try {
    if (Firebase.apps.isEmpty) {
      await Firebase.initializeApp();
    }

    final messaging = FirebaseMessaging.instance;
    await messaging.requestPermission();
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

    // ignore: deprecated_member_use
    final token = await messaging.getToken();
    if (token != null && token.isNotEmpty) {
      await ref.read(notificationsApiProvider).registerPushToken(token);
    }

    await _messageSubscription?.cancel();
    _messageSubscription = FirebaseMessaging.onMessage.listen((_) {
      ref.invalidate(notificationsProvider);
    });

    await _tokenSubscription?.cancel();
    // ignore: deprecated_member_use
    _tokenSubscription = messaging.onTokenRefresh.listen((newToken) async {
      try {
        await ref.read(notificationsApiProvider).registerPushToken(newToken);
      } catch (_) {}
    });
  } catch (error) {
    _clientPushStarted = false;
    debugPrint('FCM недоступен: $error');
  }
}

Future<void> disposeClientPush() async {
  await _messageSubscription?.cancel();
  await _tokenSubscription?.cancel();
  _messageSubscription = null;
  _tokenSubscription = null;
  _clientPushStarted = false;
}

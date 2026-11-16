import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_error.dart';
import '../../core/api/dio_client.dart';
import '../../core/providers.dart';
import 'auth_api.dart';
import 'models.dart';

final authApiProvider = Provider<AuthApi>(
  (ref) => AuthApi(ref.watch(apiClientProvider)),
);

final authControllerProvider =
    AsyncNotifierProvider<AuthController, UserProfile?>(AuthController.new);

const _supportedRoles = {'TRAINER', 'CLIENT'};
const _sessionTimeout = Duration(seconds: 8);

class AuthController extends AsyncNotifier<UserProfile?> {
  @override
  Future<UserProfile?> build() async {
    final client = ref.read(apiClientProvider);
    final accessToken = client.accessToken;
    if (accessToken == null || accessToken.isEmpty) {
      return null;
    }

    final cached = await _readCachedProfile(client);
    if (cached != null) {
      if (!_supportedRoles.contains(cached.role)) {
        await client.clearTokens();
        return null;
      }
      unawaited(_verifySession(client, cached));
      return cached;
    }

    try {
      final user = await ref
          .read(authApiProvider)
          .me()
          .timeout(_sessionTimeout);
      if (!_supportedRoles.contains(user.role)) {
        await client.clearTokens();
        return null;
      }
      await _saveCachedProfile(client, user);
      return user;
    } on TimeoutException {
      throw const AuthException(
        'Сервер не отвечает. Проверьте адрес и соединение.',
      );
    } on DioException catch (error) {
      final status = error.response?.statusCode;
      if (status == 401 || status == 403) {
        await client.clearTokens();
        return null;
      }
      rethrow;
    }
  }

  Future<void> _verifySession(ApiClient client, UserProfile cached) async {
    try {
      final user = await ref.read(authApiProvider).me();
      if (!ref.mounted) {
        return;
      }
      if (!_supportedRoles.contains(user.role)) {
        await client.clearTokens();
        if (!ref.mounted) {
          return;
        }
        state = const AsyncData(null);
        return;
      }
      await _saveCachedProfile(client, user);
      if (!ref.mounted || _sameProfile(cached, user)) {
        return;
      }
      state = AsyncData(user);
    } on DioException catch (error) {
      final status = error.response?.statusCode;
      if (status == 401 || status == 403) {
        await client.clearTokens();
        if (!ref.mounted) {
          return;
        }
        state = const AsyncData(null);
      }
    } catch (_) {
      // Кэш профиля остаётся доступным при временной недоступности сети.
    }
  }

  Future<void> login({required String phone, required String password}) async {
    final api = ref.read(authApiProvider);
    final client = ref.read(apiClientProvider);
    final tokens = await api.login(phone: phone, password: password);
    await client.saveTokens(
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    );
    final user = await api.me();
    if (!_supportedRoles.contains(user.role)) {
      await client.clearTokens();
      throw const AuthException('Роль пользователя не поддерживается');
    }
    await _saveCachedProfile(client, user);
    state = AsyncData(user);
  }

  Future<void> logout() async {
    await ref.read(apiClientProvider).clearTokens();
    state = const AsyncData(null);
  }

  Future<UserProfile?> _readCachedProfile(ApiClient client) async {
    final raw = await client.storage.readUserProfile();
    if (raw == null || raw.isEmpty) {
      return null;
    }
    try {
      final data = jsonDecode(raw);
      if (data is! Map<String, dynamic>) {
        await client.storage.clearUserProfile();
        return null;
      }
      return UserProfile.fromJson(data);
    } catch (_) {
      await client.storage.clearUserProfile();
      return null;
    }
  }

  Future<void> _saveCachedProfile(ApiClient client, UserProfile user) =>
      client.storage.saveUserProfile(jsonEncode(user.toJson()));

  bool _sameProfile(UserProfile a, UserProfile b) =>
      a.userId == b.userId &&
      a.role == b.role &&
      a.name == b.name &&
      a.phone == b.phone &&
      a.timezone == b.timezone;
}

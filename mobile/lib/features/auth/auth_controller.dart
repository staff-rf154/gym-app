import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_error.dart';
import '../../core/providers.dart';
import 'auth_api.dart';
import 'models.dart';

final authApiProvider = Provider<AuthApi>(
  (ref) => AuthApi(ref.watch(apiClientProvider)),
);

final authControllerProvider =
    AsyncNotifierProvider<AuthController, UserProfile?>(AuthController.new);

const _supportedRoles = {'TRAINER', 'CLIENT'};

class AuthController extends AsyncNotifier<UserProfile?> {
  @override
  Future<UserProfile?> build() async {
    final client = ref.read(apiClientProvider);
    final accessToken = await client.storage.readAccessToken();
    if (accessToken == null || accessToken.isEmpty) {
      return null;
    }
    try {
      final user = await ref.read(authApiProvider).me();
      if (!_supportedRoles.contains(user.role)) {
        await client.clearTokens();
        return null;
      }
      return user;
    } on DioException catch (error) {
      final status = error.response?.statusCode;
      if (status == 401 || status == 403) {
        await client.clearTokens();
        return null;
      }
      rethrow;
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
    state = AsyncData(user);
  }

  Future<void> logout() async {
    await ref.read(apiClientProvider).clearTokens();
    state = const AsyncData(null);
  }
}

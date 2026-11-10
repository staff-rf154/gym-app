import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorage {
  SecureStorage({FlutterSecureStorage? storage})
    : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  static const accessTokenKey = 'access_token';
  static const refreshTokenKey = 'refresh_token';
  static const apiBaseUrlKey = 'api_base_url';

  Future<String?> readAccessToken() => _storage.read(key: accessTokenKey);

  Future<String?> readRefreshToken() => _storage.read(key: refreshTokenKey);

  Future<String?> readApiBaseUrl() => _storage.read(key: apiBaseUrlKey);

  Future<void> saveAccessToken(String token) =>
      _storage.write(key: accessTokenKey, value: token);

  Future<void> saveRefreshToken(String token) =>
      _storage.write(key: refreshTokenKey, value: token);

  Future<void> saveApiBaseUrl(String baseUrl) =>
      _storage.write(key: apiBaseUrlKey, value: baseUrl);

  Future<void> clearAuth() async {
    await _storage.delete(key: accessTokenKey);
    await _storage.delete(key: refreshTokenKey);
  }
}

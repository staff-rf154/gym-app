import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorage {
  SecureStorage({FlutterSecureStorage? storage})
    : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  static const accessTokenKey = 'access_token';
  static const refreshTokenKey = 'refresh_token';
  static const apiBaseUrlKey = 'api_base_url';
  static const apiConfigVersionKey = 'api_config_version';
  static const userProfileKey = 'user_profile';
  static const trustedCertificateHostsKey = 'trusted_certificate_hosts';

  Future<String?> readAccessToken() => _storage.read(key: accessTokenKey);

  Future<String?> readRefreshToken() => _storage.read(key: refreshTokenKey);

  Future<String?> readApiBaseUrl() => _storage.read(key: apiBaseUrlKey);

  Future<String?> readApiConfigVersion() =>
      _storage.read(key: apiConfigVersionKey);

  Future<void> saveApiConfigVersion(String value) =>
      _storage.write(key: apiConfigVersionKey, value: value);

  Future<String?> readUserProfile() => _storage.read(key: userProfileKey);

  Future<Set<String>> readTrustedCertificateHosts() async {
    final raw = await _storage.read(key: trustedCertificateHostsKey);
    if (raw == null || raw.isEmpty) {
      return <String>{};
    }
    return raw
        .split('\n')
        .map((host) => host.trim())
        .where((host) => host.isNotEmpty)
        .toSet();
  }

  Future<void> saveTrustedCertificateHosts(Set<String> hosts) =>
      _storage.write(key: trustedCertificateHostsKey, value: hosts.join('\n'));

  Future<void> saveUserProfile(String value) =>
      _storage.write(key: userProfileKey, value: value);

  Future<void> clearUserProfile() => _storage.delete(key: userProfileKey);

  Future<void> saveAccessToken(String token) =>
      _storage.write(key: accessTokenKey, value: token);

  Future<void> saveRefreshToken(String token) =>
      _storage.write(key: refreshTokenKey, value: token);

  Future<void> saveApiBaseUrl(String baseUrl) =>
      _storage.write(key: apiBaseUrlKey, value: baseUrl);

  Future<void> clearAuth() async {
    await _storage.delete(key: accessTokenKey);
    await _storage.delete(key: refreshTokenKey);
    await _storage.delete(key: userProfileKey);
  }
}

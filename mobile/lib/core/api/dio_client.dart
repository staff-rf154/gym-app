import 'dart:io';

import 'package:dio/dio.dart';
import 'package:dio/io.dart';

import '../storage/secure_storage.dart';
import 'api_config.dart';

typedef CertificatePrompt = Future<bool> Function(String host, String details);

class ApiClient {
  ApiClient({required this.storage, Dio? dio, Dio? refreshDio})
    : _dio = dio ?? Dio(),
      _refreshDio = refreshDio ?? Dio() {
    _configure(_dio);
    _configure(_refreshDio);
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          options.baseUrl = _baseUrl;
          final token = _accessToken;
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          final certificateResponse = await _retryWithTrustedCertificate(
            _dio,
            error,
          );
          if (certificateResponse != null) {
            return handler.resolve(certificateResponse);
          }

          final isUnauthorized = error.response?.statusCode == 401;
          if (isUnauthorized && !_isAuthPath(error.requestOptions.path)) {
            final refreshed = await _tryRefresh();
            if (refreshed) {
              final requestOptions = error.requestOptions
                ..baseUrl = _baseUrl
                ..headers['Authorization'] = 'Bearer $_accessToken';
              try {
                final response = await _dio.fetch<dynamic>(requestOptions);
                return handler.resolve(response);
              } on DioException {
                return handler.next(error);
              }
            }
          }
          handler.next(error);
        },
      ),
    );
    _refreshDio.interceptors.add(
      InterceptorsWrapper(
        onError: (error, handler) async {
          final certificateResponse = await _retryWithTrustedCertificate(
            _refreshDio,
            error,
          );
          if (certificateResponse != null) {
            return handler.resolve(certificateResponse);
          }
          handler.next(error);
        },
      ),
    );
  }

  final SecureStorage storage;
  final Dio _dio;
  final Dio _refreshDio;

  CertificatePrompt? certificatePrompt;

  String _baseUrl = '';
  String? _accessToken;
  String? _refreshToken;
  Future<bool>? _refreshFuture;
  final Set<String> _trustedCertificateHosts = <String>{};
  final Map<String, Future<bool>> _certificatePrompts =
      <String, Future<bool>>{};

  Dio get dio => _dio;

  String get baseUrl => _baseUrl;

  String? get accessToken => _accessToken;

  bool get isConfigured => _baseUrl.isNotEmpty;

  Future<void> init() async {
    final saved = await Future.wait([
      storage.readApiBaseUrl(),
      storage.readAccessToken(),
      storage.readRefreshToken(),
      storage.readTrustedCertificateHosts(),
      storage.readApiConfigVersion(),
    ]);
    final savedBaseUrl = saved[0] as String?;
    _baseUrl = normalizeApiBaseUrl(
      resolveApiBaseUrl(
        savedBaseUrl: savedBaseUrl,
        savedVersion: saved[4] as String?,
      ),
    );
    if (savedBaseUrl != null &&
        savedBaseUrl.isNotEmpty &&
        savedBaseUrl != _baseUrl) {
      await storage.saveApiBaseUrl(_baseUrl);
    }
    await storage.saveApiConfigVersion('$currentApiConfigVersion');
    _accessToken = saved[1] as String?;
    _refreshToken = saved[2] as String?;
    _trustedCertificateHosts
      ..clear()
      ..addAll(saved[3] as Set<String>);
  }

  Future<void> setBaseUrl(String raw) async {
    _baseUrl = normalizeApiBaseUrl(raw);
    await storage.saveApiBaseUrl(_baseUrl);
  }

  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    _accessToken = accessToken;
    _refreshToken = refreshToken;
    await storage.saveAccessToken(accessToken);
    await storage.saveRefreshToken(refreshToken);
  }

  Future<void> clearTokens() async {
    _accessToken = null;
    _refreshToken = null;
    await storage.clearAuth();
  }

  void _configure(Dio dio) {
    dio.options
      ..connectTimeout = const Duration(seconds: 15)
      ..receiveTimeout = const Duration(seconds: 30)
      ..headers['Accept'] = 'application/json';
    dio.httpClientAdapter = IOHttpClientAdapter(
      createHttpClient: () {
        final client = HttpClient(context: SecurityContext.defaultContext);
        client.badCertificateCallback = (certificate, host, port) {
          return _trustedCertificateHosts.contains(_hostKey(host, port));
        };
        return client;
      },
    );
  }

  Future<Response<dynamic>?> _retryWithTrustedCertificate(
    Dio dio,
    DioException error,
  ) async {
    if (!_isCertificateError(error)) {
      return null;
    }
    if (!await _acceptCertificate(error)) {
      return null;
    }
    try {
      return await dio.fetch<dynamic>(error.requestOptions);
    } on DioException {
      return null;
    }
  }

  bool _isCertificateError(DioException error) {
    if (error.type == DioExceptionType.badCertificate) {
      return true;
    }
    final inner = error.error;
    return inner is HandshakeException || inner is TlsException;
  }

  Future<bool> _acceptCertificate(DioException error) async {
    final uri = error.requestOptions.uri;
    final key = _hostKey(uri.host, uri.port);
    if (_trustedCertificateHosts.contains(key)) {
      return false;
    }

    final existing = _certificatePrompts[key];
    if (existing != null) {
      return existing;
    }

    final prompt = certificatePrompt;
    if (prompt == null) {
      return false;
    }

    final future = _promptForCertificate(prompt, key, error);
    _certificatePrompts[key] = future;
    try {
      return await future;
    } finally {
      _certificatePrompts.remove(key);
    }
  }

  Future<bool> _promptForCertificate(
    CertificatePrompt prompt,
    String key,
    DioException error,
  ) async {
    final accepted = await prompt(key, _certificateDetails(error));
    if (!accepted) {
      return false;
    }
    _trustedCertificateHosts.add(key);
    await storage.saveTrustedCertificateHosts(_trustedCertificateHosts);
    return true;
  }

  String _certificateDetails(DioException error) {
    final details = error.error?.toString() ?? error.message ?? '';
    return details.length > 500 ? details.substring(0, 500) : details;
  }

  String _hostKey(String host, int port) => '$host:$port';

  bool _isAuthPath(String path) =>
      path.contains('/auth/login') || path.contains('/auth/refresh');

  Future<bool> _tryRefresh() {
    final existing = _refreshFuture;
    if (existing != null) {
      return existing;
    }
    final future = _refresh();
    _refreshFuture = future;
    future.whenComplete(() => _refreshFuture = null);
    return future;
  }

  Future<bool> _refresh() async {
    final token = _refreshToken;
    if (token == null || token.isEmpty) {
      return false;
    }
    try {
      final response = await _refreshDio.post<Map<String, dynamic>>(
        '$_baseUrl/auth/refresh',
        data: {'refresh_token': token},
      );
      final data = response.data;
      if (data == null) {
        return false;
      }
      await saveTokens(
        accessToken: data['access_token'] as String,
        refreshToken: data['refresh_token'] as String,
      );
      return true;
    } on DioException {
      await clearTokens();
      return false;
    }
  }
}

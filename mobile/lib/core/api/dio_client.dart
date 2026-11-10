import 'package:dio/dio.dart';

import '../storage/secure_storage.dart';
import 'api_config.dart';

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
  }

  final SecureStorage storage;
  final Dio _dio;
  final Dio _refreshDio;

  String _baseUrl = '';
  String? _accessToken;
  String? _refreshToken;
  Future<bool>? _refreshFuture;

  Dio get dio => _dio;

  String get baseUrl => _baseUrl;

  bool get isConfigured => _baseUrl.isNotEmpty;

  Future<void> init() async {
    final savedBaseUrl = await storage.readApiBaseUrl();
    _baseUrl = normalizeApiBaseUrl(
      savedBaseUrl?.isNotEmpty == true ? savedBaseUrl! : defaultApiBaseUrl,
    );
    _accessToken = await storage.readAccessToken();
    _refreshToken = await storage.readRefreshToken();
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
  }

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

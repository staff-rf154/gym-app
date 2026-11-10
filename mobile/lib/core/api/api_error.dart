import 'package:dio/dio.dart';

class AuthException implements Exception {
  const AuthException(this.message);

  final String message;

  @override
  String toString() => message;
}

String apiErrorMessage(Object error) {
  if (error is AuthException) {
    return error.message;
  }
  if (error is DioException) {
    final data = error.response?.data;
    if (data is Map) {
      final message = data['message'];
      if (message is List) {
        return message.join(', ');
      }
      if (message != null) {
        return message.toString();
      }
    }
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return 'Сервер не отвечает. Проверьте адрес и соединение.';
      case DioExceptionType.connectionError:
        return 'Не удалось подключиться к серверу.';
      default:
        return error.message ?? 'Ошибка сети';
    }
  }
  return 'Неизвестная ошибка';
}

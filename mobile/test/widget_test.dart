import 'package:flutter_test/flutter_test.dart';
import 'package:gym_trainer/core/api/api_config.dart';

void main() {
  group('normalizeApiBaseUrl', () {
    test('adds https and /api/v1', () {
      expect(
        normalizeApiBaseUrl('gym.example.com'),
        'https://gym.example.com/api/v1',
      );
    });

    test('keeps an explicit scheme and strips trailing slashes', () {
      expect(
        normalizeApiBaseUrl('http://10.0.2.2:8080/'),
        'http://10.0.2.2:8080/api/v1',
      );
    });

    test('does not duplicate the api prefix', () {
      expect(
        normalizeApiBaseUrl('https://gym.example.com/api/v1'),
        'https://gym.example.com/api/v1',
      );
    });

    test('returns an empty value unchanged', () {
      expect(normalizeApiBaseUrl('  '), '');
    });
  });
}

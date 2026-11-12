import 'package:flutter_test/flutter_test.dart';
import 'package:gym_trainer/core/api/api_config.dart';
import 'package:gym_trainer/features/clients/trainer_client.dart';

void main() {
  group('TrainerClient.fromJson', () {
    test('parses goal object from trainer clients endpoint', () {
      final client = TrainerClient.fromJson({
        'id': 'client-1',
        'userId': 'user-1',
        'name': 'Иван Иванов',
        'phone': '+70000000000',
        'goal': {'id': 'goal-1', 'name': 'Похудение', 'description': null},
        'goalText': 'старая цель',
        'active_trainers': [
          {
            'trainerId': 'trainer-1',
            'trainerName': 'Пётр',
            'assignedBy': 'ADMIN',
          },
        ],
      });

      expect(client.goal, 'Похудение');
      expect(client.trainers.single.trainerName, 'Пётр');
    });

    test('falls back to goalText when goal object is null', () {
      final client = TrainerClient.fromJson({
        'id': 'client-1',
        'userId': 'user-1',
        'name': 'Иван Иванов',
        'phone': '+70000000000',
        'goal': null,
        'goalText': 'Масса',
      });

      expect(client.goal, 'Масса');
    });

    test('keeps legacy string goal', () {
      final client = TrainerClient.fromJson({
        'id': 'client-1',
        'userId': 'user-1',
        'name': 'Иван Иванов',
        'phone': '+70000000000',
        'goal': 'Сила',
      });

      expect(client.goal, 'Сила');
    });
  });

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

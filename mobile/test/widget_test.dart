import 'package:flutter_test/flutter_test.dart';
import 'package:gym_trainer/core/api/api_config.dart';
import 'package:gym_trainer/features/client/client_workout_models.dart';
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

  group('resolveApiBaseUrl', () {
    test('replaces a saved url when the config version is outdated', () {
      expect(
        resolveApiBaseUrl(
          savedBaseUrl: 'https://gym.example.com/api/v1',
          savedVersion: '1',
        ),
        defaultApiBaseUrl,
      );
      expect(
        resolveApiBaseUrl(savedBaseUrl: 'https://gym.example.com/api/v1'),
        defaultApiBaseUrl,
      );
    });

    test('keeps a saved url for the current config version', () {
      expect(
        resolveApiBaseUrl(
          savedBaseUrl: 'https://example.com/api/v1',
          savedVersion: '$currentApiConfigVersion',
        ),
        'https://example.com/api/v1',
      );
    });
  });

  group('matchesWorkoutPeriod', () {
    final now = DateTime(2026, 11, 15);

    test('all matches any date', () {
      expect(
        matchesWorkoutPeriod('2024-01-01', WorkoutPeriod.all, now: now),
        isTrue,
      );
    });

    test('this week is Monday–Sunday', () {
      expect(
        matchesWorkoutPeriod('2026-11-09', WorkoutPeriod.thisWeek, now: now),
        isTrue,
      );
      expect(
        matchesWorkoutPeriod('2026-11-15', WorkoutPeriod.thisWeek, now: now),
        isTrue,
      );
      expect(
        matchesWorkoutPeriod('2026-11-08', WorkoutPeriod.thisWeek, now: now),
        isFalse,
      );
      expect(
        matchesWorkoutPeriod('2026-11-16', WorkoutPeriod.thisWeek, now: now),
        isFalse,
      );
    });

    test('this month', () {
      expect(
        matchesWorkoutPeriod('2026-11-01', WorkoutPeriod.thisMonth, now: now),
        isTrue,
      );
      expect(
        matchesWorkoutPeriod('2026-10-31', WorkoutPeriod.thisMonth, now: now),
        isFalse,
      );
    });

    test('previous month', () {
      expect(
        matchesWorkoutPeriod(
          '2026-10-15',
          WorkoutPeriod.previousMonth,
          now: now,
        ),
        isTrue,
      );
      expect(
        matchesWorkoutPeriod(
          '2026-11-01',
          WorkoutPeriod.previousMonth,
          now: now,
        ),
        isFalse,
      );
    });

    test('last three months', () {
      expect(
        matchesWorkoutPeriod(
          '2026-09-01',
          WorkoutPeriod.lastThreeMonths,
          now: now,
        ),
        isTrue,
      );
      expect(
        matchesWorkoutPeriod(
          '2026-08-31',
          WorkoutPeriod.lastThreeMonths,
          now: now,
        ),
        isFalse,
      );
    });
  });
}

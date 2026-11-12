import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:gym_trainer/core/storage/secure_storage.dart';
import 'package:gym_trainer/core/api/dio_client.dart';
import 'package:gym_trainer/features/auth/auth_api.dart';
import 'package:gym_trainer/features/auth/auth_controller.dart';
import 'package:gym_trainer/features/auth/models.dart';
import 'package:gym_trainer/features/chats/chat_api.dart';
import 'package:gym_trainer/features/chats/chat_models.dart';
import 'package:gym_trainer/features/chats/chat_providers.dart';
import 'package:gym_trainer/features/chats/chats_screen.dart';
import 'package:gym_trainer/features/client/client_calendar_tab.dart';
import 'package:gym_trainer/features/client/client_nutrition_tab.dart';
import 'package:gym_trainer/features/client/client_reports_tab.dart';
import 'package:gym_trainer/features/client/client_workout_models.dart';
import 'package:gym_trainer/features/client/client_workouts_api.dart';
import 'package:gym_trainer/features/client/client_workouts_providers.dart';
import 'package:gym_trainer/features/client/workout_day_screen.dart';
import 'package:gym_trainer/features/notifications/notification_api.dart';
import 'package:gym_trainer/features/notifications/notification_models.dart';
import 'package:gym_trainer/features/notifications/notification_providers.dart';
import 'package:gym_trainer/features/notifications/notifications_screen.dart';
import 'package:gym_trainer/features/nutrition/nutrition_api.dart';
import 'package:gym_trainer/features/nutrition/nutrition_models.dart';
import 'package:gym_trainer/features/nutrition/nutrition_providers.dart';
import 'package:gym_trainer/features/progress/report_models.dart';
import 'package:gym_trainer/features/progress/reports_api.dart';
import 'package:gym_trainer/features/progress/reports_providers.dart';
import 'package:gym_trainer/features/settings/settings_screen.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

ApiClient _dummyApi() => ApiClient(storage: SecureStorage());

String _dateKey(DateTime value) {
  final month = value.month.toString().padLeft(2, '0');
  final day = value.day.toString().padLeft(2, '0');
  return '${value.year}-$month-$day';
}

const _clientUser = UserProfile(
  userId: 'client-1',
  role: 'CLIENT',
  name: 'Иван Клиент',
  phone: '+79990000001',
  timezone: 'UTC',
);

class _FakeAuthApi extends AuthApi {
  _FakeAuthApi() : super(_dummyApi());

  String? savedTimezone;
  int updateCalls = 0;

  @override
  Future<void> updateTimezone(String timezone) async {
    savedTimezone = timezone;
    updateCalls++;
  }
}

class _FakeAuthController extends AuthController {
  _FakeAuthController(this._user);

  final UserProfile? _user;

  @override
  Future<UserProfile?> build() async => _user;
}

class _FakeClientWorkoutsApi extends ClientWorkoutsApi {
  _FakeClientWorkoutsApi() : super(_dummyApi());

  List<ClientWorkout> workouts = const [];
  List<ClientWorkout> workoutById = const [];
  final Map<String, WorkoutItemResultInput> savedResults = {};

  @override
  Future<List<ClientWorkout>> fetchWorkouts({
    required DateTime from,
    required DateTime to,
  }) async => workouts;

  @override
  Future<ClientWorkout> fetchWorkout(String id) async =>
      workoutById.firstWhere((workout) => workout.id == id);

  @override
  Future<void> saveItemResult(
    String itemId,
    WorkoutItemResultInput input,
  ) async {
    savedResults[itemId] = input;
  }
}

class _FakeNutritionApi extends NutritionApi {
  _FakeNutritionApi() : super(_dummyApi());

  List<NutritionRecommendation> recommendations = const [];
  DateTime? requestedDate;

  @override
  Future<List<NutritionRecommendation>> fetchForDate(DateTime date) async {
    requestedDate = date;
    return recommendations;
  }

  @override
  Future<List<NutritionRecommendation>> fetchForClient(String clientId) async =>
      recommendations;
}

class _FakeReportsApi extends ReportsApi {
  _FakeReportsApi() : super(_dummyApi());

  List<WeightDynamicsPoint> weightPoints = const [];
  List<ExerciseSummaryItem> summary = const [];
  ExerciseProgress? progress;

  @override
  Future<List<WeightDynamicsPoint>> fetchWeightDynamics(
    String clientId,
  ) async => weightPoints;

  @override
  Future<List<ExerciseSummaryItem>> fetchExercisesSummary(
    String clientId,
  ) async => summary;

  @override
  Future<ExerciseProgress> fetchExerciseProgress({
    required String clientId,
    required String exerciseId,
  }) async => progress!;
}

class _FakeNotificationsApi extends NotificationsApi {
  _FakeNotificationsApi() : super(_dummyApi());

  List<AppNotification> notifications = const [];
  final List<String> markedRead = [];

  @override
  Future<List<AppNotification>> fetchNotifications() async => notifications;

  @override
  Future<void> markRead(String id) async {
    markedRead.add(id);
    notifications = [
      for (final item in notifications)
        if (item.id == id)
          AppNotification(
            id: item.id,
            gymId: item.gymId,
            title: item.title,
            body: item.body,
            createdAt: item.createdAt,
            readAt: DateTime.now(),
          )
        else
          item,
    ];
  }
}

class _FakeChatApi extends ChatApi {
  _FakeChatApi() : super(_dummyApi());

  List<ChatSummary> chats = const [];
  List<ChatMessage> messages = const [];
  final List<String> sentTexts = [];

  @override
  Future<List<ChatSummary>> fetchChats() async => chats;

  @override
  Future<List<ChatMessage>> fetchMessages(String chatId, {int limit = 50}) async =>
      messages;

  @override
  Future<ChatMessage> sendMessage(String chatId, String text) async {
    sentTexts.add(text);
    return ChatMessage(
      id: 'm-sent-${sentTexts.length}',
      chatId: chatId,
      senderId: _clientUser.userId,
      text: text,
      createdAt: DateTime.now(),
    );
  }

  @override
  io.Socket connect() => io.io(
    'http://127.0.0.1:1/chat',
    io.OptionBuilder()
        .setTransports(['websocket'])
        .disableAutoConnect()
        .build(),
  );
}

ClientWorkout _workout(DateTime date, {String status = 'PLANNED'}) =>
    ClientWorkout(
      id: 'workout-1',
      clientId: _clientUser.userId,
      gymId: 'gym-1',
      date: _dateKey(date),
      status: status,
      comment: 'Разминка 10 минут',
      items: const [
        ClientWorkoutItem(
          id: 'item-1',
          exerciseId: 'exercise-1',
          exerciseName: 'Жим лёжа',
          plannedWeight: 80,
          plannedSets: 4,
          plannedReps: 8,
          order: 1,
        ),
      ],
    );

Widget _app(ProviderContainer container, Widget child) {
  return UncontrolledProviderScope(
    container: container,
    child: MaterialApp(home: child),
  );
}

void main() {
  testWidgets('M8: календарь показывает тренировку и открывает день', (
    tester,
  ) async {
    final api = _FakeClientWorkoutsApi()
      ..workouts = [_workout(DateTime.now())]
      ..workoutById = [_workout(DateTime.now())];

    final container = ProviderContainer(
      overrides: [clientWorkoutsApiProvider.overrideWithValue(api)],
    );
    addTearDown(container.dispose);

    await tester.pumpWidget(
      _app(container, const Scaffold(body: ClientCalendarTab())),
    );
    await tester.pumpAndSettle();

    expect(find.text('${DateTime.now().day}'), findsOneWidget);

    await tester.tap(find.text('${DateTime.now().day}'));
    await tester.pumpAndSettle();

    expect(find.textContaining('Тренировка ·'), findsOneWidget);
    expect(find.text('Жим лёжа'), findsOneWidget);
    expect(find.text('Разминка 10 минут'), findsOneWidget);
  });

  testWidgets('M9: отметка done с фактическим весом сохраняется', (
    tester,
  ) async {
    final workout = _workout(DateTime.now(), status: 'IN_PROGRESS');
    final api = _FakeClientWorkoutsApi();

    final container = ProviderContainer(
      overrides: [clientWorkoutsApiProvider.overrideWithValue(api)],
    );
    addTearDown(container.dispose);

    await tester.pumpWidget(
      _app(
        container,
        WorkoutDayScreen(date: DateTime.now(), workouts: [workout]),
      ),
    );
    await tester.pumpAndSettle();

    final fields = find.byType(TextField);
    await tester.enterText(fields.at(0), '82.5');
    await tester.enterText(fields.at(1), '8');
    await tester.enterText(fields.at(2), 'Тяжело');
    await tester.tap(find.byType(Checkbox));
    await tester.pump();

    await tester.tap(find.text('Сохранить результаты'));
    await tester.pumpAndSettle();

    final saved = api.savedResults['item-1'];
    expect(saved, isNotNull);
    expect(saved!.done, isTrue);
    expect(saved.actualWeight, 82.5);
    expect(saved.actualReps, 8);
    expect(saved.clientComment, 'Тяжело');
    expect(find.text('Результаты сохранены'), findsOneWidget);
  });

  testWidgets('M15: до старта поля заблокированы', (tester) async {
    final workout = _workout(DateTime.now());
    final api = _FakeClientWorkoutsApi();

    final container = ProviderContainer(
      overrides: [clientWorkoutsApiProvider.overrideWithValue(api)],
    );
    addTearDown(container.dispose);

    await tester.pumpWidget(
      _app(
        container,
        WorkoutDayScreen(date: DateTime.now(), workouts: [workout]),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Начать тренировку'), findsOneWidget);
    expect(find.text('Сохранить результаты'), findsNothing);

    final fields = tester.widgetList<TextField>(find.byType(TextField));
    expect(fields, isNotEmpty);
    expect(fields.every((field) => field.enabled == false), isTrue);
  });

  testWidgets('M16: завершённая тренировка только для чтения', (tester) async {
    final workout = _workout(DateTime.now(), status: 'DONE');
    final api = _FakeClientWorkoutsApi();

    final container = ProviderContainer(
      overrides: [clientWorkoutsApiProvider.overrideWithValue(api)],
    );
    addTearDown(container.dispose);

    await tester.pumpWidget(
      _app(
        container,
        WorkoutDayScreen(date: DateTime.now(), workouts: [workout]),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Выполнена'), findsOneWidget);
    expect(find.text('Начать тренировку'), findsNothing);
    expect(find.text('Сохранить результаты'), findsNothing);
    expect(find.textContaining('только для чтения'), findsOneWidget);
  });

  testWidgets('M10: питание от тренера отображается на клиенте', (
    tester,
  ) async {
    final api = _FakeNutritionApi()
      ..recommendations = [
        NutritionRecommendation(
          id: 'nutrition-1',
          clientId: _clientUser.userId,
          trainerId: 'trainer-1',
          type: NutritionType.daily,
          kcal: 2200,
          protein: 150,
          fat: 70,
          carbs: 200,
          comment: 'Пить больше воды',
          validFrom: DateTime.now().subtract(const Duration(days: 1)),
          validTo: DateTime.now().add(const Duration(days: 7)),
          createdAt: DateTime.now(),
        ),
      ];

    final container = ProviderContainer(
      overrides: [nutritionApiProvider.overrideWithValue(api)],
    );
    addTearDown(container.dispose);

    await tester.pumpWidget(
      _app(container, const Scaffold(body: ClientNutritionTab())),
    );
    await tester.pumpAndSettle();

    expect(find.text('Ежедневно'), findsOneWidget);
    expect(find.textContaining('2200 ккал'), findsOneWidget);
    expect(find.textContaining('Б 150'), findsOneWidget);
    expect(find.text('Пить больше воды'), findsOneWidget);
  });

  testWidgets('M11: графики отчётов отрисовываются и открывают прогресс', (
    tester,
  ) async {
    final api = _FakeReportsApi()
      ..weightPoints = [
        WeightDynamicsPoint(
          measuredAt: DateTime(2026, 11, 1),
          weight: 80,
          fatMass: 18,
        ),
        WeightDynamicsPoint(
          measuredAt: DateTime(2026, 11, 8),
          weight: 79,
          fatMass: 17.5,
        ),
      ]
      ..summary = const [
        ExerciseSummaryItem(
          exerciseId: 'exercise-1',
          exerciseName: 'Приседания',
          recordsCount: 2,
          firstWeight: 80,
          lastWeight: 90,
        ),
      ]
      ..progress = ExerciseProgress(
        exerciseId: 'exercise-1',
        exerciseName: 'Приседания',
        points: [
          ExerciseProgressPoint(
            date: '2026-11-01',
            plannedWeight: 80,
            actualWeight: 82.5,
            plannedReps: 8,
            actualReps: 8,
            done: true,
            isActualFallback: false,
          ),
          ExerciseProgressPoint(
            date: '2026-11-08',
            plannedWeight: 85,
            actualWeight: 85,
            plannedReps: 8,
            actualReps: 8,
            done: false,
            isActualFallback: true,
          ),
        ],
      );

    final container = ProviderContainer(
      overrides: [reportsApiProvider.overrideWithValue(api)],
    );
    addTearDown(container.dispose);

    await tester.pumpWidget(_app(container, const ClientReportsTab()));
    await tester.pumpAndSettle();

    expect(find.text('Динамика веса'), findsOneWidget);
    expect(find.byType(LineChart), findsWidgets);

    await tester.tap(find.text('Упражнения'));
    await tester.pumpAndSettle();
    expect(find.text('Приседания'), findsOneWidget);
    expect(find.textContaining('Начал 80 кг'), findsOneWidget);

    await tester.tap(find.text('Приседания'));
    await tester.pumpAndSettle();
    expect(find.text('План и факт по весу'), findsOneWidget);
    expect(find.textContaining('Факт: 82.5 кг'), findsOneWidget);
  });

  testWidgets('M12: чат показывает сообщение тренера и отправляет ответ', (
    tester,
  ) async {
    final chat = const ChatSummary(
      id: 'chat-1',
      type: 'TRAINER_CLIENT',
      peerId: 'trainer-1',
      peerName: 'Тренер Пётр',
      lastMessage: 'Привет',
      unreadCount: 1,
    );
    final api = _FakeChatApi()
      ..chats = [chat]
      ..messages = [
        ChatMessage(
          id: 'm-1',
          chatId: 'chat-1',
          senderId: 'trainer-1',
          text: 'Как прошла тренировка?',
          createdAt: DateTime.now(),
        ),
      ];

    final container = ProviderContainer(
      overrides: [
        chatApiProvider.overrideWithValue(api),
        authControllerProvider.overrideWith(
          () => _FakeAuthController(_clientUser),
        ),
      ],
    );
    addTearDown(container.dispose);

    await tester.pumpWidget(_app(container, const ChatsScreen()));
    await tester.pumpAndSettle();

    expect(find.text('Тренер Пётр'), findsOneWidget);
    expect(find.text('Привет'), findsOneWidget);

    await tester.tap(find.text('Тренер Пётр'));
    await tester.pumpAndSettle();

    expect(find.text('Как прошла тренировка?'), findsOneWidget);

    await tester.enterText(find.byType(TextField), 'Всё отлично');
    await tester.tap(find.byIcon(Icons.send));
    await tester.pumpAndSettle();

    expect(api.sentTexts, contains('Всё отлично'));
    expect(find.text('Всё отлично'), findsOneWidget);
  });

  testWidgets('M13: уведомление видно и отмечается прочитанным', (
    tester,
  ) async {
    final api = _FakeNotificationsApi()
      ..notifications = [
        AppNotification(
          id: 'notification-1',
          gymId: 'gym-1',
          title: 'Напоминание',
          body: 'Тренировка завтра в 18:00',
          createdAt: DateTime(2026, 11, 9, 12),
          readAt: null,
        ),
      ];

    final container = ProviderContainer(
      overrides: [notificationsApiProvider.overrideWithValue(api)],
    );
    addTearDown(container.dispose);

    await tester.pumpWidget(_app(container, const NotificationsScreen()));
    await tester.pumpAndSettle();

    expect(find.text('Напоминание'), findsOneWidget);
    expect(find.text('Тренировка завтра в 18:00'), findsOneWidget);
    expect(find.byIcon(Icons.notifications_active), findsOneWidget);

    await tester.tap(find.text('Напоминание'));
    await tester.pumpAndSettle();

    expect(api.markedRead, contains('notification-1'));
    expect(find.byIcon(Icons.done_all), findsOneWidget);
    expect(find.byIcon(Icons.notifications_active), findsNothing);
  });

  testWidgets('M14: смена часового пояса сохраняется', (tester) async {
    final api = _FakeAuthApi();

    final container = ProviderContainer(
      overrides: [
        authApiProvider.overrideWithValue(api),
        authControllerProvider.overrideWith(
          () => _FakeAuthController(_clientUser),
        ),
      ],
    );
    addTearDown(container.dispose);

    await tester.pumpWidget(
      _app(container, const Scaffold(body: SettingsScreen(embedded: true))),
    );
    await tester.pumpAndSettle();

    expect(find.text('Иван Клиент'), findsOneWidget);
    expect(find.text('UTC'), findsOneWidget);

    await tester.tap(find.text('Часовой пояс'));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField), 'Berlin');
    await tester.pumpAndSettle();

    await tester.tap(find.text('Europe/Berlin'));
    await tester.pumpAndSettle();

    expect(api.updateCalls, 1);
    expect(api.savedTimezone, 'Europe/Berlin');
    expect(find.text('Часовой пояс сохранён'), findsOneWidget);
  });
}

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/push/push_service.dart';
import '../auth/models.dart';
import '../chats/chat_providers.dart';
import '../chats/chats_screen.dart';
import '../notifications/notification_bell.dart';
import '../notifications/startup_notifications.dart';
import '../settings/settings_screen.dart';
import 'client_calendar_tab.dart';
import 'client_nutrition_tab.dart';
import 'client_reports_tab.dart';
import 'client_workouts_tab.dart';

class ClientHomeScreen extends ConsumerStatefulWidget {
  const ClientHomeScreen({super.key, required this.user});

  final UserProfile user;

  @override
  ConsumerState<ClientHomeScreen> createState() => _ClientHomeScreenState();
}

class _ClientHomeScreenState extends ConsumerState<ClientHomeScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) {
        return;
      }
      initClientPush(ref);
      unawaited(showStartupNotifications(context, ref));
    });
  }

  @override
  void dispose() {
    disposeClientPush();
    super.dispose();
  }

  int _index = 0;
  final Set<int> _visitedTabs = {0};

  static const _titles = [
    'Календарь',
    'Тренировки',
    'Питание',
    'Отчёты',
    'Чаты',
    'Настройки',
  ];

  Widget _tabAt(int index) {
    return switch (index) {
      0 => const ClientCalendarTab(),
      1 => const ClientWorkoutsTab(),
      2 => const ClientNutritionTab(),
      3 => const ClientReportsTab(),
      4 => const ChatsScreen(embedded: true),
      _ => const SettingsScreen(embedded: true),
    };
  }

  @override
  Widget build(BuildContext context) {
    final unreadChats = ref.watch(unreadChatsProvider);
    return Scaffold(
      appBar: AppBar(
        title: Text(_titles[_index]),
        actions: [
          const NotificationBell(),
          if (_index == 0)
            Padding(
              padding: const EdgeInsets.only(right: 16),
              child: Center(
                child: Text(
                  widget.user.name,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
            ),
        ],
      ),
      body: IndexedStack(
        index: _index,
        children: List.generate(
          _titles.length,
          (index) => _visitedTabs.contains(index)
              ? _tabAt(index)
              : const SizedBox.shrink(),
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (value) => setState(() {
          _index = value;
          _visitedTabs.add(value);
        }),
        destinations: [
          const NavigationDestination(
            icon: Icon(Icons.calendar_month_outlined),
            selectedIcon: Icon(Icons.calendar_month),
            label: 'Календарь',
          ),
          const NavigationDestination(
            icon: Icon(Icons.fitness_center_outlined),
            selectedIcon: Icon(Icons.fitness_center),
            label: 'Трен.',
          ),
          const NavigationDestination(
            icon: Icon(Icons.restaurant_outlined),
            selectedIcon: Icon(Icons.restaurant),
            label: 'Питание',
          ),
          const NavigationDestination(
            icon: Icon(Icons.insights_outlined),
            selectedIcon: Icon(Icons.insights),
            label: 'Отчёты',
          ),
          NavigationDestination(
            icon: Badge(
              isLabelVisible: unreadChats > 0,
              label: Text('$unreadChats'),
              child: const Icon(Icons.chat_bubble_outline),
            ),
            selectedIcon: Badge(
              isLabelVisible: unreadChats > 0,
              label: Text('$unreadChats'),
              child: const Icon(Icons.chat_bubble),
            ),
            label: 'Чаты',
          ),
          const NavigationDestination(
            icon: Icon(Icons.settings_outlined),
            selectedIcon: Icon(Icons.settings),
            label: 'Ещё',
          ),
        ],
      ),
    );
  }
}

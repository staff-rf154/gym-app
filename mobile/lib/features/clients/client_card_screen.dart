import 'package:flutter/material.dart';

import '../weights/weight_tab.dart';
import '../workouts/workout_builder_screen.dart';
import 'trainer_client.dart';

class ClientCardScreen extends StatelessWidget {
  const ClientCardScreen({super.key, required this.client});

  final TrainerClient client;

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 5,
      child: Scaffold(
        appBar: AppBar(
          title: Text(client.name),
          bottom: const TabBar(
            isScrollable: true,
            tabs: [
              Tab(text: 'Тренировки'),
              Tab(text: 'Прогресс'),
              Tab(text: 'Питание'),
              Tab(text: 'Вес'),
              Tab(text: 'Чат'),
            ],
          ),
        ),
        body: Column(
          children: [
            _ClientSummary(client: client),
            Expanded(
              child: TabBarView(
                children: [
                  _WorkoutsTab(client: client),
                  _PlaceholderTab(
                    icon: Icons.show_chart,
                    title: 'Прогресс',
                    description: 'Графики веса и упражнений — шаг 5.7.',
                  ),
                  _PlaceholderTab(
                    icon: Icons.restaurant,
                    title: 'Питание',
                    description: 'Рекомендации по питанию — шаг 5.8.',
                  ),
                  WeightTab(client: client),
                  _PlaceholderTab(
                    icon: Icons.chat_bubble_outline,
                    title: 'Чат',
                    description: 'Переписка с клиентом — шаг 5.9.',
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _WorkoutsTab extends StatelessWidget {
  const _WorkoutsTab({required this.client});

  final TrainerClient client;

  Future<void> _createWorkout(BuildContext context) async {
    final created = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => WorkoutBuilderScreen(client: client)),
    );
    if (created == true && context.mounted) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Тренировка назначена')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.fitness_center, size: 48),
            const SizedBox(height: 12),
            Text('Тренировки', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            const Text(
              'Назначьте новую тренировку — она появится у клиента.',
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: () => _createWorkout(context),
              icon: const Icon(Icons.add),
              label: const Text('Создать тренировку'),
            ),
          ],
        ),
      ),
    );
  }
}

class _ClientSummary extends StatelessWidget {
  const _ClientSummary({required this.client});

  final TrainerClient client;

  @override
  Widget build(BuildContext context) {
    final details = <String>[
      client.phone,
      if (client.age != null) '${client.age} лет',
      if (client.height != null) '${formatNumber(client.height!)} см',
      if (client.goal != null && client.goal!.isNotEmpty) client.goal!,
    ];

    return Card(
      margin: const EdgeInsets.all(12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            CircleAvatar(radius: 28, child: Text(client.initials)),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    client.name,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 4),
                  Text(details.join(' · ')),
                  const SizedBox(height: 4),
                  Text(client.weightLabel),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PlaceholderTab extends StatelessWidget {
  const _PlaceholderTab({
    required this.icon,
    required this.title,
    required this.description,
  });

  final IconData icon;
  final String title;
  final String description;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 48),
            const SizedBox(height: 12),
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(description, textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}

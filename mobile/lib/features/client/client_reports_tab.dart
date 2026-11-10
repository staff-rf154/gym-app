import 'package:flutter/material.dart';

import '../progress/progress_tab.dart';

class ClientReportsTab extends StatelessWidget {
  const ClientReportsTab({super.key});

  @override
  Widget build(BuildContext context) {
    return const DefaultTabController(
      length: 2,
      child: Column(
        children: [
          TabBar(
            tabs: [
              Tab(text: 'Вес'),
              Tab(text: 'Упражнения'),
            ],
          ),
          Expanded(
            child: TabBarView(children: [_WeightTab(), _ExercisesTab()]),
          ),
        ],
      ),
    );
  }
}

class _WeightTab extends StatelessWidget {
  const _WeightTab();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(12),
      children: const [WeightChartSection(clientId: '')],
    );
  }
}

class _ExercisesTab extends StatelessWidget {
  const _ExercisesTab();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(12),
      children: const [ExerciseSummarySection(clientId: '')],
    );
  }
}

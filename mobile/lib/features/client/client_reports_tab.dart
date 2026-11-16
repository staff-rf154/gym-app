import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/auth_controller.dart';
import '../progress/pdf_export_button.dart';
import '../progress/progress_tab.dart';

class ClientReportsTab extends ConsumerWidget {
  const ClientReportsTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final userId = ref.watch(authControllerProvider).value?.userId ?? '';

    return DefaultTabController(
      length: 2,
      child: Column(
        children: [
          const TabBar(
            tabs: [
              Tab(text: 'Вес'),
              Tab(text: 'Упражнения'),
            ],
          ),
          Expanded(
            child: TabBarView(
              children: [
                _WeightTab(clientId: userId),
                _ExercisesTab(clientId: userId),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _WeightTab extends StatelessWidget {
  const _WeightTab({required this.clientId});

  final String clientId;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(12),
      children: [
        Align(
          alignment: Alignment.centerLeft,
          child: PdfExportButton(
            clientId: '',
            kind: 'weight',
            label: 'Экспорт PDF',
          ),
        ),
        WeightChartSection(clientId: clientId),
      ],
    );
  }
}

class _ExercisesTab extends StatelessWidget {
  const _ExercisesTab({required this.clientId});

  final String clientId;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(12),
      children: [
        Align(
          alignment: Alignment.centerLeft,
          child: PdfExportButton(
            clientId: '',
            kind: 'exercises',
            label: 'Экспорт PDF',
          ),
        ),
        ExerciseSummarySection(clientId: clientId),
      ],
    );
  }
}

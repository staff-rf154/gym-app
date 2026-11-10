import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_error.dart';
import '../workouts/workout_models.dart';
import '../workouts/workouts_providers.dart';
import 'template_editor_screen.dart';

class TemplatesScreen extends ConsumerWidget {
  const TemplatesScreen({super.key});

  Future<void> _openEditor(
    BuildContext context,
    WidgetRef ref, [
    WorkoutTemplate? template,
  ]) async {
    final saved = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => TemplateEditorScreen(template: template),
      ),
    );
    if (saved == true) {
      ref.invalidate(templatesProvider);
    }
  }

  Future<void> _delete(
    BuildContext context,
    WidgetRef ref,
    WorkoutTemplate template,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Удалить шаблон?'),
        content: Text(
          '«${template.name}» будет удалён без возможности отмены.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Отмена'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Удалить'),
          ),
        ],
      ),
    );
    if (confirmed != true) {
      return;
    }

    try {
      await ref.read(workoutsApiProvider).deleteTemplate(template.id);
      ref.invalidate(templatesProvider);
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Шаблон удалён')));
      }
    } catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(apiErrorMessage(error))));
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final templates = ref.watch(templatesProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Шаблоны тренировок')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openEditor(context, ref),
        icon: const Icon(Icons.add),
        label: const Text('Новый шаблон'),
      ),
      body: switch (templates) {
        AsyncData(:final value) => _TemplatesList(
          templates: value,
          onRefresh: () async => ref.invalidate(templatesProvider),
          onEdit: (template) => _openEditor(context, ref, template),
          onDelete: (template) => _delete(context, ref, template),
        ),
        AsyncError(:final error) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.cloud_off, size: 48),
                const SizedBox(height: 16),
                Text(apiErrorMessage(error), textAlign: TextAlign.center),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () => ref.invalidate(templatesProvider),
                  child: const Text('Повторить'),
                ),
              ],
            ),
          ),
        ),
        _ => const Center(child: CircularProgressIndicator()),
      },
    );
  }
}

class _TemplatesList extends StatelessWidget {
  const _TemplatesList({
    required this.templates,
    required this.onRefresh,
    required this.onEdit,
    required this.onDelete,
  });

  final List<WorkoutTemplate> templates;
  final Future<void> Function() onRefresh;
  final ValueChanged<WorkoutTemplate> onEdit;
  final ValueChanged<WorkoutTemplate> onDelete;

  @override
  Widget build(BuildContext context) {
    if (templates.isEmpty) {
      return RefreshIndicator(
        onRefresh: onRefresh,
        child: ListView(
          children: const [
            SizedBox(height: 160),
            Center(child: Text('Пока нет шаблонов')),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView.separated(
        padding: const EdgeInsets.only(bottom: 88),
        itemCount: templates.length,
        separatorBuilder: (_, _) => const Divider(height: 1),
        itemBuilder: (context, index) {
          final template = templates[index];
          return ListTile(
            leading: const CircleAvatar(child: Icon(Icons.list_alt)),
            title: Text(template.name),
            subtitle: Text(
              [
                'Упражнений: ${template.items.length}',
                if (template.description != null &&
                    template.description!.isNotEmpty)
                  template.description!,
              ].join(' · '),
            ),
            trailing: IconButton(
              onPressed: () => onDelete(template),
              icon: const Icon(Icons.delete_outline),
              tooltip: 'Удалить',
            ),
            onTap: () => onEdit(template),
          );
        },
      ),
    );
  }
}

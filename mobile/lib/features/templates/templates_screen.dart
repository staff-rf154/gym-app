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

  Future<void> _showSharedInfo(
    BuildContext context,
    WorkoutTemplate template,
  ) async {
    await showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(template.name),
        content: const Text(
          'Общий шаблон создан администратором или ресепшеном. '
          'Его можно применить при составлении тренировки, '
          'но нельзя редактировать или удалять.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('Понятно'),
          ),
        ],
      ),
    );
  }

  Future<void> _delete(
    BuildContext context,
    WidgetRef ref,
    WorkoutTemplate template,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Архивировать шаблон?'),
        content: Text(
          '«${template.name}» исчезнет из списка. '
          'История тренировок сохранится.',
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
            .showSnackBar(const SnackBar(content: Text('Шаблон архивирован')));
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
          onEdit: (template) => template.isPersonal
              ? _openEditor(context, ref, template)
              : _showSharedInfo(context, template),
          onDelete: (template) => template.isPersonal
              ? _delete(context, ref, template)
              : _showSharedInfo(context, template),
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
                template.scopeLabel,
                'Упражнений: ${template.items.length}',
                if (template.description != null &&
                    template.description!.isNotEmpty)
                  template.description!,
              ].join(' · '),
            ),
            trailing: template.isPersonal
                ? IconButton(
                    onPressed: () => onDelete(template),
                    icon: const Icon(Icons.delete_outline),
                    tooltip: 'Архивировать',
                  )
                : const Icon(Icons.lock_outline),
            onTap: () => onEdit(template),
          );
        },
      ),
    );
  }
}

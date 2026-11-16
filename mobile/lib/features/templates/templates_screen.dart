import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_error.dart';
import '../../core/widgets/empty_state.dart';
import '../workouts/workout_models.dart';
import '../workouts/workouts_providers.dart';
import 'template_editor_screen.dart';

class TemplatesScreen extends ConsumerStatefulWidget {
  const TemplatesScreen({super.key});

  @override
  ConsumerState<TemplatesScreen> createState() => _TemplatesScreenState();
}

class _TemplatesScreenState extends ConsumerState<TemplatesScreen> {
  final _search = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

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
          'Общий шаблон создан администратором. '
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
  Widget build(BuildContext context) {
    final templates = ref.watch(templatesProvider);
    final all = templates.asData?.value ?? const <WorkoutTemplate>[];
    final personalCount = all.where((template) => template.isPersonal).length;
    final canCreate = personalCount < 10;

    return Scaffold(
      appBar: AppBar(title: Text('Шаблоны · $personalCount/10')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: canCreate ? () => _openEditor(context, ref) : null,
        icon: const Icon(Icons.add),
        label: const Text('Новый шаблон'),
      ),
      body: switch (templates) {
        AsyncData(:final value) => Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 4),
              child: TextField(
                controller: _search,
                onChanged: (value) => setState(() => _query = value.trim()),
                decoration: const InputDecoration(
                  hintText: 'Поиск по названию',
                  prefixIcon: Icon(Icons.search),
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
              ),
            ),
            if (personalCount >= 10)
              const Padding(
                padding: EdgeInsets.fromLTRB(16, 4, 16, 4),
                child: Text(
                  'Достигнут лимит 10 личных шаблонов. '
                  'Удалите шаблон в архив, чтобы создать новый.',
                ),
              ),
            Expanded(
              child: _TemplatesList(
                templates: value
                    .where(
                      (template) => template.name.toLowerCase().contains(
                        _query.toLowerCase(),
                      ),
                    )
                    .toList(),
                onRefresh: () async => ref.invalidate(templatesProvider),
                onEdit: (template) => template.isPersonal
                    ? _openEditor(context, ref, template)
                    : _showSharedInfo(context, template),
                onDelete: (template) => template.isPersonal
                    ? _delete(context, ref, template)
                    : _showSharedInfo(context, template),
              ),
            ),
          ],
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
          children: const [EmptyState(message: 'здесь пока пусто')],
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

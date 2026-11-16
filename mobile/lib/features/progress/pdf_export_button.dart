import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';

import '../../core/api/api_error.dart';
import 'reports_providers.dart';

class PdfExportButton extends ConsumerWidget {
  const PdfExportButton({
    super.key,
    required this.clientId,
    required this.kind,
    required this.label,
  });

  static const _periods = [
    ('week', 'Неделя'),
    ('month', 'Месяц'),
    ('3months', '3 месяца'),
    ('year', 'Год'),
    ('custom', 'Свой период'),
  ];

  final String clientId;
  final String kind;
  final String label;

  Future<void> _export(
    BuildContext context,
    WidgetRef ref,
    String period,
  ) async {
    DateTimeRange? range;
    if (period == 'custom') {
      range = await showDateRangePicker(
        context: context,
        firstDate: DateTime(2020),
        lastDate: DateTime.now(),
      );
      if (range == null || !context.mounted) {
        return;
      }
    }

    try {
      final bytes = await ref
          .read(reportsApiProvider)
          .downloadPdf(
            kind: kind,
            clientId: clientId,
            period: period,
            from: range?.start,
            to: range?.end,
          );
      final dir = await getTemporaryDirectory();
      final file = File(
        '${dir.path}/report_${kind}_${DateTime.now().millisecondsSinceEpoch}.pdf',
      );
      await file.writeAsBytes(bytes, flush: true);
      await OpenFilex.open(file.path);
    } catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(apiErrorMessage(error))));
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        OutlinedButton.icon(
          onPressed: () => _export(context, ref, 'week'),
          icon: const Icon(Icons.picture_as_pdf_outlined),
          label: Text(label),
        ),
        PopupMenuButton<String>(
          tooltip: 'Другой период',
          onSelected: (period) => _export(context, ref, period),
          itemBuilder: (_) => [
            for (final entry in _periods)
              PopupMenuItem(value: entry.$1, child: Text(entry.$2)),
          ],
          icon: const Icon(Icons.arrow_drop_down),
        ),
      ],
    );
  }
}

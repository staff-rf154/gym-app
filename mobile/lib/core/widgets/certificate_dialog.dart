import 'package:flutter/material.dart';

Future<bool> showCertificateDialog(
  BuildContext context, {
  required String host,
  required String details,
}) async {
  final accepted = await showDialog<bool>(
    context: context,
    barrierDismissible: false,
    builder: (context) => AlertDialog(
      title: const Text('Невалидный сертификат'),
      content: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Не удалось проверить TLS-сертификат сервера $host. '
              'Соединение может быть перехвачено.',
            ),
            if (details.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(details, style: Theme.of(context).textTheme.bodySmall),
            ],
            const SizedBox(height: 12),
            const Text('Принять сертификат и продолжить?'),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(false),
          child: const Text('Отмена'),
        ),
        FilledButton(
          onPressed: () => Navigator.of(context).pop(true),
          child: const Text('Принять'),
        ),
      ],
    ),
  );

  return accepted ?? false;
}

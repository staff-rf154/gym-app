import 'package:flutter/material.dart';

import '../api/dio_client.dart';

Future<bool> showServerUrlDialog(BuildContext context, ApiClient client) async {
  final controller = TextEditingController(text: client.baseUrl);
  final value = await showDialog<String>(
    context: context,
    builder: (context) => AlertDialog(
      title: const Text('Адрес сервера'),
      content: TextField(
        controller: controller,
        autofocus: true,
        keyboardType: TextInputType.url,
        decoration: const InputDecoration(
          hintText: 'https://gym.example.com',
          helperText: 'Можно указать домен или полный адрес с /api/v1',
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Отмена'),
        ),
        FilledButton(
          onPressed: () => Navigator.of(context).pop(controller.text),
          child: const Text('Сохранить'),
        ),
      ],
    ),
  );
  controller.dispose();
  if (value == null) {
    return false;
  }
  await client.setBaseUrl(value);
  return true;
}

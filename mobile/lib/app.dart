import 'package:flutter/material.dart';

import 'core/api/dio_client.dart';

class GymTrainerApp extends StatelessWidget {
  const GymTrainerApp({super.key, required this.apiClient});

  final ApiClient apiClient;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Gym Trainer',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.teal),
        useMaterial3: true,
      ),
      home: HomeScreen(apiClient: apiClient),
    );
  }
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, required this.apiClient});

  final ApiClient apiClient;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  Future<void> _editServerUrl() async {
    final controller = TextEditingController(text: widget.apiClient.baseUrl);
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
    if (value == null) {
      return;
    }
    await widget.apiClient.setBaseUrl(value);
    if (!mounted) {
      return;
    }
    setState(() {});
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          widget.apiClient.isConfigured
              ? 'Сервер: ${widget.apiClient.baseUrl}'
              : 'Адрес сервера не задан',
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Gym Trainer'),
        actions: [
          IconButton(
            onPressed: _editServerUrl,
            icon: const Icon(Icons.settings),
            tooltip: 'Адрес сервера',
          ),
        ],
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text(
                'Gym Trainer',
                style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              Text(
                widget.apiClient.isConfigured
                    ? widget.apiClient.baseUrl
                    : 'Укажите адрес сервера в настройках',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 24),
              OutlinedButton.icon(
                onPressed: _editServerUrl,
                icon: const Icon(Icons.dns),
                label: const Text('Настроить сервер'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

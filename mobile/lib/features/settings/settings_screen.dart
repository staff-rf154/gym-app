import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../core/widgets/server_url_dialog.dart';
import '../auth/auth_controller.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  Future<void> _editServerUrl() async {
    final changed = await showServerUrlDialog(
      context,
      ref.read(apiClientProvider),
    );
    if (changed && mounted) {
      setState(() {});
    }
  }

  Future<void> _logout() async {
    Navigator.of(context).popUntil((route) => route.isFirst);
    await ref.read(authControllerProvider.notifier).logout();
  }

  @override
  Widget build(BuildContext context) {
    final client = ref.watch(apiClientProvider);
    final user = ref.watch(authControllerProvider).value;

    return Scaffold(
      appBar: AppBar(title: const Text('Настройки')),
      body: ListView(
        children: [
          if (user != null)
            ListTile(
              leading: const Icon(Icons.person),
              title: Text(user.name),
              subtitle: Text('${user.phone} · ${user.role}'),
            ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.dns),
            title: const Text('Адрес сервера'),
            subtitle: Text(client.isConfigured ? client.baseUrl : 'Не задан'),
            onTap: _editServerUrl,
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.logout, color: Colors.red),
            title: const Text('Выйти', style: TextStyle(color: Colors.red)),
            onTap: _logout,
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_error.dart';
import '../../core/providers.dart';
import '../../core/widgets/server_url_dialog.dart';
import '../auth/auth_controller.dart';

const _timezones = <String>[
  'UTC',
  'Europe/Kaliningrad',
  'Europe/Moscow',
  'Europe/Samara',
  'Asia/Yekaterinburg',
  'Asia/Omsk',
  'Asia/Novosibirsk',
  'Asia/Krasnoyarsk',
  'Asia/Irkutsk',
  'Asia/Yakutsk',
  'Asia/Vladivostok',
  'Asia/Magadan',
  'Asia/Kamchatka',
  'Asia/Almaty',
  'Asia/Bishkek',
  'Asia/Tashkent',
  'Asia/Tbilisi',
  'Asia/Yerevan',
  'Asia/Baku',
  'Asia/Dubai',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Europe/Berlin',
  'Europe/Paris',
  'Europe/London',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
];

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key, this.embedded = false});

  final bool embedded;

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  bool _savingTimezone = false;

  Future<void> _editServerUrl() async {
    final changed = await showServerUrlDialog(
      context,
      ref.read(apiClientProvider),
    );
    if (changed && mounted) {
      setState(() {});
    }
  }

  Future<void> _editTimezone(String current) async {
    final selected = await _pickTimezone(current);
    if (selected == null || selected == current) {
      return;
    }

    setState(() => _savingTimezone = true);
    try {
      await ref.read(authApiProvider).updateTimezone(selected);
      ref.invalidate(authControllerProvider);
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Часовой пояс сохранён')));
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(apiErrorMessage(error))));
    } finally {
      if (mounted) {
        setState(() => _savingTimezone = false);
      }
    }
  }

  Future<String?> _pickTimezone(String current) {
    final zones = {..._timezones, if (current.isNotEmpty) current}.toList()
      ..sort();

    return showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        var query = '';
        return StatefulBuilder(
          builder: (context, setSheetState) {
            final filtered = zones
                .where(
                  (zone) => zone.toLowerCase().contains(query.toLowerCase()),
                )
                .toList();

            return SafeArea(
              child: SizedBox(
                height: MediaQuery.sizeOf(context).height * 0.7,
                child: Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                      child: TextField(
                        autofocus: true,
                        decoration: const InputDecoration(
                          hintText: 'Поиск часового пояса',
                          prefixIcon: Icon(Icons.search),
                          border: OutlineInputBorder(),
                          isDense: true,
                        ),
                        onChanged: (value) =>
                            setSheetState(() => query = value.trim()),
                      ),
                    ),
                    Expanded(
                      child: filtered.isEmpty
                          ? const Center(child: Text('Ничего не найдено'))
                          : ListView.builder(
                              itemCount: filtered.length,
                              itemBuilder: (context, index) {
                                final zone = filtered[index];
                                return ListTile(
                                  title: Text(zone),
                                  trailing: zone == current
                                      ? const Icon(Icons.check)
                                      : null,
                                  onTap: () => Navigator.of(context).pop(zone),
                                );
                              },
                            ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _logout() async {
    Navigator.of(context).popUntil((route) => route.isFirst);
    await ref.read(authControllerProvider.notifier).logout();
  }

  @override
  Widget build(BuildContext context) {
    final body = _buildBody(context);
    if (widget.embedded) {
      return body;
    }
    return Scaffold(
      appBar: AppBar(title: const Text('Настройки')),
      body: body,
    );
  }

  Widget _buildBody(BuildContext context) {
    final client = ref.watch(apiClientProvider);
    final user = ref.watch(authControllerProvider).value;

    return ListView(
      children: [
        if (user != null)
          ListTile(
            leading: const Icon(Icons.person),
            title: Text(user.name),
            subtitle: Text('${user.phone} · ${user.role}'),
          ),
        const Divider(),
        ListTile(
          leading: const Icon(Icons.schedule),
          title: const Text('Часовой пояс'),
          subtitle: Text(
            user?.timezone.isNotEmpty == true ? user!.timezone : 'Не задан',
          ),
          trailing: _savingTimezone
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Icon(Icons.chevron_right),
          onTap: user == null || _savingTimezone
              ? null
              : () => _editTimezone(user.timezone),
        ),
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
    );
  }
}

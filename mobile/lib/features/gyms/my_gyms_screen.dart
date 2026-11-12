import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_error.dart';
import '../../core/providers.dart';
import '../../core/utils/format.dart';
import '../auth/auth_controller.dart';

class _GymLink {
  const _GymLink({
    required this.id,
    required this.gymId,
    required this.gymName,
    required this.gymAddress,
  });

  factory _GymLink.fromJson(Map<String, dynamic> json) {
    return _GymLink(
      id: json['id'] as String,
      gymId: json['gymId'] as String,
      gymName: json['gymName'] as String,
      gymAddress: (json['gymAddress'] as String?) ?? '',
    );
  }

  final String id;
  final String gymId;
  final String gymName;
  final String gymAddress;
}

class _ClientTrainerLink {
  const _ClientTrainerLink({
    required this.id,
    required this.trainerId,
    required this.trainerName,
    required this.gymId,
    required this.gymName,
    required this.assignedBy,
  });

  factory _ClientTrainerLink.fromJson(Map<String, dynamic> json) {
    return _ClientTrainerLink(
      id: json['id'] as String,
      trainerId: json['trainerId'] as String,
      trainerName: json['trainerName'] as String,
      gymId: json['gymId'] as String,
      gymName: json['gymName'] as String,
      assignedBy: (json['assignedBy'] as String?) ?? '',
    );
  }

  final String id;
  final String trainerId;
  final String trainerName;
  final String gymId;
  final String gymName;
  final String assignedBy;
}

class _GymTrainer {
  const _GymTrainer({
    required this.id,
    required this.name,
    required this.isLinked,
  });

  factory _GymTrainer.fromJson(Map<String, dynamic> json) {
    return _GymTrainer(
      id: json['id'] as String,
      name: json['name'] as String,
      isLinked: (json['isLinked'] as bool?) ?? false,
    );
  }

  final String id;
  final String name;
  final bool isLinked;
}

class MyGymsScreen extends ConsumerStatefulWidget {
  const MyGymsScreen({super.key});

  @override
  ConsumerState<MyGymsScreen> createState() => _MyGymsScreenState();
}

class _MyGymsScreenState extends ConsumerState<MyGymsScreen> {
  bool _loading = true;
  String? _error;
  List<_GymLink> _gyms = const [];
  List<_ClientTrainerLink> _trainerLinks = const [];

  bool get _isClient =>
      ref.read(authControllerProvider).value?.role == 'CLIENT';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final dio = ref.read(apiClientProvider).dio;
      final role = ref.read(authControllerProvider).value?.role;
      final gymsResponse = await dio.get<List<dynamic>>(
        role == 'CLIENT' ? '/client/gyms' : '/trainer/gyms',
      );
      final gyms = (gymsResponse.data ?? const [])
          .cast<Map<String, dynamic>>()
          .map(_GymLink.fromJson)
          .toList();

      var links = <_ClientTrainerLink>[];
      if (role == 'CLIENT') {
        final response = await dio.get<List<dynamic>>('/client/trainers');
        links = (response.data ?? const [])
            .cast<Map<String, dynamic>>()
            .map(_ClientTrainerLink.fromJson)
            .toList();
      }

      if (!mounted) {
        return;
      }
      setState(() {
        _gyms = gyms;
        _trainerLinks = links;
      });
    } catch (error) {
      if (mounted) {
        setState(() => _error = apiErrorMessage(error));
      }
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _pickTrainer(_GymLink gym) async {
    try {
      final dio = ref.read(apiClientProvider).dio;
      final response = await dio.get<List<dynamic>>(
        '/client/gyms/${gym.gymId}/trainers',
      );
      final trainers = (response.data ?? const [])
          .cast<Map<String, dynamic>>()
          .map(_GymTrainer.fromJson)
          .toList();

      if (!mounted) {
        return;
      }

      final selected = await showModalBottomSheet<_GymTrainer>(
        context: context,
        builder: (context) {
          return SafeArea(
            child: ListView(
              shrinkWrap: true,
              children: [
                ListTile(
                  title: Text(
                    gym.gymName,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  subtitle: const Text('Выберите тренера'),
                ),
                if (trainers.isEmpty)
                  const ListTile(title: Text('В зале пока нет тренеров')),
                for (final trainer in trainers)
                  ListTile(
                    title: Text(trainer.name),
                    trailing: trainer.isLinked
                        ? const Icon(Icons.check, color: Colors.green)
                        : null,
                    enabled: !trainer.isLinked,
                    onTap: () => Navigator.of(context).pop(trainer),
                  ),
              ],
            ),
          );
        },
      );

      if (selected == null || selected.isLinked) {
        return;
      }

      await dio.post<Map<String, dynamic>>(
        '/client/gyms/${gym.gymId}/trainers/${selected.id}/link',
      );
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Тренер ${selected.name} назначен')),
      );
      await _load();
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(apiErrorMessage(error))),
      );
    }
  }

  Future<void> _unlink(_ClientTrainerLink link) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Отвязать тренера?'),
        content: Text(link.trainerName),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Отмена'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Отвязать'),
          ),
        ],
      ),
    );

    if (confirmed != true) {
      return;
    }

    try {
      await ref
          .read(apiClientProvider)
          .dio
          .delete<void>('/client/trainers/${link.id}');
      await _load();
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(apiErrorMessage(error))),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Мои залы')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
            ? ListView(
                children: [
                  ListTile(
                    leading: const Icon(Icons.error_outline),
                    title: Text(_error!),
                    trailing: TextButton(
                      onPressed: _load,
                      child: const Text('Повторить'),
                    ),
                  ),
                ],
              )
            : ListView(
                children: [
                  if (_gyms.isEmpty)
                    const ListTile(title: Text('Залы не назначены')),
                  for (final gym in _gyms) ...[
                    ListTile(
                      leading: const Icon(Icons.fitness_center),
                      title: Text(gym.gymName),
                      subtitle: Text(
                        gym.gymAddress.isEmpty ? gym.gymId : gym.gymAddress,
                      ),
                      trailing: _isClient
                          ? IconButton(
                              tooltip: 'Выбрать тренера',
                              icon: const Icon(Icons.person_add),
                              onPressed: () => _pickTrainer(gym),
                            )
                          : null,
                    ),
                    if (_isClient)
                      for (final link in _trainerLinks
                          .where((link) => link.gymId == gym.gymId))
                        ListTile(
                          contentPadding: const EdgeInsets.only(left: 56),
                          leading: const Icon(Icons.person),
                          title: Text(link.trainerName),
                          subtitle: Text(
                            'Назначил: ${assignedByLabel(link.assignedBy)}',
                          ),
                          trailing: TextButton(
                            onPressed: () => _unlink(link),
                            child: const Text('Отвязать'),
                          ),
                        ),
                    const Divider(),
                  ],
                ],
              ),
      ),
    );
  }
}

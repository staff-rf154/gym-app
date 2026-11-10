import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import 'clients_api.dart';
import 'trainer_client.dart';

final clientsApiProvider = Provider<ClientsApi>(
  (ref) => ClientsApi(ref.watch(apiClientProvider)),
);

final myClientsProvider = FutureProvider<List<TrainerClient>>(
  (ref) => ref.watch(clientsApiProvider).fetchMyClients(),
);

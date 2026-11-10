import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api/dio_client.dart';
import 'storage/secure_storage.dart';

final secureStorageProvider = Provider<SecureStorage>((ref) => SecureStorage());

final apiClientProvider = Provider<ApiClient>(
  (ref) => ApiClient(storage: ref.watch(secureStorageProvider)),
);

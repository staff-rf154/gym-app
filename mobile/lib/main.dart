import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';
import 'core/api/dio_client.dart';
import 'core/providers.dart';
import 'core/storage/secure_storage.dart';
import 'core/ui/app_navigator.dart';
import 'core/utils/timezone.dart';
import 'core/widgets/certificate_dialog.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  initTimezones();
  final apiClient = ApiClient(storage: SecureStorage());
  apiClient.certificatePrompt = (host, details) async {
    final context = appNavigatorKey.currentContext;
    if (context == null) {
      return false;
    }
    return showCertificateDialog(context, host: host, details: details);
  };
  await apiClient.init();
  runApp(
    ProviderScope(
      overrides: [apiClientProvider.overrideWithValue(apiClient)],
      child: const GymTrainerApp(),
    ),
  );
}

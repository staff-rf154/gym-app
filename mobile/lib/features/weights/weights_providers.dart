import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import 'weight_measurement.dart';
import 'weights_api.dart';

final weightsApiProvider = Provider<WeightsApi>(
  (ref) => WeightsApi(ref.watch(apiClientProvider)),
);

final weightMeasurementsProvider =
    FutureProvider.family<List<WeightMeasurement>, String>(
      (ref, clientId) => ref.watch(weightsApiProvider).fetch(clientId),
    );

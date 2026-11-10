import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import 'nutrition_api.dart';
import 'nutrition_models.dart';

final nutritionApiProvider = Provider<NutritionApi>(
  (ref) => NutritionApi(ref.watch(apiClientProvider)),
);

final clientNutritionProvider =
    FutureProvider.family<List<NutritionRecommendation>, String>(
      (ref, clientId) =>
          ref.watch(nutritionApiProvider).fetchForClient(clientId),
    );

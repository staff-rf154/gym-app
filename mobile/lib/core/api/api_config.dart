const String defaultApiBaseUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'https://demogym.staff-rf.ru:3000',
);

const int currentApiConfigVersion = 3;

String resolveApiBaseUrl({
  String? savedBaseUrl,
  String? savedVersion,
}) {
  final isCurrent = savedVersion == '$currentApiConfigVersion';
  if (isCurrent && savedBaseUrl != null && savedBaseUrl.trim().isNotEmpty) {
    return savedBaseUrl;
  }
  return defaultApiBaseUrl;
}

String normalizeApiBaseUrl(String raw) {
  var value = raw.trim();
  if (value.isEmpty) {
    return value;
  }
  if (!value.startsWith('http://') && !value.startsWith('https://')) {
    value = 'https://$value';
  }
  while (value.endsWith('/')) {
    value = value.substring(0, value.length - 1);
  }
  if (!value.endsWith('/api/v1')) {
    value = '$value/api/v1';
  }
  return value;
}

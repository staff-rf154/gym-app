const String defaultApiBaseUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: '',
);

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

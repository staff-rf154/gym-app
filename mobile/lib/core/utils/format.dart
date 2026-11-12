String formatNumber(double value) {
  if (value == value.roundToDouble()) {
    return value.toStringAsFixed(0);
  }
  return value.toStringAsFixed(1);
}

String formatDate(Object value) {
  final parsed = value is DateTime
      ? value
      : DateTime.tryParse(value.toString());
  if (parsed == null) {
    return '—';
  }
  final day = parsed.day.toString().padLeft(2, '0');
  final month = parsed.month.toString().padLeft(2, '0');
  return '$day.$month.${parsed.year}';
}

String assignedByLabel(String value) {
  return switch (value) {
    'ADMIN' => 'администратор',
    'RECEPTION' => 'ресепшен',
    'CLIENT' => 'клиент',
    'TRAINER' => 'тренер',
    _ => value,
  };
}

import 'package:timezone/data/latest_all.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

void initTimezones() {
  tzdata.initializeTimeZones();
}

tz.Location _location(String name) {
  if (name.isEmpty) {
    return tz.UTC;
  }
  try {
    return tz.getLocation(name);
  } catch (_) {
    return tz.UTC;
  }
}

DateTime nowInTimezone(String name) => tz.TZDateTime.now(_location(name));

String dateKey(DateTime value) {
  final month = value.month.toString().padLeft(2, '0');
  final day = value.day.toString().padLeft(2, '0');
  return '${value.year}-$month-$day';
}

String todayKey(String timezone) => dateKey(nowInTimezone(timezone));

String formatDateTimeInTimezone(Object? value, String timezone) {
  final parsed = value is DateTime
      ? value
      : DateTime.tryParse(value?.toString() ?? '');
  if (parsed == null) {
    return '—';
  }
  final local = tz.TZDateTime.from(parsed.toUtc(), _location(timezone));
  final day = local.day.toString().padLeft(2, '0');
  final month = local.month.toString().padLeft(2, '0');
  final hour = local.hour.toString().padLeft(2, '0');
  final minute = local.minute.toString().padLeft(2, '0');
  return '$day.$month.${local.year} $hour:$minute';
}

String formatTimeInTimezone(Object? value, String timezone) {
  final parsed = value is DateTime
      ? value
      : DateTime.tryParse(value?.toString() ?? '');
  if (parsed == null) {
    return '—';
  }
  final local = tz.TZDateTime.from(parsed.toUtc(), _location(timezone));
  final hour = local.hour.toString().padLeft(2, '0');
  final minute = local.minute.toString().padLeft(2, '0');
  return '$hour:$minute';
}

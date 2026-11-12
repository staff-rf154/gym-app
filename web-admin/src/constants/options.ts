export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'MALE', label: 'Мужской' },
  { value: 'FEMALE', label: 'Женский' },
  { value: 'OTHER', label: 'Другой' },
];

export const GENDER_LABELS: Record<Gender, string> = {
  MALE: 'Мужской',
  FEMALE: 'Женский',
  OTHER: 'Другой',
};

export const TIMEZONES: { value: string; label: string }[] = [
  'UTC',
  'Europe/Kaliningrad',
  'Europe/Moscow',
  'Europe/Samara',
  'Europe/Berlin',
  'Europe/Paris',
  'Europe/London',
  'Asia/Yekaterinburg',
  'Asia/Omsk',
  'Asia/Novosibirsk',
  'Asia/Krasnoyarsk',
  'Asia/Irkutsk',
  'Asia/Yakutsk',
  'Asia/Vladivostok',
  'Asia/Magadan',
  'Asia/Kamchatka',
  'Asia/Barnaul',
  'Asia/Tomsk',
  'Asia/Kemerovo',
  'Asia/Almaty',
  'Asia/Bishkek',
  'Asia/Tashkent',
  'Asia/Tbilisi',
  'Asia/Yerevan',
  'Asia/Baku',
  'Asia/Dubai',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
].map((value) => ({ value, label: value }));

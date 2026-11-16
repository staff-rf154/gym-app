import dayjs from 'dayjs';

export const formatDate = (value: string | null): string =>
  value ? dayjs(value).format('DD.MM.YYYY') : '—';

export const formatDateTime = (value: string): string =>
  dayjs(value).format('DD.MM.YYYY HH:mm');

export const toDateOnly = (value: dayjs.Dayjs | null | undefined): string | null =>
  value ? value.format('YYYY-MM-DD') : null;

export const optionalText = (value: string | undefined): string | null =>
  value?.trim() ? value.trim() : null;

export const currentWeekRange = (): [dayjs.Dayjs, dayjs.Dayjs] => {
  const today = dayjs();
  const monday = today
    .subtract((today.day() + 6) % 7, 'day')
    .startOf('day');
  return [monday, monday.add(6, 'day')];
};

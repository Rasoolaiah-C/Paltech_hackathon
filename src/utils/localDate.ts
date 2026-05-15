export const toLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseLocalDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const addLocalDays = (dateKey: string, days: number) => {
  const date = parseLocalDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return toLocalDateKey(date);
};

export const getLastLocalDateKeys = (days: number, endDate = toLocalDateKey()) =>
  Array.from({ length: days }, (_, index) => addLocalDays(endDate, -index));

export const daysBetweenInclusive = (startDate: string, endDate: string) => {
  const dates: string[] = [];
  let cursor = startDate;

  while (cursor <= endDate) {
    dates.push(cursor);
    cursor = addLocalDays(cursor, 1);
  }

  return dates;
};

export const isOlderThanDays = (dateKey: string, days: number, todayKey = toLocalDateKey()) =>
  dateKey < addLocalDays(todayKey, -days);

export const getWeekStart = (dateKey: string) => {
  const date = parseLocalDateKey(dateKey);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + mondayOffset);
  return toLocalDateKey(date);
};

export function monthlyDayFromDate(value: string): number | null {
  const match = /^\d{4}-\d{2}-(\d{2})$/.exec(value);
  if (!match) return null;
  const day = Number(match[1]);
  return day >= 1 && day <= 31 ? day : null;
}

export function monthlyDateForDay(day: number, today = new Date()): string {
  if (!Number.isInteger(day) || day < 1 || day > 31) return '';
  for (let offset = 0; offset < 12; offset++) {
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + offset + 1, 0);
    if (day <= monthEnd.getDate()) return `${monthEnd.getFullYear()}-${String(monthEnd.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  return '';
}

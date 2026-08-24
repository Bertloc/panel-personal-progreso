import { HeatmapDay } from '../models/home-summary.model';
import { ProgressHeatmapDay } from '../models/progress.model';

export interface ProgressMonth {
  label: string;
  slots: Array<ProgressCalendarDay | null>;
}

export type ProgressPeriod = 'week' | 'month' | 'year';
export interface ProgressRange { start: string; end: string; }
export interface ProgressCalendarDay { date: string; progress: ProgressHeatmapDay | null; future: boolean; }

export function progressPeriodRange(period: ProgressPeriod, anchor: string): ProgressRange {
  const date = localDate(anchor);
  if (period === 'week') {
    const mondayOffset = (date.getDay() + 6) % 7;
    const start = addDays(date, -mondayOffset);
    return { start: isoDate(start), end: isoDate(addDays(start, 6)) };
  }
  if (period === 'month') return { start: isoDate(new Date(date.getFullYear(), date.getMonth(), 1)), end: isoDate(new Date(date.getFullYear(), date.getMonth() + 1, 0)) };
  return { start: `${date.getFullYear()}-01-01`, end: `${date.getFullYear()}-12-31` };
}

export function previousProgressRange(period: ProgressPeriod, range: ProgressRange) {
  return progressPeriodRange(period, isoDate(addDays(localDate(range.start), -1)));
}

export function shiftProgressAnchor(period: ProgressPeriod, anchor: string, offset: number) {
  const date = localDate(anchor);
  if (period === 'week') return isoDate(addDays(date, offset * 7));
  if (period === 'month') return isoDate(new Date(date.getFullYear(), date.getMonth() + offset, 1));
  return isoDate(new Date(date.getFullYear() + offset, date.getMonth(), 1));
}

export function progressDaysInRange(days: ProgressHeatmapDay[], range: ProgressRange) {
  return days.filter(({ date }) => date >= range.start && date <= range.end);
}

export function averageProgressLevel(days: ProgressHeatmapDay[]) {
  return days.length ? days.reduce((sum, { value }) => sum + Math.max(0, Math.min(4, value)), 0) / days.length : null;
}

export function progressTrend(current: ProgressHeatmapDay[], previous: ProgressHeatmapDay[]) {
  const currentAverage = averageProgressLevel(current);
  const previousAverage = averageProgressLevel(previous);
  if (current.length < 2 || previous.length < 2 || currentAverage === null || previousAverage === null) return null;
  const difference = Math.round((currentAverage - previousAverage) * 10) / 10;
  return { difference, label: difference > 0 ? 'Mejorando' : difference < 0 ? 'Bajando' : 'Estable' };
}

export function groupProgressDaysByMonth(days: ProgressHeatmapDay[], range: ProgressRange, today: string): ProgressMonth[] {
  const byDate = new Map(days.map((day) => [day.date, day]));
  const groups = new Map<string, ProgressCalendarDay[]>();
  for (let date = localDate(range.start); isoDate(date) <= range.end; date = addDays(date, 1)) {
    const value = isoDate(date);
    const key = value.slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), { date: value, progress: byDate.get(value) ?? null, future: value > today }]);
  }
  return [...groups.entries()].map(([key, calendarDays]) => {
    const first = new Date(`${key}-01T00:00:00`);
    const padding = (first.getDay() + 6) % 7;
    const lastDay = Math.max(...calendarDays.map(({ date }) => Number(date.slice(8, 10))));
    const slots = Array<ProgressCalendarDay | null>(padding + lastDay).fill(null);
    for (const day of calendarDays) slots[padding + Number(day.date.slice(8, 10)) - 1] = day;
    return {
      label: new Intl.DateTimeFormat('es-MX', { month: 'long' }).format(first),
      slots,
    };
  });
}

function localDate(value: string) { return new Date(`${value.slice(0, 10)}T00:00:00`); }
function addDays(date: Date, days: number) { const result = new Date(date); result.setDate(result.getDate() + days); return result; }
function isoDate(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }

type HeatmapSourceDay = {
  id: string;
  date?: string;
  loggedExpense?: boolean;
  withinDailyLimit?: boolean;
  habitCompletionRate?: number;
  completedFinancialHabit?: boolean;
  savedOrPaidDebt?: boolean;
};

export const HEATMAP_FILTER_HINTS = {
  general: 'Combina hábitos, dinero, ahorro y deuda.',
  habits: '0=0%, 1=1-30%, 2=31-60%, 3=61-85%, 4=86-100%',
  money: '0=no registró, 1=se pasó mucho, 2=se pasó poco, 3=dentro, 4=dentro y sobró.',
  savings: '0=no ahorró, 1=mínimo, 2=parcial, 3=esperado, 4=superó.',
  debt: '0=sin avance, 1=revisó, 2=pagó mínimo, 3=abonó extra, 4=pago fuerte.',
} as const;

export function getHeatmapValueFromDay(day: HeatmapSourceDay): HeatmapDay {
  let score = 0;

  if (day.loggedExpense) {
    score += 1;
  }

  if (day.withinDailyLimit) {
    score += 1;
  }

  if ((day.habitCompletionRate ?? 0) >= 60) {
    score += 1;
  }

  if (day.completedFinancialHabit) {
    score += 1;
  }

  if (day.savedOrPaidDebt) {
    score += 1;
  }

  const value = Math.min(4, score) as HeatmapDay['value'];
  const statusMap: Record<HeatmapDay['value'], HeatmapDay['status']> = {
    0: 'empty',
    1: 'low',
    2: 'medium',
    3: 'good',
    4: 'excellent',
  };

  return {
    id: day.id,
    date: day.date,
    score,
    value,
    status: statusMap[value],
  };
}

export function createMockHeatmap(length: number): HeatmapDay[] {
  return Array.from({ length }, (_, index) =>
    getHeatmapValueFromDay({
      id: `day-${index + 1}`,
      date: `2026-${String((index % 12) + 1).padStart(2, '0')}-${String((index % 28) + 1).padStart(2, '0')}`,
      loggedExpense: index % 5 !== 0,
      withinDailyLimit: index % 4 !== 0,
      habitCompletionRate: 20 + ((index * 17) % 81),
      completedFinancialHabit: index % 3 !== 1,
      savedOrPaidDebt: index % 6 === 0 || index % 7 === 0,
    }),
  );
}

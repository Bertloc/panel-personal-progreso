import { HeatmapDay } from '../models/home-summary.model';
import { ProgressHeatmapDay } from '../models/progress.model';

export interface ProgressMonth {
  label: string;
  slots: Array<ProgressHeatmapDay | null>;
}

export function groupProgressDaysByMonth(days: ProgressHeatmapDay[]): ProgressMonth[] {
  const groups = new Map<string, ProgressHeatmapDay[]>();
  for (const day of days) {
    const key = day.date.slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(key)) groups.set(key, [...(groups.get(key) ?? []), day]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, monthDays]) => {
    const first = new Date(`${key}-01T00:00:00`);
    const padding = (first.getDay() + 6) % 7;
    const lastDay = Math.max(...monthDays.map(({ date }) => Number(date.slice(8, 10))));
    const slots = Array<ProgressHeatmapDay | null>(padding + lastDay).fill(null);
    for (const day of monthDays) slots[padding + Number(day.date.slice(8, 10)) - 1] = day;
    return {
      label: new Intl.DateTimeFormat('es-MX', { month: 'long' }).format(first),
      slots,
    };
  });
}

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

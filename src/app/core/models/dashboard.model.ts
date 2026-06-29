import { HeatmapDay, TodayHabit } from './home-summary.model';

export interface DashboardSummary {
  userName?: string;
  date?: string;
  availableToday?: string | number;
  resetHours?: string | number;
  weeklySpent?: string | number;
  weeklyRemaining?: string | number;
  weeklyLimit?: string | number;
  monthlySpent?: string | number;
  monthlyLimit?: string | number;
  saved?: string | number;
  savingsLabel?: string;
  debtLeft?: string | number;
  debtLabel?: string;
  nextDebtDate?: string;
  nextDebtPayment?: string | number;
  debtProgress?: string | number;
  suggestedExtraPayment?: string | number;
  activeDays?: string | number;
  streak?: string | number;
  habits?: TodayHabit[];
  heatmap?: HeatmapDay[];
  [key: string]: unknown;
}

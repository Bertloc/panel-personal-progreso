export interface TodayHabit {
  id: string;
  name: string;
  done: boolean;
}

export interface HeatmapDay {
  id: string;
  date?: string;
  value: 0 | 1 | 2 | 3 | 4;
  score?: number;
  status?: 'empty' | 'low' | 'medium' | 'good' | 'excellent';
}

export interface HomeSummary {
  userName: string;
  date: string;
  availableToday: number;
  resetHours: number;
  weeklySpent: number;
  weeklyRemaining: number;
  weeklyLimit: number;
  monthlySpent: number;
  monthlyLimit: number;
  saved: number;
  savingsLabel: string;
  debtLeft: number;
  debtLabel: string;
  nextDebtDate: string;
  nextDebtPayment: number;
  debtProgress: number;
  suggestedExtraPayment: number;
  activeDays: number;
  streak: number;
  habits: TodayHabit[];
  heatmap: HeatmapDay[];
}

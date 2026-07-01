import { HomeSummary } from '../models/home-summary.model';

export const HOME_FALLBACK: HomeSummary = {
  userName: '', date: '', availableToday: 0, resetHours: 0,
  weeklySpent: 0, weeklyRemaining: 0, weeklyLimit: 0, monthlySpent: 0, monthlyLimit: 0,
  saved: 0, savingsLabel: '', debtLeft: 0, debtLabel: '', nextDebtDate: '',
  nextDebtPayment: 0, debtProgress: 0, suggestedExtraPayment: 0, activeDays: 0, streak: 0,
  habits: [],
  heatmap: Array.from({ length: 84 }, (_, index) => ({ id: `empty-${index + 1}`, value: 0 })),
};

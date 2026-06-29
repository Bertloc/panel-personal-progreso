import { HomeSummary } from '../models/home-summary.model';
import { createMockHeatmap } from '../utils/heatmap.util';

export const HOME_FALLBACK: HomeSummary = {
  userName: 'Humberto', date: 'SÁBADO, 28 JUNIO 2026', availableToday: 126, resetHours: 14,
  weeklySpent: 187, weeklyRemaining: 93, weeklyLimit: 280, monthlySpent: 743, monthlyLimit: 1200,
  saved: 0, savingsLabel: 'meta inicial', debtLeft: 10015, debtLabel: 'banco', nextDebtDate: '15 julio',
  nextDebtPayment: 2372.85, debtProgress: 68, suggestedExtraPayment: 500, activeDays: 168, streak: 14,
  habits: [
    { id: 'breakfast', name: 'Desayunar', done: true },
    { id: 'expense', name: 'Registrar gasto', done: false },
    { id: 'meal-plan', name: 'Comer dentro del plan', done: false },
    { id: 'gym', name: 'Gym', done: false },
  ],
  heatmap: createMockHeatmap(84),
};

import { MoneyView } from '../models/money.model';

export const MONEY_FALLBACK: MoneyView = {
  paycheck: { income: 0, debt: 0, gym: 0, nutritionist: 0, foodWeekly: 0, transportPerDay: 0, transportDays: 0 },
  upcomingPayments: [],
  debtInfo: { name: '', left: 0, nextPayment: 0, date: '', progress: 0, extra: 0, bankPlan: '', aggressivePlan: '' },
  categories: [],
  savingsGoals: [],
  recentExpenses: [],
};

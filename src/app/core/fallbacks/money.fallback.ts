import { DebtInfo, MoneyCategory, MoneyView, Paycheck, PaymentItem, RecentExpense } from '../models/money.model';
import { SavingsGoal } from '../models/savings.model';

export const MONEY_FALLBACK: MoneyView = {
  paycheck: { income: 5000, debt: 2372.85, gym: 450, nutritionist: 490, foodWeekly: 700, transportPerDay: 20, transportDays: 7 } satisfies Paycheck,
  upcomingPayments: [
    { name: 'Deuda bancaria', amount: 2372.85, dueLabel: '15 julio' },
    { name: 'Gym', amount: 450, dueLabel: '19 julio' },
    { name: 'Nutriólogo', amount: 490, dueLabel: 'julio' },
    { name: 'Transporte', amount: 20, dueLabel: 'semanal', suffix: '/día' },
  ] satisfies PaymentItem[],
  debtInfo: { left: 10015, nextPayment: 2372.85, date: '15 julio', progress: 68, extra: 500, bankPlan: 'diciembre', aggressivePlan: 'septiembre' } satisfies DebtInfo,
  categories: [
    { name: 'Comida', used: 380, limit: 700, tone: 'green', status: 'OK' },
    { name: 'Transporte', used: 120, limit: 280, tone: 'blue', status: 'OK' },
    { name: 'Gym', used: 450, limit: 450, tone: 'purple', status: 'Apartado' },
    { name: 'Nutriólogo', used: 0, limit: 490, tone: 'orange', status: 'Pendiente' },
    { name: 'Ocio', used: 230, limit: 250, tone: 'orange', status: 'Cuidado' },
    { name: 'Ahorro', used: 0, limit: 300, tone: 'purple', status: 'En pausa' },
    { name: 'Deuda', used: 0, limit: 2372.85, tone: 'purple', status: 'Próximo' },
    { name: 'Imprevistos', used: 95, limit: 140, tone: 'pink', status: 'OK' },
  ] satisfies MoneyCategory[],
  savingsGoals: [
    { name: 'Colchón inicial', current: 0, target: 1000, tone: 'purple' },
    { name: 'Fondo de emergencia', current: 0, target: 3000, tone: 'green' },
    { name: 'Laptop', current: 0, target: 12000, tone: 'blue' },
  ] satisfies SavingsGoal[],
  recentExpenses: [
    { name: 'Transporte', amount: 20, day: 'Hoy' },
    { name: 'Comida', amount: 95, day: 'Hoy' },
    { name: 'Ocio', amount: 45, day: 'Ayer' },
  ] satisfies RecentExpense[],
};

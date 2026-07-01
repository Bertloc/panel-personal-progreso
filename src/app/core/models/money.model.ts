import { ApiPayload } from './api.model';
import { SavingsGoal } from './savings.model';

export type CategoryType = 'expense' | 'saving' | 'debt' | 'income' | 'project';
export type CategoryPriority = 'low' | 'medium' | 'high' | 'essential';

export interface MoneyCategoryApi {
  id: string;
  userId?: string;
  name: string;
  slug?: string;
  type?: CategoryType | string;
  priority?: CategoryPriority;
  isFixed?: boolean;
  isActive?: boolean;
  color?: string | null;
  icon?: string | null;
  spent?: string | number;
  used?: string | number;
  limit?: string | number;
  status?: string;
  categoryName?: string;
  category?: { name?: string; color?: string };
  amount?: string | number;
}

export interface ExpenseApi {
  id: string;
  categoryId?: string;
  amount: string | number;
  description?: string;
  name?: string;
  date?: string;
  expenseDate?: string;
  createdAt?: string;
  note?: string | null;
  source?: string | null;
  paymentMethod?: string | null;
  category?: MoneyCategoryApi;
  categoryName?: string;
}

export type ExpenseFilters = Record<string, string | number | boolean | undefined>;
export type CreateCategoryPayload = ApiPayload;
export type UpdateCategoryPayload = ApiPayload;
export type CreateExpensePayload = ApiPayload;
export type UpdateExpensePayload = ApiPayload;

export type MoneyCategoryStatus = 'OK' | 'Cuidado' | 'Excedido' | 'Apartado' | 'Pagado' | 'Pendiente' | 'Próximo' | 'En pausa';
export interface MoneyCategory { name: string; used: number; limit: number; tone: 'green' | 'blue' | 'orange' | 'red' | 'pink' | 'purple'; status: MoneyCategoryStatus; }
export interface PaymentItem { name: string; amount: number; dueLabel: string; suffix?: string; }
export interface RecentExpense { name: string; amount: number; day: string; }
export interface Paycheck { income: number; debt: number; gym: number; nutritionist: number; foodWeekly: number; transportPerDay: number; transportDays: number; }
export interface DebtInfo { name?: string; left: number; nextPayment: number; date: string; progress: number; extra: number; bankPlan: string; aggressivePlan: string; }
export interface MoneyView { paycheck: Paycheck; upcomingPayments: PaymentItem[]; debtInfo: DebtInfo; categories: MoneyCategory[]; savingsGoals: SavingsGoal[]; recentExpenses: RecentExpense[]; }

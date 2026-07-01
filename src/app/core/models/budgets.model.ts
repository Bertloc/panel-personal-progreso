import { ApiPayload } from './api.model';

export type BudgetPeriodType = 'weekly' | 'biweekly' | 'monthly' | 'custom';
export interface BudgetLimitApi { id: string; categoryId?: string; categoryName?: string; name?: string; limit?: string | number; limitAmount?: string | number; amount?: string | number; spent?: string | number; used?: string | number; usedAmount?: string | number; category?: { name?: string; color?: string }; }
export interface BudgetPeriodApi { id: string; userId?: string; name?: string; periodType?: BudgetPeriodType; startDate?: string; endDate?: string; income?: string | number; expectedIncome?: string | number | null; limits?: BudgetLimitApi[]; }
export interface BudgetSummary { income?: number; budgeted?: number; spent?: number; remaining?: number; }
export interface BudgetCurrentResponse { current: BudgetPeriodApi | null; limits: BudgetLimitApi[]; summary: BudgetSummary | null; }
export type SaveCurrentBudgetPayload = ApiPayload;
export type CreateBudgetPeriodPayload = ApiPayload;
export type CreateBudgetLimitPayload = ApiPayload;
export type UpdateBudgetLimitPayload = ApiPayload;

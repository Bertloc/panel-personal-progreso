import { ApiPayload } from './api.model';

export interface BudgetLimitApi { id: string; categoryId?: string; categoryName?: string; name?: string; limit?: string | number; amount?: string | number; spent?: string | number; used?: string | number; category?: { name?: string; color?: string }; }
export interface BudgetPeriodApi { id: string; name?: string; startDate?: string; endDate?: string; income?: string | number; limits?: BudgetLimitApi[]; }
export type CreateBudgetPeriodPayload = ApiPayload;
export type CreateBudgetLimitPayload = ApiPayload;
export type UpdateBudgetLimitPayload = ApiPayload;

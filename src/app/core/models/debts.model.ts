import { ApiPayload } from './api.model';

export interface DebtApi { id: string; name?: string; originalAmount?: string | number; totalAmount?: string | number; remainingAmount?: string | number; balance?: string | number; nextPaymentAmount?: string | number; minimumPayment?: string | number; nextPaymentDate?: string; progress?: string | number; suggestedExtraPayment?: string | number; bankPlan?: string; aggressivePlan?: string; status?: string; }
export interface DebtPaymentApi { id: string; debtId?: string; amount: string | number; date?: string; createdAt?: string; }
export interface DebtProjectionApi { payoffDate?: string; totalInterest?: string | number; [key: string]: unknown; }
export type CreateDebtPayload = ApiPayload;
export type UpdateDebtPayload = ApiPayload;
export type CreateDebtPaymentPayload = ApiPayload;

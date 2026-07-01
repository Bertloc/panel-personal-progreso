import { ApiPayload } from './api.model';

export type DebtStrategy = 'bank_plan' | 'light' | 'aggressive' | 'custom';
export type DebtPriority = 'low' | 'medium' | 'high' | 'urgent';
export type DebtStatus = 'active' | 'paused' | 'paid' | 'cancelled';
export type DebtPaymentType = 'minimum' | 'extra' | 'adjustment';
export interface DebtApi {
  id: string; userId?: string; name?: string; initialAmount?: string | number; currentAmount?: string | number;
  originalAmount?: string | number; totalAmount?: string | number; remainingAmount?: string | number; balance?: string | number;
  nextPaymentAmount?: string | number; minimumPayment?: string | number | null; paymentDay?: number | null;
  strategy?: DebtStrategy; priority?: DebtPriority; notes?: string | null; nextPaymentDate?: string | null;
  progressPercent?: number; paidAmount?: number; progress?: string | number; suggestedExtraPayment?: string | number;
  bankPlan?: string; aggressivePlan?: string; status?: DebtStatus | string;
}
export interface DebtPaymentApi { id: string; debtId?: string; amount: string | number; paymentDate?: string; type?: DebtPaymentType; note?: string | null; date?: string; createdAt?: string; }
export interface DebtProjectionApi { payoffDate?: string; totalInterest?: string | number; [key: string]: unknown; }
export type CreateDebtPayload = ApiPayload;
export type UpdateDebtPayload = ApiPayload;
export type CreateDebtPaymentPayload = ApiPayload;
export type UpdateDebtPaymentPayload = ApiPayload;

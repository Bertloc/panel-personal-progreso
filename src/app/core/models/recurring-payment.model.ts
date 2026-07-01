import { ApiPayload } from './api.model';

export type RecurringFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'custom';
export interface RecurringPayment {
  id: string; userId?: string; name: string; amount: string | number; frequency: RecurringFrequency;
  dueDay?: number | null; nextDueDate?: string | null; categoryId?: string | null;
  isFixed: boolean; isActive: boolean; notes?: string | null;
}
export type CreateRecurringPaymentPayload = ApiPayload;
export type UpdateRecurringPaymentPayload = ApiPayload;

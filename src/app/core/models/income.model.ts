import { IncomeFrequency } from './settings.model';
import { ApiPayload } from './api.model';

export interface IncomeSource {
  id: string;
  userId: string;
  name: string;
  amount: number;
  frequency: IncomeFrequency;
  nextPaymentDate?: string | null;
  isFixed: boolean;
  isActive: boolean;
}

export type CreateIncomeSourcePayload = Omit<IncomeSource, 'id' | 'userId' | 'isActive'>;
export type UpdateIncomeSourcePayload = Partial<CreateIncomeSourcePayload & Pick<IncomeSource, 'isActive'>>;

export type IncomeEventType = 'regular' | 'extra' | 'adjustment' | 'other';
export interface IncomeEvent {
  id: string;
  sourceId?: string | null;
  amount: string | number;
  incomeDate: string;
  type: IncomeEventType;
  note?: string | null;
}
export type IncomeEventFilters = Record<string, string | number | boolean | undefined>;
export type CreateIncomeEventPayload = ApiPayload;
export type UpdateIncomeEventPayload = ApiPayload;

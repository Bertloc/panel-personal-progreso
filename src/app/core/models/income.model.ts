import { IncomeFrequency } from './settings.model';

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

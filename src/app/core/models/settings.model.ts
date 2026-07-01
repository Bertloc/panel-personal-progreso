import { ApiPayload } from './api.model';

export type BudgetMode = 'adjusted' | 'flexible' | 'debt_aggressive' | 'saving_aggressive';
export type IncomeFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'irregular';

export interface SettingsApi {
  id?: string;
  userName?: string;
  paydayIncome?: string | number;
  income?: string | number;
  budgetMode?: BudgetMode;
  [key: string]: unknown;
}
export type UpdateSettingsPayload = ApiPayload;

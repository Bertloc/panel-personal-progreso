import { BudgetMode } from './settings.model';

export type GuidanceRecommendationType = 'warning' | 'budget' | 'obligation' | 'flexible' | 'debt' | 'saving' | 'setup';

export interface GuidanceRecommendation {
  type: GuidanceRecommendationType;
  priority: 'primary' | 'secondary';
  reason: string;
  amount?: number;
  entityId?: string;
  entityName?: string;
  entityPriority?: string;
  percent?: number;
  interestRate?: number | null;
  shortfall?: number;
}

export interface FinancialGuidance {
  mode: BudgetMode;
  period: { startDate: string; endDate: string; remainingDays: number };
  income: number;
  incomeIsEstimated: boolean;
  expenses: number;
  budget: { total: number; used: number; remaining: number } | null;
  obligations: number;
  debtMinimums: number;
  available: number;
  dailySafeAmount: number | null;
  calculation: { formula: string; budgetLimitsSubtracted: boolean };
  recommendations: GuidanceRecommendation[];
  warnings: string[];
}

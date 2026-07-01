import { IncomeSource } from './income.model';
import { UserProfile } from './profile.model';
import { BudgetMode, IncomeFrequency, SettingsApi } from './settings.model';

export interface OnboardingStatus {
  completed: boolean;
  profile: UserProfile | null;
  settings: SettingsApi | null;
  incomeSources: IncomeSource[];
}

export interface CompleteOnboardingPayload {
  profile: { displayName: string; currency: string; timezone?: string };
  income: {
    name: string;
    amount: number;
    frequency: IncomeFrequency;
    nextPaymentDate?: string | null;
    isFixed: boolean;
  };
  settings: { budgetMode: BudgetMode };
}

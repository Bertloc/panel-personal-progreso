import { ApiPayload } from './api.model';

export type SavingGoalStatus = 'active' | 'paused' | 'completed' | 'cancelled';
export type SavingsMovementType = 'deposit' | 'withdrawal' | 'adjustment';
export interface SavingsGoalApi {
  id: string; userId?: string; name: string; currentAmount?: string | number; current?: string | number;
  targetAmount?: string | number; target?: string | number; targetDate?: string | null; priority?: string;
  status?: SavingGoalStatus | string; progressPercent?: number; remainingAmount?: number; notes?: string | null;
  monthlyContribution?: string | number | null;
}
export interface SavingsMovementApi { id: string; goalId?: string; amount: string | number; movementDate?: string; type?: SavingsMovementType; note?: string | null; date?: string; createdAt?: string; }
export type CreateSavingsGoalPayload = ApiPayload;
export type UpdateSavingsGoalPayload = ApiPayload;
export type CreateSavingsMovementPayload = ApiPayload;
export type UpdateSavingsMovementPayload = ApiPayload;
export interface SavingsGoal { name: string; current: number; target: number; tone: 'green' | 'blue' | 'purple'; }

import { ApiPayload } from './api.model';

export type SavingGoalStatus = 'active' | 'paused' | 'completed' | 'cancelled';
export interface SavingsGoalApi {
  id: string; userId?: string; name: string; currentAmount?: string | number; current?: string | number;
  targetAmount?: string | number; target?: string | number; targetDate?: string | null; priority?: string;
  status?: SavingGoalStatus | string; progressPercent?: number; remainingAmount?: number; notes?: string | null;
}
export interface SavingsMovementApi { id: string; goalId?: string; amount: string | number; date?: string; createdAt?: string; }
export type CreateSavingsGoalPayload = ApiPayload;
export type UpdateSavingsGoalPayload = ApiPayload;
export type CreateSavingsMovementPayload = ApiPayload;
export interface SavingsGoal { name: string; current: number; target: number; tone: 'green' | 'blue' | 'purple'; }

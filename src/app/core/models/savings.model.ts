import { ApiPayload } from './api.model';

export interface SavingsGoalApi { id: string; name: string; currentAmount?: string | number; current?: string | number; targetAmount?: string | number; target?: string | number; status?: string; }
export interface SavingsMovementApi { id: string; goalId?: string; amount: string | number; date?: string; createdAt?: string; }
export type CreateSavingsGoalPayload = ApiPayload;
export type UpdateSavingsGoalPayload = ApiPayload;
export type CreateSavingsMovementPayload = ApiPayload;
export interface SavingsGoal { name: string; current: number; target: number; tone: 'green' | 'blue' | 'purple'; }

import { DebtPriority, DebtStrategy } from '../models/debts.model';
import { toNumber } from './number.util';

const strategyLabels: Record<DebtStrategy, string> = {
  bank_plan: 'Plan bancario',
  light: 'Ligera',
  aggressive: 'Agresiva',
  custom: 'Personalizada',
};

const priorityLabels: Record<DebtPriority, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
};

export const debtStrategyLabel = (strategy?: DebtStrategy) => strategy ? strategyLabels[strategy] : 'Sin estrategia';
export const debtPriorityLabel = (priority?: DebtPriority) => priority ? priorityLabels[priority] : 'Sin prioridad';
export const roundedPercent = (value: unknown) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
export const oneDecimalPercent = (value: unknown) => Math.round((Number(value) || 0) * 10) / 10;
export const savingsAmountsAreValid = (current: unknown, target: unknown) => Number.isFinite(Number(current)) && Number(current) >= 0 && Number.isFinite(Number(target)) && Number(target) > 0;
export const savingsProgressPercent = (current: unknown, target: unknown) => savingsAmountsAreValid(current, target) ? Math.min(100, (toNumber(current) / toNumber(target)) * 100) : 0;
export const savingsRemainingAmount = (current: unknown, target: unknown) => savingsAmountsAreValid(current, target) ? Math.max(0, toNumber(target) - toNumber(current)) : 0;
export const savingsExcessAmount = (current: unknown, target: unknown) => savingsAmountsAreValid(current, target) ? Math.max(0, toNumber(current) - toNumber(target)) : 0;

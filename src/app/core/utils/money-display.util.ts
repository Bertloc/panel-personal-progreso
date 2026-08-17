import { DebtPriority, DebtStrategy } from '../models/debts.model';

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

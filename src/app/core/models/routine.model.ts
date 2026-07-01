import { ApiPayload } from './api.model';

export type RoutineStatus = 'active' | 'paused' | 'archived';
export type RoutinePriority = 'low' | 'medium' | 'high' | 'essential';
export type RoutineLogStatus = 'pending' | 'done' | 'skipped' | 'missed';

export interface RoutineSchedule {
  id?: string;
  routineId?: string;
  routineItemId?: string | null;
  dayOfWeek: number;
  isActive?: boolean;
}

export interface Routine {
  id: string;
  userId?: string;
  name: string;
  description?: string | null;
  status: RoutineStatus;
  priority?: RoutinePriority | null;
  daysOfWeek?: number[];
  items?: RoutineItem[];
  schedules?: RoutineSchedule[];
  itemsCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface RoutineItem {
  id: string;
  userId?: string;
  routineId: string;
  title: string;
  description?: string | null;
  priority: RoutinePriority;
  isRequired: boolean;
  order?: number | null;
  isActive?: boolean;
  daysOfWeek?: number[];
  schedules?: RoutineSchedule[];
}

export interface RoutineTodayItem {
  routineId: string;
  routineName: string;
  itemId: string;
  title: string;
  description?: string | null;
  priority: RoutinePriority;
  isRequired: boolean;
  status: RoutineLogStatus;
  logId?: string | null;
}

export interface RoutineTodayResponse {
  date: string;
  dayOfWeek: number;
  items: RoutineTodayItem[];
  summary: { total: number; done: number; pending: number; skipped: number; missed: number; completionPercent: number };
}

export interface RoutineSummary {
  today: { total: number; done: number; pending: number; completionPercent: number };
  week: { activeDays: number; completedDays: number; completionPercent: number };
  streak: { current: number; best: number };
}

export interface RoutineHistoryDay {
  date: string;
  total: number;
  done: number;
  skipped: number;
  missed: number;
  completionPercent: number;
}

export interface RoutineHistoryResponse { startDate?: string; endDate?: string; days: RoutineHistoryDay[]; }

export type RoutineFilters = Record<string, string | number | boolean | undefined>;
export type RoutinePayload = ApiPayload;
export type RoutineItemPayload = ApiPayload;
export type RoutineLogPayload = ApiPayload;

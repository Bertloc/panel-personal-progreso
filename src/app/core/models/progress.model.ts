import { ApiPayload } from './api.model';
import { HeatmapDay } from './home-summary.model';

export type ProgressFilter = 'general' | 'money' | 'routine' | 'debt' | 'saving' | 'projects';
export type ProgressStatus = 'empty' | 'low' | 'ok' | 'good' | 'excellent';

export interface ProgressHeatmapDay {
  date: string;
  value: number;
  level: number;
  status: ProgressStatus;
  details?: {
    money?: number | null;
    routine?: number | null;
    debt?: number | null;
    saving?: number | null;
    projects?: number | null;
  };
}

export interface ProgressHeatmapResponse {
  year: number;
  filter: ProgressFilter;
  unit: 'day';
  description: string;
  legend: Array<{ level: number; label: string }>;
  items: ProgressHeatmapDay[];
  summary: {
    average: number;
    bestDay?: string | null;
    activeDays: number;
    excellentDays: number;
    currentStreak: number;
  };
}

export interface ProgressSummaryResponse {
  period: 'week' | 'month' | 'year';
  startDate: string;
  endDate: string;
  general?: unknown;
  money?: unknown;
  routine?: unknown;
  debt?: unknown;
  saving?: unknown;
}

export interface ProgressDayDetail {
  date: string;
  general: number;
  money?: unknown;
  routine?: unknown;
  debt?: unknown;
  saving?: unknown;
  projects?: unknown;
}

export interface HeatmapApiDay {
  id?: string;
  date?: string;
  progressDate?: string;
  value?: string | number;
  level?: string | number;
  score?: string | number;
  state?: string;
  status?: string;
  details?: ProgressHeatmapDay['details'] & { habits?: number | null; savings?: number | null };
}

export interface HeatmapApiResponse {
  year?: string | number;
  filter?: string;
  unit?: string;
  description?: string;
  legend?: Array<{ level?: string | number; label?: string }>;
  items?: HeatmapApiDay[];
  days?: HeatmapApiDay[];
  heatmap?: HeatmapApiDay[];
  summary?: Partial<ProgressHeatmapResponse['summary']>;
  monthlyConsistency?: Array<{ name?: string; month?: string; percent?: string | number }>;
}

// Kept for the existing dashboard/legacy progress endpoints.
export interface ProgressTodayApi { activeDays?: string | number; streak?: string | number; longestStreak?: string | number; consistency?: string | number; bestMonth?: string; bestMonthDays?: string | number; [key: string]: unknown; }
export type RecalculateProgressPayload = ApiPayload;
export interface ConsistencyMonth { name: string; percent: number; }
export interface ProgressView { heatmap: HeatmapDay[]; activeDays: number; streak: number; consistency: number; longestStreak: number; bestMonth: string; bestMonthDays: number; monthlyConsistency: ConsistencyMonth[]; }

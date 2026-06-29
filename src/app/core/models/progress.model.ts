import { ApiPayload } from './api.model';
import { HeatmapDay } from './home-summary.model';

export interface ProgressTodayApi { activeDays?: string | number; streak?: string | number; longestStreak?: string | number; consistency?: string | number; bestMonth?: string; bestMonthDays?: string | number; [key: string]: unknown; }
export interface HeatmapApiDay { id?: string; date?: string; value?: string | number; score?: string | number; state?: string; status?: string; }
export interface HeatmapApiResponse { days?: HeatmapApiDay[]; heatmap?: HeatmapApiDay[]; monthlyConsistency?: Array<{ name?: string; month?: string; percent?: string | number }>; }
export type RecalculateProgressPayload = ApiPayload;
export interface ConsistencyMonth { name: string; percent: number; }
export interface ProgressView { heatmap: HeatmapDay[]; activeDays: number; streak: number; consistency: number; longestStreak: number; bestMonth: string; bestMonthDays: number; monthlyConsistency: ConsistencyMonth[]; }

import { ProgressView } from '../models/progress.model';
import { createMockHeatmap } from '../utils/heatmap.util';

export const PROGRESS_FALLBACK: ProgressView = {
  heatmap: createMockHeatmap(126), activeDays: 168, streak: 14, consistency: 45, longestStreak: 48,
  bestMonth: 'Mayo', bestMonthDays: 28,
  monthlyConsistency: [
    { name: 'Enero', percent: 64 }, { name: 'Febrero', percent: 71 }, { name: 'Marzo', percent: 80 },
    { name: 'Abril', percent: 76 }, { name: 'Mayo', percent: 93 }, { name: 'Junio', percent: 82 },
  ],
};

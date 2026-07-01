import { ProgressFilter, ProgressHeatmapResponse } from '../models/progress.model';

export function emptyProgress(year: number, filter: ProgressFilter): ProgressHeatmapResponse {
  return {
    year, filter, unit: 'day', description: '', items: [],
    legend: ['Sin datos', 'Bajo', 'Regular', 'Bien', 'Excelente'].map((label, level) => ({ level, label })),
    summary: { average: 0, bestDay: null, activeDays: 0, excellentDays: 0, currentStreak: 0 },
  };
}

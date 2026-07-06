import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse, unwrapApiResponse } from '../models/api.model';
import { HeatmapApiDay, HeatmapApiResponse, ProgressDayDetail, ProgressFilter, ProgressHeatmapDay, ProgressHeatmapResponse, ProgressSummaryResponse, ProgressTodayApi, RecalculateProgressPayload } from '../models/progress.model';
import { toNumber } from '../utils/number.util';

const LEGEND = ['Sin datos', 'Bajo', 'Regular', 'Bien', 'Excelente'];
const STATUSES = ['empty', 'low', 'ok', 'good', 'excellent'] as const;

@Injectable({ providedIn: 'root' })
export class ProgressApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE_URL}/progress`;

  getTodayProgress() { return this.http.get<ApiResponse<ProgressTodayApi>>(`${this.url}/today`).pipe(map(unwrapApiResponse)); }
  getHeatmap(filter: ProgressFilter, year: number) {
    const params = new HttpParams().set('filter', filter === 'routine' ? 'habits' : filter).set('year', year);
    return this.http.get<ApiResponse<HeatmapApiResponse | HeatmapApiDay[]>>(`${this.url}/heatmap`, { params }).pipe(
      map(unwrapApiResponse),
      map((response) => normalizeHeatmap(response, filter, year)),
    );
  }
  getSummary(period: ProgressSummaryResponse['period'], date?: string) {
    let params = new HttpParams().set('period', period);
    if (date) params = params.set('date', date);
    return this.http.get<ApiResponse<ProgressSummaryResponse>>(`${this.url}/summary`, { params }).pipe(map(unwrapApiResponse));
  }
  getDayDetail(date: string) { return this.http.get<ApiResponse<ProgressDayDetail>>(`${this.url}/day/${encodeURIComponent(date)}`).pipe(map(unwrapApiResponse)); }
  recalculateProgress(payload: RecalculateProgressPayload) { return this.http.post<ProgressTodayApi>(`${this.url}/recalculate`, payload); }
}

export function normalizeHeatmap(raw: HeatmapApiResponse | HeatmapApiDay[], filter: ProgressFilter, year: number): ProgressHeatmapResponse {
  const response = Array.isArray(raw) ? { items: raw } : raw;
  const items = (response.items ?? response.days ?? response.heatmap ?? []).map(normalizeDay).filter((day) => day.date);
  const summary = response.summary ?? {};
  return {
    year: toNumber(response.year) || year,
    filter: normalizeFilter(response.filter) ?? filter,
    unit: 'day',
    description: response.description ?? '',
    legend: response.legend?.map((item) => ({ level: clampLevel(item.level), label: item.label ?? LEGEND[clampLevel(item.level)] })) ?? LEGEND.map((label, level) => ({ level, label })),
    items,
    summary: {
      average: summary.average === undefined ? (items.length ? Math.round(items.reduce((sum, day) => sum + day.value, 0) / items.length) : 0) : toNumber(summary.average),
      bestDay: summary.bestDay ?? items.filter(({ level }) => level > 0).reduce<ProgressHeatmapDay | null>((best, day) => !best || day.value > best.value ? day : best, null)?.date ?? null,
      activeDays: summary.activeDays === undefined ? items.filter(({ level }) => level > 0).length : toNumber(summary.activeDays),
      excellentDays: summary.excellentDays === undefined ? items.filter(({ level }) => level === 4).length : toNumber(summary.excellentDays),
      currentStreak: toNumber(summary.currentStreak),
    },
  };
}

function normalizeDay(day: HeatmapApiDay): ProgressHeatmapDay {
  const value = toNumber(day.value ?? day.score);
  const statusLevel = ({ empty: 0, low: 1, medium: 2, ok: 2, good: 3, excellent: 4 } as Record<string, number>)[day.status ?? day.state ?? ''];
  const level = day.level === undefined ? (statusLevel ?? (value <= 4 ? clampLevel(value) : value <= 30 ? 1 : value <= 60 ? 2 : value <= 85 ? 3 : 4)) : clampLevel(day.level);
  return {
    date: (day.date ?? day.progressDate ?? (/^\d{4}-\d{2}-\d{2}$/.test(day.id ?? '') ? day.id! : '')).slice(0, 10),
    value,
    level,
    status: STATUSES[level],
    details: day.details && { money: day.details.money, routine: day.details.routine ?? day.details.habits, debt: day.details.debt, saving: day.details.saving ?? day.details.savings, projects: day.details.projects },
  };
}

function clampLevel(value: unknown) { return Math.max(0, Math.min(4, Math.round(toNumber(value)))); }
function normalizeFilter(value?: string): ProgressFilter | undefined {
  const normalized = value === 'habits' ? 'routine' : value === 'savings' ? 'saving' : value;
  return ['general', 'money', 'routine', 'debt', 'saving', 'projects'].includes(normalized ?? '') ? normalized as ProgressFilter : undefined;
}

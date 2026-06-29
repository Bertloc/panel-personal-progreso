import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse, unwrapApiResponse } from '../models/api.model';
import { HeatmapApiDay, HeatmapApiResponse, ProgressTodayApi, RecalculateProgressPayload } from '../models/progress.model';

@Injectable({ providedIn: 'root' })
export class ProgressApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE_URL}/progress`;
  getTodayProgress() { return this.http.get<ApiResponse<ProgressTodayApi>>(`${this.url}/today`).pipe(map(unwrapApiResponse)); }
  getHeatmap(filter?: string, year?: number) {
    let params = new HttpParams();
    if (filter) params = params.set('filter', filter);
    if (year) params = params.set('year', year);
    return this.http.get<ApiResponse<HeatmapApiResponse | HeatmapApiDay[]>>(`${this.url}/heatmap`, { params }).pipe(map(unwrapApiResponse));
  }
  recalculateProgress(payload: RecalculateProgressPayload) { return this.http.post<ProgressTodayApi>(`${this.url}/recalculate`, payload); }
}

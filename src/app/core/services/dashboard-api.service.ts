import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse, unwrapApiResponse } from '../models/api.model';
import { DashboardSummary } from '../models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private readonly http = inject(HttpClient);
  getSummary() { return this.http.get<ApiResponse<DashboardSummary>>(`${API_BASE_URL}/dashboard/summary`).pipe(map(unwrapApiResponse)); }
}

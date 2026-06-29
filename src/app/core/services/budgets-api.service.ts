import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse, unwrapApiResponse } from '../models/api.model';
import { BudgetLimitApi, BudgetPeriodApi, CreateBudgetLimitPayload, CreateBudgetPeriodPayload, UpdateBudgetLimitPayload } from '../models/budgets.model';

@Injectable({ providedIn: 'root' })
export class BudgetsApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE_URL}/budgets`;
  getCurrentBudget() { return this.http.get<ApiResponse<BudgetPeriodApi>>(`${this.url}/current`).pipe(map(unwrapApiResponse)); }
  getBudgetPeriods() { return this.http.get<ApiResponse<BudgetPeriodApi[]>>(`${this.url}/periods`).pipe(map(unwrapApiResponse)); }
  createBudgetPeriod(payload: CreateBudgetPeriodPayload) { return this.http.post<BudgetPeriodApi>(`${this.url}/periods`, payload); }
  getBudgetPeriodById(id: string) { return this.http.get<ApiResponse<BudgetPeriodApi>>(`${this.url}/periods/${id}`).pipe(map(unwrapApiResponse)); }
  createBudgetLimit(payload: CreateBudgetLimitPayload) { return this.http.post<BudgetLimitApi>(`${this.url}/limits`, payload); }
  updateBudgetLimit(id: string, payload: UpdateBudgetLimitPayload) { return this.http.patch<BudgetLimitApi>(`${this.url}/limits/${id}`, payload); }
}

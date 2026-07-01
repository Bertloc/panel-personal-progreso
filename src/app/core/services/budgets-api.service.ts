import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse, unwrapApiResponse } from '../models/api.model';
import { BudgetCurrentResponse, BudgetLimitApi, BudgetPeriodApi, CreateBudgetLimitPayload, CreateBudgetPeriodPayload, SaveCurrentBudgetPayload, UpdateBudgetLimitPayload } from '../models/budgets.model';

@Injectable({ providedIn: 'root' })
export class BudgetsApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE_URL}/budgets`;
  getCurrentBudget() {
    return this.http.get<ApiResponse<BudgetCurrentResponse | BudgetPeriodApi>>(`${this.url}/current`).pipe(
      map(unwrapApiResponse),
      map((value): BudgetCurrentResponse => 'current' in value ? value : { current: value, limits: value.limits ?? [], summary: null }),
    );
  }
  saveCurrentBudget(payload: SaveCurrentBudgetPayload) { return this.http.post<BudgetCurrentResponse>(`${this.url}/current`, payload); }
  updateCurrentBudget(payload: SaveCurrentBudgetPayload) { return this.http.patch<BudgetCurrentResponse>(`${this.url}/current`, payload); }
  getBudgetPeriods() { return this.http.get<ApiResponse<BudgetPeriodApi[]>>(`${this.url}/periods`).pipe(map(unwrapApiResponse)); }
  createBudgetPeriod(payload: CreateBudgetPeriodPayload) { return this.http.post<BudgetPeriodApi>(`${this.url}/periods`, payload); }
  getBudgetPeriodById(id: string) { return this.http.get<ApiResponse<BudgetPeriodApi>>(`${this.url}/periods/${id}`).pipe(map(unwrapApiResponse)); }
  createBudgetLimit(payload: CreateBudgetLimitPayload) { return this.http.post<BudgetLimitApi>(`${this.url}/limits`, payload); }
  updateBudgetLimit(id: string, payload: UpdateBudgetLimitPayload) { return this.http.patch<BudgetLimitApi>(`${this.url}/limits/${id}`, payload); }
}

import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse, unwrapApiResponse } from '../models/api.model';
import { CreateSavingsGoalPayload, CreateSavingsMovementPayload, SavingsGoalApi, SavingsMovementApi, UpdateSavingsGoalPayload, UpdateSavingsMovementPayload } from '../models/savings.model';

@Injectable({ providedIn: 'root' })
export class SavingsApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE_URL}/savings/goals`;
  getGoals(filters: Record<string, string | number | boolean | undefined> = {}) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) if (value !== undefined) params = params.set(key, String(value));
    return this.http.get<ApiResponse<SavingsGoalApi[]>>(this.url, { params }).pipe(map(unwrapApiResponse));
  }
  createGoal(payload: CreateSavingsGoalPayload) { return this.http.post<SavingsGoalApi>(this.url, payload); }
  getGoalById(id: string) { return this.http.get<ApiResponse<SavingsGoalApi>>(`${this.url}/${id}`).pipe(map(unwrapApiResponse)); }
  updateGoal(id: string, payload: UpdateSavingsGoalPayload) { return this.http.patch<SavingsGoalApi>(`${this.url}/${id}`, payload); }
  deleteGoal(id: string) { return this.http.delete<void>(`${this.url}/${id}`); }
  createMovement(goalId: string, payload: CreateSavingsMovementPayload) { return this.http.post<SavingsMovementApi>(`${this.url}/${goalId}/movements`, payload); }
  getMovements(goalId: string) { return this.http.get<ApiResponse<SavingsMovementApi[]>>(`${this.url}/${goalId}/movements`).pipe(map(unwrapApiResponse)); }
  updateMovement(movementId: string, payload: UpdateSavingsMovementPayload) { return this.http.patch<SavingsMovementApi>(`${API_BASE_URL}/savings/movements/${movementId}`, payload); }
  deleteMovement(movementId: string) { return this.http.delete<void>(`${API_BASE_URL}/savings/movements/${movementId}`); }
}

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse, unwrapApiResponse } from '../models/api.model';
import { CreateSavingsGoalPayload, CreateSavingsMovementPayload, SavingsGoalApi, SavingsMovementApi, UpdateSavingsGoalPayload } from '../models/savings.model';

@Injectable({ providedIn: 'root' })
export class SavingsApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE_URL}/savings/goals`;
  getGoals() { return this.http.get<ApiResponse<SavingsGoalApi[]>>(this.url).pipe(map(unwrapApiResponse)); }
  createGoal(payload: CreateSavingsGoalPayload) { return this.http.post<SavingsGoalApi>(this.url, payload); }
  getGoalById(id: string) { return this.http.get<ApiResponse<SavingsGoalApi>>(`${this.url}/${id}`).pipe(map(unwrapApiResponse)); }
  updateGoal(id: string, payload: UpdateSavingsGoalPayload) { return this.http.patch<SavingsGoalApi>(`${this.url}/${id}`, payload); }
  createMovement(goalId: string, payload: CreateSavingsMovementPayload) { return this.http.post<SavingsMovementApi>(`${this.url}/${goalId}/movements`, payload); }
  getMovements(goalId: string) { return this.http.get<ApiResponse<SavingsMovementApi[]>>(`${this.url}/${goalId}/movements`).pipe(map(unwrapApiResponse)); }
}

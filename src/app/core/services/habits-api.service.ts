import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse, unwrapApiResponse } from '../models/api.model';
import { CreateHabitLogPayload, CreateHabitPayload, HabitApi, UpdateHabitLogPayload, UpdateHabitPayload } from '../models/habits.model';

@Injectable({ providedIn: 'root' })
export class HabitsApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE_URL}/habits`;
  getHabits() { return this.http.get<ApiResponse<HabitApi[]>>(this.url).pipe(map(unwrapApiResponse)); }
  createHabit(payload: CreateHabitPayload) { return this.http.post<HabitApi>(this.url, payload); }
  updateHabit(id: string, payload: UpdateHabitPayload) { return this.http.patch<HabitApi>(`${this.url}/${id}`, payload); }
  getTodayHabits() { return this.http.get<ApiResponse<HabitApi[]>>(`${this.url}/today`).pipe(map(unwrapApiResponse)); }
  logHabit(habitId: string, payload: CreateHabitLogPayload) { return this.http.post(`${this.url}/${habitId}/logs`, payload); }
  updateHabitLog(habitId: string, logId: string, payload: UpdateHabitLogPayload) { return this.http.patch(`${this.url}/${habitId}/logs/${logId}`, payload); }
}

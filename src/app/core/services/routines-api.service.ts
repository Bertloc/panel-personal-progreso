import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse, unwrapApiResponse } from '../models/api.model';
import { Routine, RoutineFilters, RoutineHistoryDay, RoutineHistoryResponse, RoutineItem, RoutineItemPayload, RoutineLogPayload, RoutinePayload, RoutineSummary, RoutineTodayResponse } from '../models/routine.model';

@Injectable({ providedIn: 'root' })
export class RoutinesApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE_URL}/routines`;

  getRoutines(filters: RoutineFilters = {}) { return this.http.get<ApiResponse<Routine[]>>(this.url, { params: toParams(filters) }).pipe(map(unwrapApiResponse)); }
  getRoutine(id: string) { return this.http.get<ApiResponse<Routine>>(`${this.url}/${id}`).pipe(map(unwrapApiResponse)); }
  createRoutine(payload: RoutinePayload) { return this.http.post<Routine>(this.url, payload); }
  updateRoutine(id: string, payload: RoutinePayload) { return this.http.patch<Routine>(`${this.url}/${id}`, payload); }
  deleteRoutine(id: string) { return this.http.delete<void>(`${this.url}/${id}`); }
  getRoutineItems(routineId: string) { return this.http.get<ApiResponse<RoutineItem[]>>(`${this.url}/${routineId}/items`).pipe(map(unwrapApiResponse)); }
  createRoutineItem(routineId: string, payload: RoutineItemPayload) { return this.http.post<RoutineItem>(`${this.url}/${routineId}/items`, payload); }
  updateRoutineItem(itemId: string, payload: RoutineItemPayload) { return this.http.patch<RoutineItem>(`${this.url}/items/${itemId}`, payload); }
  deleteRoutineItem(itemId: string) { return this.http.delete<void>(`${this.url}/items/${itemId}`); }
  getToday(date?: string) { return this.http.get<ApiResponse<RoutineTodayResponse>>(`${this.url}/today`, { params: date ? new HttpParams().set('date', date) : undefined }).pipe(map(unwrapApiResponse)); }
  upsertLog(payload: RoutineLogPayload) { return this.http.post(`${this.url}/logs`, payload); }
  updateLog(logId: string, payload: RoutineLogPayload) { return this.http.patch(`${this.url}/logs/${logId}`, payload); }
  deleteLog(logId: string) { return this.http.delete<void>(`${this.url}/logs/${logId}`); }
  getHistory(filters: RoutineFilters) { return this.http.get<ApiResponse<RoutineHistoryDay[] | RoutineHistoryResponse>>(`${this.url}/history`, { params: toParams(filters) }).pipe(map(unwrapApiResponse), map((value) => Array.isArray(value) ? value : value.days)); }
  getSummary(date?: string) { return this.http.get<ApiResponse<RoutineSummary>>(`${this.url}/summary`, { params: date ? new HttpParams().set('date', date) : undefined }).pipe(map(unwrapApiResponse)); }
}

function toParams(filters: RoutineFilters) {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(filters)) if (value !== undefined) params = params.set(key, String(value));
  return params;
}

import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse, unwrapApiResponse } from '../models/api.model';
import { CreateIncomeEventPayload, CreateIncomeSourcePayload, IncomeEvent, IncomeEventFilters, IncomeSource, UpdateIncomeEventPayload, UpdateIncomeSourcePayload } from '../models/income.model';

@Injectable({ providedIn: 'root' })
export class IncomeApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE_URL}/income/sources`;
  getSources() { return this.http.get<ApiResponse<IncomeSource[]>>(this.url).pipe(map(unwrapApiResponse)); }
  createSource(payload: CreateIncomeSourcePayload) { return this.http.post<IncomeSource>(this.url, payload); }
  updateSource(id: string, payload: UpdateIncomeSourcePayload) { return this.http.patch<IncomeSource>(`${this.url}/${id}`, payload); }
  deleteSource(id: string) { return this.http.delete<void>(`${this.url}/${id}`); }
  getEvents(filters: IncomeEventFilters = {}) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) if (value !== undefined) params = params.set(key, String(value));
    return this.http.get<ApiResponse<IncomeEvent[]>>(`${API_BASE_URL}/income/events`, { params }).pipe(map(unwrapApiResponse));
  }
  createEvent(payload: CreateIncomeEventPayload) { return this.http.post<IncomeEvent>(`${API_BASE_URL}/income/events`, payload); }
  updateEvent(id: string, payload: UpdateIncomeEventPayload) { return this.http.patch<IncomeEvent>(`${API_BASE_URL}/income/events/${id}`, payload); }
  deleteEvent(id: string) { return this.http.delete<void>(`${API_BASE_URL}/income/events/${id}`); }
}

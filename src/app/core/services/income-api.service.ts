import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse, unwrapApiResponse } from '../models/api.model';
import { CreateIncomeSourcePayload, IncomeSource, UpdateIncomeSourcePayload } from '../models/income.model';

@Injectable({ providedIn: 'root' })
export class IncomeApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE_URL}/income/sources`;
  getSources() { return this.http.get<ApiResponse<IncomeSource[]>>(this.url).pipe(map(unwrapApiResponse)); }
  createSource(payload: CreateIncomeSourcePayload) { return this.http.post<IncomeSource>(this.url, payload); }
  updateSource(id: string, payload: UpdateIncomeSourcePayload) { return this.http.patch<IncomeSource>(`${this.url}/${id}`, payload); }
  deleteSource(id: string) { return this.http.delete<void>(`${this.url}/${id}`); }
}

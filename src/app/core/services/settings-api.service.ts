import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse, unwrapApiResponse } from '../models/api.model';
import { SettingsApi, UpdateSettingsPayload } from '../models/settings.model';

@Injectable({ providedIn: 'root' })
export class SettingsApiService {
  private readonly http = inject(HttpClient);
  getSettings() { return this.http.get<ApiResponse<SettingsApi>>(`${API_BASE_URL}/settings`).pipe(map(unwrapApiResponse)); }
  updateSettings(payload: UpdateSettingsPayload) { return this.http.patch<SettingsApi>(`${API_BASE_URL}/settings`, payload); }
}

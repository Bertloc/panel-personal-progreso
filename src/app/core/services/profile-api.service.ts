import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse, unwrapApiResponse } from '../models/api.model';
import { UpdateProfilePayload, UserProfile } from '../models/profile.model';

@Injectable({ providedIn: 'root' })
export class ProfileApiService {
  private readonly http = inject(HttpClient);
  getMe() { return this.http.get<ApiResponse<UserProfile>>(`${API_BASE_URL}/profiles/me`).pipe(map(unwrapApiResponse)); }
  updateMe(payload: UpdateProfilePayload) { return this.http.patch<UserProfile>(`${API_BASE_URL}/profiles/me`, payload); }
}

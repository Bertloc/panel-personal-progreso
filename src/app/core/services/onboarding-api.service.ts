import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse, unwrapApiResponse } from '../models/api.model';
import { CompleteOnboardingPayload, OnboardingStatus } from '../models/onboarding.model';

@Injectable({ providedIn: 'root' })
export class OnboardingApiService {
  private readonly http = inject(HttpClient);
  getStatus() { return this.http.get<ApiResponse<OnboardingStatus>>(`${API_BASE_URL}/onboarding/status`).pipe(map(unwrapApiResponse)); }
  complete(payload: CompleteOnboardingPayload) { return this.http.post(`${API_BASE_URL}/onboarding/complete`, payload); }
}

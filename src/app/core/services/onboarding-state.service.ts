import { inject, Injectable, signal } from '@angular/core';
import { Observable, shareReplay, tap } from 'rxjs';
import { CompleteOnboardingPayload, OnboardingStatus } from '../models/onboarding.model';
import { OnboardingApiService } from './onboarding-api.service';

@Injectable({ providedIn: 'root' })
export class OnboardingStateService {
  private readonly api = inject(OnboardingApiService);
  private request?: Observable<OnboardingStatus>;
  readonly status = signal<OnboardingStatus | null>(null);

  load() {
    return this.request ??= this.api.getStatus().pipe(
      tap((status) => this.status.set(status)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
  }

  markCompleted(payload: CompleteOnboardingPayload) {
    this.status.set({
      completed: true,
      profile: { id: '', userId: '', ...payload.profile, onboardingCompleted: true },
      settings: payload.settings,
      incomeSources: [{ id: '', userId: '', ...payload.income, isActive: true }],
    });
  }
}

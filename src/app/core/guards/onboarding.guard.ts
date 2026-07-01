import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { OnboardingStateService } from '../services/onboarding-state.service';

export const onboardingGuard: CanActivateFn = () => {
  const router = inject(Router);
  const state = inject(OnboardingStateService);
  const current = state.status();
  if (current) return current.completed ? true : router.createUrlTree(['/onboarding']);

  return state.load().pipe(
    map(({ completed }) => completed ? true : router.createUrlTree(['/onboarding'])),
    catchError(() => of(router.createUrlTree(['/onboarding'], { queryParams: { apiUnavailable: 1 } }))),
  );
};

import { inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { OnboardingStateService } from '../services/onboarding-state.service';

export const onboardingGuard: CanActivateFn = () => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const state = inject(OnboardingStateService);
  const userId = auth.currentUser()?.id;
  if (!userId) return router.createUrlTree(['/login']);
  const current = state.current(userId);
  if (current) return current.completed ? true : router.createUrlTree(['/onboarding']);

  return state.load(userId).pipe(
    map(({ completed }) => completed ? true : router.createUrlTree(['/onboarding'])),
    catchError((error: unknown) => of(error instanceof HttpErrorResponse && error.status === 401 ? router.createUrlTree(['/login']) : router.createUrlTree(['/onboarding'], { queryParams: { apiUnavailable: 1 } }))),
  );
};

export const onboardingPageGuard: CanActivateFn = () => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const state = inject(OnboardingStateService);
  const userId = auth.currentUser()?.id;
  if (!userId) return router.createUrlTree(['/login']);
  const current = state.current(userId);
  if (current) return current.completed ? router.createUrlTree(['/']) : true;
  return state.load(userId).pipe(
    map(({ completed }) => completed ? router.createUrlTree(['/']) : true),
    catchError((error: unknown) => of(error instanceof HttpErrorResponse && error.status === 401 ? router.createUrlTree(['/login']) : true)),
  );
};

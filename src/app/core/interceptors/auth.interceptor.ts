import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (request.url !== API_BASE_URL && !request.url.startsWith(`${API_BASE_URL}/`)) return next(request);
  const auth = inject(AuthService);
  const router = inject(Router);
  return from(auth.getAccessToken()).pipe(
    switchMap((token) => next(token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request)),
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) void auth.logout().catch(() => undefined).then(() => router.navigateByUrl('/login'));
      return throwError(() => error);
    }),
  );
};

import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { OnboardingStateService } from '../../core/services/onboarding-state.service';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <main class="auth-page">
      <header><p class="page-eyebrow">Tu espacio personal</p><h1 class="page-title">Inicia sesión</h1><p class="page-copy">Continúa con tus finanzas, rutinas y proyectos.</p></header>
      <form class="surface-card" [formGroup]="form" (ngSubmit)="submit()">
        <label>Correo <input formControlName="email" type="email" autocomplete="email" /></label>
        <label>Contraseña <input formControlName="password" type="password" autocomplete="current-password" /></label>
        @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
        <button type="submit" [disabled]="form.invalid || loading()">{{ loading() ? 'Entrando…' : 'Iniciar sesión' }}</button>
        <p class="switch">¿No tienes cuenta? <a routerLink="/register">Regístrate</a></p>
      </form>
    </main>
  `,
  styleUrl: './auth-page.css',
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly onboarding = inject(OnboardingStateService);
  private readonly router = inject(Router);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly form = this.fb.nonNullable.group({ email: ['', [Validators.required, Validators.email]], password: ['', Validators.required] });

  protected async submit(): Promise<void> {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true); this.error.set('');
    try {
      const { data, error } = await this.auth.login(this.form.controls.email.value.trim(), this.form.controls.password.value);
      if (error || !data.user) { this.error.set('Correo o contraseña incorrectos.'); return; }
      this.onboarding.reset(data.user.id);
      try {
        const status = await firstValueFrom(this.onboarding.load(data.user.id));
        await this.router.navigateByUrl(status.completed ? '/' : '/onboarding');
      } catch { this.error.set('No pudimos consultar tu configuración. Intenta de nuevo.'); }
    } catch { this.error.set('Correo o contraseña incorrectos.'); }
    finally { this.loading.set(false); }
  }
}

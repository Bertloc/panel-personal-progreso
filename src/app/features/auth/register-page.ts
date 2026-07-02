import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { OnboardingStateService } from '../../core/services/onboarding-state.service';

@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <main class="auth-page">
      <header><p class="page-eyebrow">Cuenta nueva</p><h1 class="page-title">Crea tu cuenta</h1><p class="page-copy">Tus datos quedarán separados de los de otros usuarios.</p></header>
      <form class="surface-card" [formGroup]="form" (ngSubmit)="submit()">
        <label>Nombre para mostrar (opcional) <input formControlName="displayName" autocomplete="name" maxlength="80" /></label>
        <label>Correo <input formControlName="email" type="email" autocomplete="email" /></label>
        <label>Contraseña <input formControlName="password" type="password" autocomplete="new-password" minlength="6" /></label>
        <label>Confirmar contraseña <input formControlName="confirmPassword" type="password" autocomplete="new-password" minlength="6" /></label>
        @if (form.controls.confirmPassword.touched && !passwordsMatch()) { <p class="error">Las contraseñas no coinciden.</p> }
        @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
        @if (success()) { <p class="success" role="status">{{ success() }}</p> }
        <button type="submit" [disabled]="form.invalid || !passwordsMatch() || loading()">{{ loading() ? 'Creando…' : 'Crear cuenta' }}</button>
        <p class="switch">¿Ya tienes cuenta? <a routerLink="/login">Inicia sesión</a></p>
      </form>
    </main>
  `,
  styleUrl: './auth-page.css',
})
export class RegisterPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly onboarding = inject(OnboardingStateService);
  private readonly router = inject(Router);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly success = signal('');
  protected readonly form = this.fb.nonNullable.group({
    displayName: ['', Validators.maxLength(80)], email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]], confirmPassword: ['', Validators.required],
  });

  protected passwordsMatch(): boolean { return this.form.controls.password.value === this.form.controls.confirmPassword.value; }

  protected async submit(): Promise<void> {
    if (this.form.invalid || !this.passwordsMatch() || this.loading()) return;
    this.loading.set(true); this.error.set(''); this.success.set('');
    try {
      const value = this.form.getRawValue();
      const { data, error } = await this.auth.register(value.email.trim(), value.password, value.displayName.trim() || undefined);
      if (error) throw error;
      if (data.session && data.user) {
        this.onboarding.reset(data.user.id);
        await this.router.navigateByUrl('/onboarding');
      } else {
        this.success.set('Revisa tu correo para confirmar tu cuenta.');
      }
    } catch { this.error.set('No se pudo crear la cuenta.'); }
    finally { this.loading.set(false); }
  }
}

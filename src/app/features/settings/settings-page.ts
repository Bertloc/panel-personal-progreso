import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';
import { BudgetMode } from '../../core/models/settings.model';
import { ProfileApiService } from '../../core/services/profile-api.service';
import { SettingsApiService } from '../../core/services/settings-api.service';
import { AuthService } from '../../core/services/auth.service';
import { OnboardingStateService } from '../../core/services/onboarding-state.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-settings-page',
  imports: [ReactiveFormsModule],
  template: `
    <div class="page-stack">
      <header class="page-header">
        <p class="page-eyebrow">Tu cuenta</p><h1 class="page-title">Ajustes</h1>
        <p class="page-copy">Actualiza tu perfil y estilo de presupuesto.</p>
      </header>

      <form class="surface-card" [formGroup]="form" (ngSubmit)="save()">
        <label>Nombre para mostrar <input formControlName="displayName" autocomplete="name" /></label>
        <label>Moneda <input formControlName="currency" maxlength="3" /></label>
        <label>Zona horaria <input formControlName="timezone" /></label>
        <label>Estilo de presupuesto
          <select formControlName="budgetMode">
            @for (option of budgetOptions; track option.value) { <option [value]="option.value">{{ option.label }}</option> }
          </select>
        </label>
        @if (message()) { <p [class.error]="hasError()" role="status">{{ message() }}</p> }
        <button type="submit" [disabled]="form.invalid || loading()">{{ loading() ? 'Guardando…' : 'Guardar cambios' }}</button>
      </form>

      <section class="surface-card logout-card"><div><h2 class="section-card-title">Sesión</h2><p>Cierra tu sesión en este dispositivo.</p></div><button class="logout" type="button" [disabled]="loggingOut()" (click)="logout()">{{ loggingOut() ? 'Saliendo…' : 'Cerrar sesión' }}</button></section>
    </div>
  `,
  styles: `
    form, label, .logout-card { display: grid; gap: 14px; }
    label { gap: 8px; color: var(--color-text-secondary); font-weight: 650; }
    input, select { min-height: 48px; padding: 12px 14px; border: 1px solid var(--color-border); border-radius: 14px; background: #0c0f15; color: var(--color-text); font: inherit; }
    button { min-height: 48px; border: 0; border-radius: 14px; background: var(--color-green); color: #04120a; font-weight: 800; }
    button:disabled { opacity: .45; }
    p { margin: 0; color: var(--color-green); } p.error { color: var(--color-red); }
    .logout-card p { margin-top: 6px; color: var(--color-text-secondary); }
    button.logout { background: rgb(255 77 109 / .14); color: var(--color-red); }
  `,
})
export class SettingsPage {
  private readonly fb = inject(FormBuilder);
  private readonly profiles = inject(ProfileApiService);
  private readonly settings = inject(SettingsApiService);
  private readonly auth = inject(AuthService);
  private readonly onboarding = inject(OnboardingStateService);
  private readonly router = inject(Router);
  protected readonly loading = signal(true);
  protected readonly message = signal('');
  protected readonly hasError = signal(false);
  protected readonly loggingOut = signal(false);
  protected readonly budgetOptions: { value: BudgetMode; label: string }[] = [
    { value: 'adjusted', label: 'Ajustado' }, { value: 'flexible', label: 'Flexible' },
    { value: 'debt_aggressive', label: 'Pagar deuda' }, { value: 'saving_aggressive', label: 'Ahorrar' },
  ];
  protected readonly form = this.fb.nonNullable.group({
    displayName: ['', Validators.required], currency: ['MXN', Validators.required], timezone: [''],
    budgetMode: this.fb.nonNullable.control<BudgetMode>('adjusted', Validators.required),
  });

  constructor() {
    forkJoin({ profile: this.profiles.getMe(), settings: this.settings.getSettings() })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ profile, settings }) => this.form.patchValue({ displayName: profile.displayName, currency: profile.currency, timezone: profile.timezone ?? '', budgetMode: settings.budgetMode ?? 'adjusted' }),
        error: () => this.showMessage('No pudimos cargar tus ajustes.', true),
      });
  }

  protected save() {
    if (this.form.invalid || this.loading()) return;
    const value = this.form.getRawValue(); this.loading.set(true); this.message.set('');
    forkJoin([
      this.profiles.updateMe({ displayName: value.displayName.trim(), currency: value.currency.toUpperCase(), timezone: value.timezone || null }),
      this.settings.updateSettings({ budgetMode: value.budgetMode }),
    ]).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: () => this.showMessage('Cambios guardados.'),
      error: () => this.showMessage('No se pudieron guardar los cambios. Intenta de nuevo.', true),
    });
  }

  protected async logout() {
    if (this.loggingOut()) return;
    this.loggingOut.set(true);
    try { await this.auth.logout(); } catch {}
    finally { this.onboarding.reset(); await this.router.navigateByUrl('/login'); this.loggingOut.set(false); }
  }

  private showMessage(message: string, error = false) { this.message.set(message); this.hasError.set(error); }
}

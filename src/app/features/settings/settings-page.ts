import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';
import { BudgetMode } from '../../core/models/settings.model';
import { ProfileApiService } from '../../core/services/profile-api.service';
import { SettingsApiService } from '../../core/services/settings-api.service';
import { AuthService } from '../../core/services/auth.service';
import { OnboardingStateService } from '../../core/services/onboarding-state.service';
import { Router, RouterLink } from '@angular/router';
import { ActionModal } from '../../shared/components/action-modal/action-modal';

@Component({
  selector: 'app-settings-page',
  imports: [ReactiveFormsModule, RouterLink, ActionModal],
  template: `
    <div class="page-stack">
      <a class="back" routerLink="/">← Volver</a>
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

      <section class="surface-card logout-card">
        <div><h2 class="section-card-title">Cuenta</h2><p>Cierra tu sesión en este dispositivo.</p></div>
        <button class="logout" type="button" (click)="requestLogout()">Cerrar sesión</button>
      </section>

      @if (confirmingLogout()) {
        <app-action-modal title="¿Quieres cerrar sesión?" (close)="cancelLogout()">
          <p class="confirmation-copy">Tendrás que volver a iniciar sesión para acceder a tu información.</p>
          @if (logoutError()) { <p class="logout-error" role="alert">{{ logoutError() }}</p> }
          <div class="confirmation-actions">
            <button class="secondary" type="button" [disabled]="loggingOut()" (click)="cancelLogout()">Cancelar</button>
            <button class="logout" type="button" [disabled]="loggingOut()" (click)="confirmLogout()">{{ loggingOut() ? 'Cerrando sesión…' : 'Cerrar sesión' }}</button>
          </div>
        </app-action-modal>
      }
    </div>
  `,
  styles: `
    .back { display: inline-flex; align-items: center; width: fit-content; min-height: 44px; padding-inline: 4px; color: #b8beff; text-decoration: none; font-weight: 700; }
    .page-header { padding: 2px 2px 8px; }
    .page-copy { margin-top: 12px; }
    form, label, .logout-card { display: grid; gap: 14px; }
    form { gap: 18px; padding: 22px; }
    label { gap: 8px; color: var(--color-text-secondary); font-weight: 650; }
    input, select { width: 100%; min-width: 0; min-height: 48px; padding: 12px 14px; border: 1px solid var(--color-border); border-radius: 14px; background: #0c0f15; color: var(--color-text); font: inherit; }
    button { min-height: 48px; border: 0; border-radius: 14px; background: var(--color-green); color: #04120a; font-weight: 800; }
    button:disabled { opacity: .45; }
    p { margin: 0; color: var(--color-green); } p.error { color: var(--color-red); }
    .logout-card { gap: 18px; margin-top: 4px; padding: 22px; border-color: rgb(255 77 109 / .24); background: linear-gradient(180deg, rgb(255 77 109 / .06), var(--color-card)); }
    .logout-card p { margin-top: 8px; color: var(--color-text-secondary); }
    button.logout { background: rgb(255 77 109 / .14); color: var(--color-red); }
    .confirmation-copy { color: var(--color-text-secondary); line-height: 1.5; }
    .logout-error { margin-top: 14px; color: var(--color-red); }
    .confirmation-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 20px; }
    button.secondary { border: 1px solid var(--color-border); background: var(--color-card-secondary); color: var(--color-text); }
    @media (max-width: 360px) { .confirmation-actions { grid-template-columns: 1fr; } }
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
  protected readonly confirmingLogout = signal(false);
  protected readonly logoutError = signal('');
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

  protected requestLogout() {
    this.logoutError.set('');
    this.confirmingLogout.set(true);
  }

  protected cancelLogout() {
    if (!this.loggingOut()) this.confirmingLogout.set(false);
  }

  protected async confirmLogout() {
    if (this.loggingOut()) return;
    this.loggingOut.set(true);
    this.logoutError.set('');
    try {
      await this.auth.logout();
      this.onboarding.reset();
      await this.router.navigateByUrl('/login');
    } catch {
      this.logoutError.set('No se pudo cerrar la sesión. Intenta de nuevo.');
    } finally {
      this.loggingOut.set(false);
    }
  }

  private showMessage(message: string, error = false) { this.message.set(message); this.hasError.set(error); }
}
